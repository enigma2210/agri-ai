"""
Krishi Setu Backend - FastAPI Gateway
Production-grade multimodal WebSocket proxy for AI Agent
"""
from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
import logging
import json
import os
import uuid
import asyncio
import base64
from services.language import SUPPORTED_LANGUAGES, validate_language
from services.agent_ws import AgentWebSocketClient
from services.language_engine import detect_language, determine_output_language
from services.multimodal_controller import MultimodalController
from services.connection_manager import manager as ws_manager
from services.speech import speech_to_text, text_to_speech, get_audio_file_path, cleanup_old_audio
from models.chat import ChatRequest, ChatResponse
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting Krishi Setu Backend...")
    logger.info(f"PORT={settings.PORT}, AGENT_WS_URL={settings.AGENT_WS_URL[:40]}...")
    yield
    logger.info("Shutting down Krishi Setu Backend...")
    cleanup_old_audio()


app = FastAPI(
    title="Krishi Setu Backend",
    description="Production AI Agent Gateway for Indian Farmers",
    version="2.0.0",
    lifespan=lifespan
)


def _sanitize_response(text: str) -> str:
    """Remove common artifacts from agent responses"""
    if not text or not isinstance(text, str):
        return ""
    result = text.strip()
    # Remove trailing 'undefined' tokens (JS agent artifact)
    while result.endswith("undefined"):
        result = result[:-len("undefined")].strip()
    # Remove leading 'undefined' tokens
    while result.startswith("undefined"):
        result = result[len("undefined"):].strip()
    # Collapse multiple spaces
    import re as _re
    result = _re.sub(r'  +', ' ', result)
    return result.strip()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://krishisetu-ai.vercel.app",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler — prevent crashes in production ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error"}
    )


@app.get("/")
async def root():
    """Health check endpoint — used by Render to verify service is alive"""
    return {
        "service": "Krishi Setu Backend",
        "status": "healthy",
        "version": "2.0.0"
    }


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "agent_endpoint": settings.AGENT_WS_URL,
        "supported_languages": list(SUPPORTED_LANGUAGES.keys())
    }


@app.get("/api/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    return {
        "languages": [
            {"code": code, "name": name}
            for code, name in SUPPORTED_LANGUAGES.items()
        ]
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Enhanced chat endpoint with language detection
    
    TEXT INPUT RULES:
    - Detects language from text
    - Normalizes Hinglish → Hindi
    - Responds in detected language
    - NO audio generation
    
    Args:
        request: ChatRequest with message, language (ui_language), location
        
    Returns:
        ChatResponse with agent's answer
    """
    try:
        # Initialize multimodal controller
        controller = MultimodalController()
        
        # Detect language from input text
        detected_lang = detect_language(request.message)
        logger.info(f"Detected language: {detected_lang} from text: {request.message[:50]}")
        
        # Determine output language (for text input, use detected language)
        _, output_lang = determine_output_language(
            input_text=request.message,
            ui_language=request.language,
            modality='text'
        )
        
        logger.info(
            f"Chat request - UI Lang: {request.language}, "
            f"Detected: {detected_lang}, Output: {output_lang}, "
            f"Message length: {len(request.message)}"
        )
        
        # Create location dict if provided
        location_dict = None
        if request.location:
            location_dict = {
                "latitude": request.location.latitude,
                "longitude": request.location.longitude
            }
        
        # Create agent payload using multimodal controller
        agent_payload = controller.create_agent_payload(
            message=request.message,
            output_language=output_lang,
            location=location_dict,
            modality='text'
        )
        
        # Connect to WebSocket agent and get response
        async with AgentWebSocketClient(settings.AGENT_WS_URL) as ws_client:
            # Send the payload message
            await ws_client.ws.send(json.dumps(agent_payload))
            
            # Collect streaming response
            response_chunks = []
            complete_response = None
            
            async for message in ws_client.ws:
                data = json.loads(message)
                msg_type = data.get("type")
                
                if msg_type == "stream_chunk":
                    # Try multiple possible field names for chunk content
                    chunk_content = (
                        data.get("content") or 
                        data.get("text") or 
                        data.get("chunk") or 
                        ""
                    )
                    if isinstance(chunk_content, str) and chunk_content:
                        response_chunks.append(chunk_content)
                
                elif msg_type == "stream_end":
                    # Try multiple possible field names for complete response
                    complete_response = (
                        data.get("complete_response") or
                        data.get("response") or
                        data.get("content") or
                        data.get("text") or
                        None
                    )
                    break
                
                elif msg_type == "error":
                    error_msg = data.get("message", "Unknown error")
                    raise RuntimeError(f"Agent error: {error_msg}")
            
            # Always prefer complete_response over chunk concatenation
            if complete_response and isinstance(complete_response, str):
                response_text = complete_response
            else:
                response_text = "".join(filter(None, response_chunks))
            
            # Sanitize: remove trailing/leading 'undefined' artifacts
            response_text = _sanitize_response(response_text)
        
        logger.info(f"Response received - Length: {len(response_text)}")
        
        return ChatResponse(
            response=response_text,
            language=output_lang,
            detected_language=detected_lang,
            success=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/api/speech-to-text")
async def speech_to_text_deprecated():
    """Deprecated - Voice handled via WebSocket"""
    return {
        "status": "deprecated",
        "message": "Use /api/voice WebSocket endpoint for voice interaction"
    }


@app.post("/api/text-to-speech")
async def text_to_speech_deprecated():
    """Deprecated - Voice handled via WebSocket"""
    return {
        "status": "deprecated",
        "message": "Use /api/voice WebSocket endpoint for voice interaction"
    }


@app.get("/api/audio/{filename}")
async def serve_audio(filename: str):
    """Serve generated TTS audio files"""
    audio_path = get_audio_file_path(filename)
    if not audio_path:
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(
        path=str(audio_path),
        media_type="audio/mpeg",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@app.websocket("/api/voice")
async def voice_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for voice interaction.

    Pipeline:
      1. Client sends audio_stream (base64 webm, is_first=true, is_final=true)
      2. Backend transcribes audio to text  (STT)
      3. Backend sends transcript back to client
      4. Backend sends text query to agent via WS
      5. Backend streams agent text response back to client
      6. Backend synthesizes audio from response text (TTS)
      7. Backend sends audio_url to client
    """
    connection_id = str(uuid.uuid4())
    tag = connection_id[:8]
    await ws_manager.connect(websocket, connection_id)

    ui_language = "en"

    try:
        logger.info(f"[VOICE:{tag}] Voice WebSocket connected")

        async for message in websocket.iter_text():
            try:
                data = json.loads(message)
                msg_type = data.get("type")
                logger.info(f"[VOICE:{tag}] Client message: type={msg_type}")

                if msg_type == "audio_stream":
                    audio_data = data.get("audio_data", "")
                    audio_format = data.get("format", "webm")
                    is_first = data.get("is_first", False)
                    is_final = data.get("is_final", False)

                    audio_size = len(audio_data) if audio_data else 0
                    logger.info(
                        f"[VOICE:{tag}] Audio: format={audio_format}, "
                        f"size={audio_size} b64chars, is_first={is_first}, is_final={is_final}"
                    )

                    if audio_size == 0:
                        logger.warning(f"[VOICE:{tag}] Empty audio_data!")
                        await ws_manager.send_message(connection_id, {
                            "type": "error",
                            "message": "Empty audio data received",
                        })
                        continue

                    # Grab UI language from (first) packet
                    if is_first:
                        ui_language = data.get("ui_language", "en")
                        logger.info(f"[VOICE:{tag}] UI language: {ui_language}")

                    # Only process when we have the final (complete) audio
                    if not is_final:
                        logger.info(f"[VOICE:{tag}] Non-final chunk, waiting for final")
                        continue

                    # ── Step 1: Speech-to-Text ──────────────────────────
                    logger.info(f"[VOICE:{tag}] STT_BEGIN")

                    # Log audio format (mp3, webm, etc. are all supported)
                    if audio_format != "mp3":
                        logger.info(
                            f"[VOICE:{tag}] Audio format: '{audio_format}' (non-mp3, will convert via pydub)"
                        )

                    # Decode base64 → raw bytes
                    try:
                        audio_bytes = base64.b64decode(audio_data)
                        logger.info(
                            f"[VOICE:{tag}] Audio decoded: "
                            f"b64_len={len(audio_data)}, bytes_len={len(audio_bytes)}"
                        )
                    except Exception as decode_err:
                        logger.error(f"[VOICE:{tag}] Base64 decode failed: {decode_err}")
                        await ws_manager.send_message(connection_id, {
                            "type": "error",
                            "message": "Invalid audio data encoding",
                        })
                        continue

                    # Run STT (never crashes the WebSocket)
                    try:
                        transcript, _stt_lang = await speech_to_text(
                            audio_bytes=audio_bytes,
                            audio_format=audio_format,
                            language=ui_language,
                        )
                        logger.info(f"[VOICE:{tag}] STT_SUCCESS: lang={_stt_lang}")
                    except Exception as stt_err:
                        logger.error(f"[VOICE:{tag}] STT failed: {stt_err}", exc_info=True)
                        await ws_manager.send_message(connection_id, {
                            "type": "error",
                            "message": str(stt_err),
                        })
                        continue

                    logger.info(f"[VOICE:{tag}] Transcript: '{transcript[:120]}'")

                    # Send transcript to client
                    await ws_manager.send_message(connection_id, {
                        "type": "transcript",
                        "content": transcript,
                        "language": ui_language,
                    })

                    # ── Step 2: Query the Agent ─────────────────────────
                    logger.info(f"[VOICE:{tag}] ── Agent query start ──")
                    controller = MultimodalController()
                    location_raw = data.get("location")
                    location_dict = None
                    if location_raw and isinstance(location_raw, dict):
                        location_dict = {
                            "latitude": location_raw.get("latitude"),
                            "longitude": location_raw.get("longitude"),
                        }

                    agent_payload = controller.create_agent_payload(
                        message=transcript,
                        output_language=ui_language,
                        location=location_dict,
                        modality="voice",
                    )
                    logger.info(f"[VOICE:{tag}] Agent payload keys: {list(agent_payload.keys())}")

                    response_chunks = []
                    complete_response = None

                    try:
                        async with AgentWebSocketClient(settings.AGENT_WS_URL) as agent_ws:
                            await agent_ws.ws.send(json.dumps(agent_payload))
                            logger.info(f"[VOICE:{tag}] Agent query sent, listening...")

                            async def _collect_agent_response():
                                nonlocal complete_response, response_chunks
                                msg_num = 0
                                async for agent_msg in agent_ws.ws:
                                    msg_num += 1
                                    agent_data = json.loads(agent_msg)
                                    a_type = agent_data.get("type")
                                    logger.info(
                                        f"[VOICE:{tag}] Agent #{msg_num}: type={a_type}, "
                                        f"keys={list(agent_data.keys())}"
                                    )

                                    if a_type in ("session_created", "system", "pong"):
                                        continue

                                    elif a_type == "stream_chunk":
                                        chunk = (
                                            agent_data.get("content")
                                            or agent_data.get("text")
                                            or agent_data.get("chunk")
                                            or ""
                                        )
                                        if chunk and isinstance(chunk, str):
                                            response_chunks.append(chunk)
                                            await ws_manager.send_message(connection_id, {
                                                "type": "stream_chunk",
                                                "content": chunk,
                                            })

                                    elif a_type == "stream_end":
                                        complete_response = (
                                            agent_data.get("complete_response")
                                            or agent_data.get("response")
                                            or agent_data.get("content")
                                            or agent_data.get("text")
                                            or None
                                        )
                                        logger.info(f"[VOICE:{tag}] stream_end len={len(complete_response or '')}")
                                        break

                                    elif a_type == "error":
                                        err = agent_data.get("message", "Unknown agent error")
                                        logger.error(f"[VOICE:{tag}] Agent error: {err}")
                                        await ws_manager.send_message(connection_id, {
                                            "type": "error",
                                            "message": err,
                                        })
                                        break

                                    else:
                                        logger.warning(f"[VOICE:{tag}] Unknown agent type '{a_type}'")

                            await asyncio.wait_for(_collect_agent_response(), timeout=60)

                    except asyncio.TimeoutError:
                        logger.error(f"[VOICE:{tag}] Agent timeout (60s)")
                        await ws_manager.send_message(connection_id, {
                            "type": "error",
                            "message": "Agent did not respond in time.",
                        })
                        continue
                    except Exception as agent_err:
                        logger.error(f"[VOICE:{tag}] Agent error: {agent_err}", exc_info=True)
                        await ws_manager.send_message(connection_id, {
                            "type": "error",
                            "message": f"Agent error: {agent_err}",
                        })
                        continue

                    # Build final response text
                    if complete_response and isinstance(complete_response, str):
                        response_text = complete_response
                    else:
                        response_text = "".join(filter(None, response_chunks))
                    response_text = _sanitize_response(response_text)

                    logger.info(f"[VOICE:{tag}] Response ({len(response_text)} chars): '{response_text[:120]}'")

                    # Send stream_end to client
                    await ws_manager.send_message(connection_id, {
                        "type": "stream_end",
                        "content": response_text,
                        "language": ui_language,
                    })

                    # ── Step 3: Text-to-Speech ──────────────────────────
                    if response_text:
                        logger.info(f"[VOICE:{tag}] ── TTS start ──")
                        # Use PUBLIC_URL env var in production, fall back to localhost
                        base_url = os.environ.get(
                            "PUBLIC_URL",
                            f"http://localhost:{settings.PORT}"
                        ).rstrip("/")
                        audio_url = await text_to_speech(
                            text=response_text,
                            language=ui_language,
                            base_url=base_url,
                        )
                        if audio_url:
                            logger.info(f"[VOICE:{tag}] TTS audio: {audio_url}")
                            await ws_manager.send_message(connection_id, {
                                "type": "audio_url",
                                "url": audio_url,
                                "language": ui_language,
                            })
                        else:
                            logger.warning(f"[VOICE:{tag}] TTS returned no audio")

                    logger.info(f"[VOICE:{tag}] ── Voice interaction complete ──")

                elif msg_type == "ping":
                    await ws_manager.send_message(connection_id, {"type": "pong"})

                else:
                    logger.warning(f"[VOICE:{tag}] Unknown client msg type: {msg_type}")

            except json.JSONDecodeError as e:
                logger.error(f"[VOICE:{tag}] Invalid JSON: {e}")
                await ws_manager.send_message(connection_id, {
                    "type": "error",
                    "message": "Invalid JSON format",
                })
            except Exception as e:
                logger.error(f"[VOICE:{tag}] Error: {e}", exc_info=True)
                await ws_manager.send_message(connection_id, {
                    "type": "error",
                    "message": str(e),
                })

    except WebSocketDisconnect:
        logger.info(f"[VOICE:{tag}] Client disconnected")
    except Exception as e:
        logger.error(f"[VOICE:{tag}] Fatal error: {e}", exc_info=True)
    finally:
        ws_manager.disconnect(connection_id)
        logger.info(f"[VOICE:{tag}] Cleanup complete")


# ── Production entrypoint ──────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        log_level="info",
    )


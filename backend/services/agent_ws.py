"""
WebSocket client service for AI Agent communication
Handles connection lifecycle, streaming, and error recovery
"""
import asyncio
import json
import logging
from typing import Optional, Dict, Any
import websockets
from websockets.exceptions import WebSocketException

logger = logging.getLogger(__name__)


class AgentWebSocketClient:
    """
    Async WebSocket client for communicating with AI Agent
    Manages connection lifecycle and streaming responses
    """
    
    def __init__(self, ws_url: str, timeout: int = 30, max_retries: int = 3):
        """
        Initialize WebSocket client
        
        Args:
            ws_url: WebSocket endpoint URL
            timeout: Connection timeout in seconds
            max_retries: Maximum connection retry attempts
        """
        self.ws_url = ws_url
        self.timeout = timeout
        self.max_retries = max_retries
        self.ws = None
        
    async def __aenter__(self):
        """Async context manager entry - establish connection"""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - close connection"""
        await self.disconnect()
    
    async def connect(self):
        """Establish WebSocket connection with retry logic"""
        for attempt in range(self.max_retries):
            try:
                logger.info(f"Connecting to agent WebSocket (attempt {attempt + 1}/{self.max_retries})...")
                self.ws = await asyncio.wait_for(
                    websockets.connect(self.ws_url),
                    timeout=self.timeout
                )
                logger.info("WebSocket connection established")
                return
            except asyncio.TimeoutError:
                logger.warning(f"Connection timeout (attempt {attempt + 1})")
                if attempt == self.max_retries - 1:
                    raise
                await asyncio.sleep(1 * (attempt + 1))  # Exponential backoff
            except WebSocketException as e:
                logger.error(f"WebSocket connection error: {e}")
                if attempt == self.max_retries - 1:
                    raise
                await asyncio.sleep(1 * (attempt + 1))
    
    async def disconnect(self):
        """Close WebSocket connection gracefully"""
        if self.ws:
            try:
                await self.ws.close()
                logger.info("WebSocket connection closed")
            except Exception as e:
                logger.error(f"Error closing WebSocket: {e}")
    
    async def send_query(
        self,
        message: str,
        language: str,
        location: Optional[Dict[str, float]] = None
    ) -> str:
        """
        Send query to AI agent and receive streaming response
        
        Args:
            message: User's query message
            language: Language code (e.g., 'en', 'hi')
            location: Optional location dict with 'latitude' and 'longitude'
            
        Returns:
            Complete response text from agent
        """
        if not self.ws:
            raise RuntimeError("WebSocket not connected")
        
        # Prepare query payload
        query_payload = {
            "type": "query",
            "message": message,
            "stream": True,
            "context": {
                "language": language
            }
        }
        
        # Add location if provided
        if location:
            query_payload["context"]["location"] = {
                "latitude": location.get("latitude"),
                "longitude": location.get("longitude")
            }
        
        try:
            # Send query
            logger.info(f"Sending query to agent - Language: {language}")
            await self.ws.send(json.dumps(query_payload))
            
            # Receive streaming response
            response_chunks = []
            complete_response = None
            
            async for message in self.ws:
                data = json.loads(message)
                msg_type = data.get("type")
                
                if msg_type == "stream_chunk":
                    # Accumulate streaming chunks — try multiple field names
                    chunk_content = (
                        data.get("content") or 
                        data.get("text") or 
                        data.get("chunk") or 
                        ""
                    )
                    if isinstance(chunk_content, str) and chunk_content:
                        response_chunks.append(chunk_content)
                    logger.debug(f"Received chunk: {len(chunk_content)} chars")
                
                elif msg_type == "stream_end":
                    # Final response — try multiple field names
                    complete_response = (
                        data.get("complete_response") or
                        data.get("response") or
                        data.get("content") or
                        data.get("text") or
                        None
                    )
                    logger.info(f"Stream ended - Total response: {len(complete_response or '')} chars")
                    break
                
                elif msg_type == "error":
                    error_msg = data.get("message", "Unknown error")
                    logger.error(f"Agent error: {error_msg}")
                    raise RuntimeError(f"Agent error: {error_msg}")
            
            # Prefer complete response over chunk concatenation
            if complete_response and isinstance(complete_response, str):
                return complete_response
            return "".join(filter(None, response_chunks))
            
        except WebSocketException as e:
            logger.error(f"WebSocket error during query: {e}")
            raise RuntimeError(f"WebSocket communication error: {e}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            raise RuntimeError(f"Invalid response format: {e}")
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            raise

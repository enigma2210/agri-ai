"""
Speech Service — STT (Speech-to-Text) and TTS (Text-to-Speech)

STT: Decodes base64 audio → WAV → transcribes using SpeechRecognition (Google free API)
TTS: Synthesizes text → MP3 using gTTS, saves to /tmp/audio, serves via /api/audio/<id>
"""
import asyncio
import io
import logging
import os
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# ── Configure pydub to find ffmpeg ──────────────────────────────────
# Prefer system ffmpeg; fall back to the binary bundled by imageio-ffmpeg.
_system_ffmpeg = shutil.which("ffmpeg")
if _system_ffmpeg:
    logger.info(f"[Speech] Using system ffmpeg: {_system_ffmpeg}")
else:
    try:
        import imageio_ffmpeg
        _bundled = imageio_ffmpeg.get_ffmpeg_exe()
        os.environ["PATH"] = str(Path(_bundled).parent) + os.pathsep + os.environ.get("PATH", "")
        logger.info(f"[Speech] Using imageio-ffmpeg: {_bundled}")
    except ImportError:
        logger.warning("[Speech] ffmpeg not found — audio conversion may fail")

# Directory for temporary audio files (TTS output)
AUDIO_DIR = Path(tempfile.gettempdir()) / "kissan_audio"
AUDIO_DIR.mkdir(exist_ok=True)

# Language code mapping for speech recognition
# Google Speech API uses BCP-47 locale tags
STT_LANGUAGE_MAP = {
    "en": "en-IN",
    "hi": "hi-IN",
    "bn": "bn-IN",
    "te": "te-IN",
    "ta": "ta-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
    "pa": "pa-IN",
}

# gTTS language codes (kept as fallback reference)
TTS_LANGUAGE_MAP = {
    "en": "en",
    "hi": "hi",
    "bn": "bn",
    "te": "te",
    "ta": "ta",
    "mr": "mr",
    "gu": "gu",
    "kn": "kn",
    "ml": "ml",
    "pa": "pa",
}

# ── Edge-TTS voice mapping (Microsoft Neural voices — much faster than gTTS) ──
EDGE_TTS_VOICE_MAP = {
    "en": "en-IN-NeerjaNeural",
    "hi": "hi-IN-SwaraNeural",
    "bn": "bn-IN-TanishaaNeural",
    "te": "te-IN-ShrutiNeural",
    "ta": "ta-IN-PallaviNeural",
    "mr": "mr-IN-AarohiNeural",
    "gu": "gu-IN-DhwaniNeural",
    "kn": "kn-IN-SapnaNeural",
    "ml": "ml-IN-SobhanaNeural",
    "pa": "pa-IN-SalmanNeural",
}


async def speech_to_text(
    audio_bytes: bytes,
    audio_format: str = "mp3",
    language: str = "en",
) -> Tuple[str, str]:
    """
    Transcribe raw audio bytes to text.

    Args:
        audio_bytes: Raw audio bytes (caller must base64-decode beforehand)
        audio_format: Audio format (mp3 preferred; wav/webm also accepted)
        language: Expected language code (en, hi, etc.)

    Returns:
        Tuple of (transcribed_text, detected_language)

    Raises:
        RuntimeError on transcription failure
    """
    import speech_recognition as sr

    logger.info(
        f"[STT] STT_BEGIN: format={audio_format}, language={language}, "
        f"audio_bytes_len={len(audio_bytes)}"
    )

    # ── Validation ──
    if not isinstance(audio_bytes, (bytes, bytearray)):
        raise RuntimeError(f"Expected bytes, got {type(audio_bytes).__name__}")

    if len(audio_bytes) < 100:
        raise RuntimeError("Audio data too small — possibly empty recording")

    if audio_format != "mp3":
        logger.warning(f"[STT] Non-MP3 format received: '{audio_format}'")

    # Convert to WAV using pydub (handles mp3, webm, ogg, etc.)
    wav_bytes = await _convert_to_wav(audio_bytes, audio_format)
    logger.info(f"[STT] Converted to WAV: {len(wav_bytes)} bytes")

    # Transcribe using SpeechRecognition
    recognizer = sr.Recognizer()
    recognizer.energy_threshold = 300
    recognizer.dynamic_energy_threshold = True

    stt_lang = STT_LANGUAGE_MAP.get(language, "en-IN")

    try:
        audio_file = io.BytesIO(wav_bytes)
        with sr.AudioFile(audio_file) as source:
            audio_data = recognizer.record(source)

        logger.info(f"[STT] Sending to Google Speech Recognition (lang={stt_lang})...")

        # Run blocking recognition in a thread pool
        loop = asyncio.get_event_loop()
        transcript = await loop.run_in_executor(
            None,
            lambda: recognizer.recognize_google(audio_data, language=stt_lang),
        )

        logger.info(f"[STT] STT_SUCCESS: '{transcript[:100]}' (lang={stt_lang})")
        return transcript, language

    except sr.UnknownValueError:
        logger.warning("[STT] Speech not understood — no words recognized")
        raise RuntimeError("Could not understand the audio. Please speak clearly and try again.")
    except sr.RequestError as e:
        logger.error(f"[STT] Google Speech API error: {e}")
        raise RuntimeError(f"Speech recognition service error: {e}")
    except Exception as e:
        logger.error(f"[STT] Unexpected STT error: {e}", exc_info=True)
        raise RuntimeError(f"Transcription failed: {e}")


async def text_to_speech(
    text: str,
    language: str = "en",
    base_url: str = "http://localhost:8000",
) -> Optional[str]:
    """
    Convert text to speech audio and return a URL to the audio file.

    Uses edge-tts (Microsoft Edge Neural TTS) — async, fast, high quality.
    Falls back to gTTS if edge-tts is unavailable.

    Args:
        text: Text to synthesize
        language: Language code
        base_url: Base URL for constructing the audio serving URL

    Returns:
        URL string to the generated audio file, or None on failure
    """
    if not text or not text.strip():
        logger.warning("[TTS] Empty text, skipping synthesis")
        return None

    audio_id = str(uuid.uuid4())
    audio_path = AUDIO_DIR / f"{audio_id}.mp3"

    # ── Try edge-tts first (3-5x faster than gTTS) ──
    try:
        import edge_tts

        voice = EDGE_TTS_VOICE_MAP.get(language, "en-IN-NeerjaNeural")
        logger.info(f"[TTS] edge-tts: voice={voice}, text_len={len(text)}, id={audio_id}")

        import time
        t0 = time.monotonic()

        communicate = edge_tts.Communicate(text=text, voice=voice)
        await communicate.save(str(audio_path))

        elapsed = time.monotonic() - t0
        file_size = audio_path.stat().st_size
        logger.info(
            f"[TTS] edge-tts done in {elapsed:.1f}s — "
            f"saved {file_size} bytes to {audio_path}"
        )

        audio_url = f"{base_url}/api/audio/{audio_id}.mp3"
        return audio_url

    except ImportError:
        logger.warning("[TTS] edge-tts not installed, falling back to gTTS")
    except Exception as e:
        logger.warning(f"[TTS] edge-tts failed ({e}), falling back to gTTS")

    # ── Fallback: gTTS ──
    try:
        from gtts import gTTS

        tts_lang = TTS_LANGUAGE_MAP.get(language, "en")
        logger.info(f"[TTS] gTTS fallback: lang={tts_lang}, text_len={len(text)}, id={audio_id}")

        loop = asyncio.get_event_loop()

        def _generate():
            tts = gTTS(text=text, lang=tts_lang, slow=False)
            tts.save(str(audio_path))

        await loop.run_in_executor(None, _generate)

        file_size = audio_path.stat().st_size
        logger.info(f"[TTS] gTTS saved: {audio_path} ({file_size} bytes)")

        audio_url = f"{base_url}/api/audio/{audio_id}.mp3"
        return audio_url

    except Exception as e:
        logger.error(f"[TTS] All TTS engines failed: {e}", exc_info=True)
        return None


def get_audio_file_path(filename: str) -> Optional[Path]:
    """
    Get the full path to a generated audio file.

    Args:
        filename: Audio filename (e.g. "uuid.mp3")

    Returns:
        Path if file exists, None otherwise
    """
    path = AUDIO_DIR / filename
    if path.exists() and path.is_file():
        return path
    return None


def cleanup_old_audio(max_age_seconds: int = 3600):
    """Remove audio files older than max_age_seconds."""
    import time

    now = time.time()
    removed = 0
    for f in AUDIO_DIR.iterdir():
        if f.is_file() and (now - f.stat().st_mtime) > max_age_seconds:
            f.unlink(missing_ok=True)
            removed += 1
    if removed:
        logger.info(f"[TTS] Cleaned up {removed} old audio files")


async def _convert_to_wav(audio_bytes: bytes, source_format: str) -> bytes:
    """
    Convert audio bytes from any format to WAV using pydub + ffmpeg.

    Args:
        audio_bytes: Raw audio bytes
        source_format: Source format string (webm, ogg, mp3, wav, mp4, etc.)

    Returns:
        WAV-encoded bytes
    """
    from pydub import AudioSegment

    # Normalize format name
    fmt = source_format.lower().strip()
    if "opus" in fmt:
        fmt = "ogg"
    elif "webm" in fmt:
        fmt = "webm"
    elif "mp4" in fmt or "m4a" in fmt:
        fmt = "mp4"
    elif "wav" in fmt:
        # Already WAV — but still process to normalize sample rate
        fmt = "wav"

    logger.info(f"[STT] Converting from '{source_format}' (normalized: '{fmt}') to WAV")

    loop = asyncio.get_event_loop()

    def _do_convert():
        input_buffer = io.BytesIO(audio_bytes)
        try:
            audio_segment = AudioSegment.from_file(input_buffer, format=fmt)
        except Exception as e:
            logger.warning(f"[STT] pydub failed with format='{fmt}', trying auto-detect: {e}")
            input_buffer.seek(0)
            audio_segment = AudioSegment.from_file(input_buffer)

        # Convert to mono, 16kHz, 16-bit PCM WAV (optimal for speech recognition)
        audio_segment = audio_segment.set_channels(1).set_frame_rate(16000).set_sample_width(2)

        output_buffer = io.BytesIO()
        audio_segment.export(output_buffer, format="wav")
        return output_buffer.getvalue()

    return await loop.run_in_executor(None, _do_convert)

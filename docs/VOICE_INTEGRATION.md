# Voice Integration Implementation Guide

## Overview

The Kissan AI platform now supports **multimodal interaction** with both text and voice inputs. This document describes the complete voice integration architecture, implementation details, and usage guidelines.

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Browser                           │
│                                                                  │
│  ┌───────────────┐     ┌──────────────┐     ┌───────────────┐  │
│  │ VoiceButton   │ ──> │ VoiceRecorder│ ──> │ WebSocket     │  │
│  │ (UI)          │     │ (MediaRecorder)│   │ Client        │  │
│  └───────────────┘     └──────────────┘     └───────┬───────┘  │
│                                                      │           │
└──────────────────────────────────────────────────────┼───────────┘
                                                       │
                                     WebSocket /api/voice
                                                       │
┌──────────────────────────────────────────────────────┴───────────┐
│                      FastAPI Backend                             │
│                                                                  │
│  ┌───────────────┐     ┌──────────────┐     ┌───────────────┐  │
│  │ Language      │ ──> │ Multimodal   │ ──> │ Agent WS      │  │
│  │ Detection     │     │ Controller   │     │ Client        │  │
│  └───────────────┘     └──────────────┘     └───────┬───────┘  │
│                                                      │           │
└──────────────────────────────────────────────────────┼───────────┘
                                                       │
                                      WebSocket wss://agent.kissan.ai/ws
                                                       │
                                                       ▼
                                            ┌───────────────────┐
                                            │  Agent Service    │
                                            │  (External)       │
                                            └───────────────────┘
```

### Key Components

#### Frontend Components

1. **VoiceButton** (`components/VoiceButton.tsx`)
   - Animated microphone button
   - Visual states: idle, recording, processing, playing
   - Handles start/stop recording clicks

2. **VoiceRecorder Utility** (`utils/voiceRecorder.ts`)
   - Browser MediaRecorder API integration
   - Real-time audio chunking (250ms intervals)
   - Base64 encoding
   - MIME type detection (prefers webm/opus)

3. **VoiceWebSocket Client** (`utils/voiceWebSocket.ts`)
   - WebSocket connection management
   - Audio chunk streaming
   - Message handling (transcript, stream_chunk, audio_url, errors)
   - Keep-alive ping/pong

4. **useVoiceRecorder Hook** (`hooks/useVoiceRecorder.ts`)
   - State management for recording lifecycle
   - Integration between VoiceRecorder and WebSocket
   - Callbacks for transcript, response, and audio playback

5. **AudioPlayer** (`components/AudioPlayer.tsx`)
   - Automatic playback of agent voice responses
   - Visual feedback during playback
   - Error handling

#### Backend Services

1. **Language Engine** (`services/language_engine.py`)
   - Language detection from text input
   - Hinglish normalization
   - Script detection (Devanagari, Bengali, Telugu, etc.)
   - Supported languages: en, hi, bn, te, ta, mr, gu, kn, ml, pa

2. **Multimodal Controller** (`services/multimodal_controller.py`)
   - Central routing logic for text vs voice
   - State machine management
   - Determines audio generation needs
   - Creates agent-compatible payloads

3. **Connection Manager** (`services/connection_manager.py`)
   - WebSocket connection tracking
   - Message broadcasting
   - Connection cleanup

4. **Voice WebSocket Endpoint** (`main.py @ /api/voice`)
   - Receives audio chunks from frontend
   - Forwards to agent service
   - Streams responses back to client
   - Handles transcript, text response, and audio URL

---

## Interaction Rules

### Text Input (Typing)
- **Language Detection**: Automatic detection of input language
- **Hinglish Normalization**: "Hello kaise ho" → Normalized to Hindi
- **Response Language**: Same as detected language
- **Audio Generation**: NO (text-only response)

### Voice Input (Microphone)
- **Language Detection**: Agent service detects from audio
- **Response Language**: Uses `ui_language` (selected language)
- **Audio Generation**: YES (both text + audio response)
- **State Management**: Prevents simultaneous text/voice operations

---

## API Reference

### WebSocket Endpoint: `/api/voice`

#### Client → Server Messages

**Audio Stream Packet**
```json
{
  "type": "audio_stream",
  "audio_data": "<base64-encoded audio>",
  "format": "webm",
  "is_first": true,
  "is_final": false,
  "ui_language": "hi",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  }
}
```

**Keep-Alive Ping**
```json
{
  "type": "ping"
}
```

#### Server → Client Messages

**Transcript (User's spoken text)**
```json
{
  "type": "transcript",
  "content": "मेरी फसल में कीड़े लग गए हैं",
  "language": "hi"
}
```

**Stream Chunk (Streaming response)**
```json
{
  "type": "stream_chunk",
  "content": "आपकी फसल में कीड़ों की समस्या के लिए..."
}
```

**Stream End (Complete response)**
```json
{
  "type": "stream_end",
  "content": "Complete response text here...",
  "language": "hi"
}
```

**Audio URL (Voice response)**
```json
{
  "type": "audio_url",
  "url": "https://agent.kissan.ai/audio/response_xyz.mp3",
  "language": "hi"
}
```

**Error**
```json
{
  "type": "error",
  "message": "Transcription failed"
}
```

**Pong (Keep-alive response)**
```json
{
  "type": "pong"
}
```

---

## Usage Examples

### Frontend Integration

```tsx
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import VoiceButton from '@/components/VoiceButton'
import AudioPlayer from '@/components/AudioPlayer'

function ChatWindow() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  
  const voiceRecorder = useVoiceRecorder({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    uiLanguage: currentLanguage,
    onTranscript: (text, language) => {
      // Add user's transcribed message
      addMessage({ text, sender: 'user' })
    },
    onResponse: (text, language) => {
      // Add agent's text response
      addMessage({ text, sender: 'agent' })
    },
    onAudioUrl: (url, language) => {
      // Play audio response
      setAudioUrl(url)
    },
    onError: (error) => {
      console.error('Voice error:', error)
    },
  })

  const handleVoiceClick = async () => {
    if (voiceRecorder.state === 'idle') {
      await voiceRecorder.startRecording()
    } else if (voiceRecorder.state === 'recording') {
      await voiceRecorder.stopRecording()
    }
  }

  return (
    <>
      <VoiceButton
        state={voiceRecorder.state}
        onClick={handleVoiceClick}
      />
      <AudioPlayer audioUrl={audioUrl} />
    </>
  )
}
```

### Backend Processing

```python
from services.language_engine import detect_language, determine_output_language
from services.multimodal_controller import MultimodalController, ModalityType

# For text input
detected_lang = detect_language(user_message)
output_lang = determine_output_language(detected_lang)
controller = MultimodalController()
state = controller.determine_modality(ModalityType.TEXT)
should_audio = controller.should_generate_audio()  # False for text

# For voice input
# Language already detected by agent from audio
controller = MultimodalController()
state = controller.determine_modality(ModalityType.VOICE)
should_audio = controller.should_generate_audio()  # True for voice
```

---

## File Structure

```
frontend/
├── components/
│   ├── VoiceButton.tsx          # Microphone UI button
│   ├── AudioPlayer.tsx          # Audio playback component
│   └── ChatWindow.tsx           # Integrated chat with voice
├── hooks/
│   └── useVoiceRecorder.ts      # Voice recording state hook
└── utils/
    ├── voiceRecorder.ts         # MediaRecorder wrapper
    └── voiceWebSocket.ts        # WebSocket client

backend/
├── main.py                      # Voice WebSocket endpoint
├── services/
│   ├── language_engine.py       # Language detection
│   ├── multimodal_controller.py # Text/voice routing
│   ├── connection_manager.py    # WebSocket management
│   └── agent_ws.py              # Agent service client
└── models/
    └── chat.py                  # Request/response models
```

---

## State Machine

### Recording States

```
┌──────┐  start()  ┌───────────┐  stop()  ┌────────────┐
│ IDLE │ ────────> │ RECORDING │ ───────> │ PROCESSING │
└──────┘           └───────────┘          └────────────┘
   ▲                                              │
   │                                              │
   │                  ┌─────────┐                 │
   └──────────────────┤ PLAYING │ <───────────────┘
                      └─────────┘
```

- **IDLE**: Ready to start recording
- **RECORDING**: Actively capturing audio
- **PROCESSING**: Sent to server, awaiting response
- **PLAYING**: Playing back agent's audio response

### Rules
- Text input disabled during RECORDING, PROCESSING, PLAYING
- Voice button disabled during PROCESSING
- Only one modality active at a time

---

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 60+
- ✅ Edge 79+
- ✅ Firefox 55+
- ✅ Safari 14+
- ✅ Opera 47+

### Required APIs
- `navigator.mediaDevices.getUserMedia`
- `MediaRecorder`
- `WebSocket`
- `FileReader` (for base64 encoding)

### Feature Detection
```typescript
import { isVoiceSupported } from '@/utils/voiceRecorder'

if (!isVoiceSupported()) {
  console.warn('Voice recording not supported')
}
```

---

## Audio Format

### Preferred Format
- **Container**: WebM
- **Codec**: Opus
- **MIME**: `audio/webm;codecs=opus`
- **Sample Rate**: 16kHz
- **Channels**: Mono (1 channel)

### Fallback Formats
1. `audio/webm`
2. `audio/ogg;codecs=opus`
3. `audio/mp4`
4. `audio/wav`

### Chunk Duration
- **Default**: 250ms
- **Purpose**: Real-time streaming to reduce latency

---

## Security Considerations

1. **Microphone Permission**
   - Browser prompts user for microphone access
   - Permission can be revoked at any time
   - Graceful handling of denied permissions

2. **WebSocket Security**
   - Production: `wss://` (TLS encrypted)
   - Development: `ws://` (localhost only)
   - CORS configured for allowed origins

3. **Audio Data**
   - Base64 encoding for JSON transport
   - Temporary storage only (streaming)
   - No persistent recording without user consent

---

## Performance Optimization

### Chunk Streaming
- Small chunks (250ms) for real-time feel
- Reduces initial latency
- Progressive processing

### Connection Management
- Keep-alive pings every 30 seconds
- Automatic reconnection (max 3 attempts)
- Exponential backoff: 1s, 2s, 3s

### Audio Playback
- Auto-play agent responses
- Preloading disabled (on-demand)
- Cleanup on component unmount

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Microphone permission denied` | User denied access | Re-request permission |
| `Voice recording not supported` | Old browser | Upgrade or use text |
| `WebSocket connection error` | Network issue | Check connectivity |
| `Transcription failed` | Audio quality | Retry in quiet environment |

### Error Recovery
- Automatic state reset to IDLE
- User-friendly error messages
- Retry mechanisms for temporary failures

---

## Testing

### Manual Testing Checklist

- [ ] Click microphone button → starts recording
- [ ] Speak in Hindi → transcript appears
- [ ] Stop recording → response streams in
- [ ] Audio plays automatically
- [ ] Disable text input during voice
- [ ] Handle microphone permission denial
- [ ] Test in noisy environment
- [ ] Test all 10 supported languages
- [ ] Verify Hinglish detection

### Browser Testing
- [ ] Chrome desktop
- [ ] Firefox desktop
- [ ] Safari desktop
- [ ] Chrome mobile (Android)
- [ ] Safari mobile (iOS)

---

## Future Enhancements

1. **Background Noise Cancellation**
   - Advanced noise suppression
   - Echo cancellation improvements

2. **Voice Activity Detection (VAD)**
   - Auto-stop when user finishes speaking
   - No manual stop button needed

3. **Offline Support**
   - Local speech recognition (Web Speech API)
   - Queue requests for later

4. **Multiple Languages in Single Session**
   - Detect language per message
   - Switch dynamically

5. **Audio Waveform Visualization**
   - Real-time waveform during recording
   - Better user feedback

---

## Troubleshooting

### Microphone Not Working
1. Check browser permissions
2. Verify microphone hardware
3. Test in system settings
4. Try different browser

### No Audio Response
1. Check speaker/headphone volume
2. Verify audio URL is received
3. Check browser console for errors
4. Test with different audio format

### WebSocket Connection Fails
1. Check NEXT_PUBLIC_API_URL
2. Verify backend is running
3. Check firewall settings
4. Inspect network tab in devtools

### Poor Transcription Quality
1. Reduce background noise
2. Speak clearly and slowly
3. Position microphone closer
4. Use external microphone

---

## Support

For issues or questions:
1. Check browser console for errors
2. Review backend logs (`docker-compose logs backend`)
3. Verify agent service is running
4. Check network connectivity

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: ✅ Production Ready

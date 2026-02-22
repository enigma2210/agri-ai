# Voice Feature Quick Start Guide

## Prerequisites

✅ Make sure you have completed the main setup:
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:3000`  
- Agent service accessible at `wss://agent.kissan.ai/ws`

## Testing Voice Interaction

### Step 1: Enable Microphone

1. Open browser (Chrome/Firefox/Safari)
2. Navigate to `http://localhost:3000`
3. Click the **microphone button** (green circle with mic icon)
4. **Allow** microphone access when prompted

### Step 2: Record Voice Message

1. Click microphone button to **start recording** (button turns red and pulses)
2. **Speak clearly** in any of the 10 supported languages:
   - English: "What crops grow well in monsoon?"
   - Hindi: "मानसून में कौन सी फसलें अच्छी होती हैं?"
   - Hinglish: "Kya monsoon mein wheat grow kar sakte hain?"
3. Click microphone button again to **stop recording** (button shows spinner)

### Step 3: Receive Response

1. **Transcript** appears in chat (your spoken words)
2. **Text response** streams in from agent
3. **Audio plays automatically** in your selected UI language
4. Visual indicator shows "Playing audio..."

## How It Works

### Text vs Voice Rules

| Input Method | Language Detection | Response Language | Audio Generated |
|--------------|-------------------|-------------------|-----------------|
| **Text (Typing)** | Auto-detected from text | Same as detected language | ❌ No |
| **Voice (Mic)** | Detected by agent from audio | UI language (selected) | ✅ Yes |

### Example Scenarios

**Scenario 1: Text Input in Hindi**
```
User types: "मेरी फसल में कीड़े हैं"
→ Language detected: Hindi
→ Response in: Hindi (text only)
→ Audio: None
```

**Scenario 2: Voice Input (UI language: Hindi)**
```
User speaks: "मेरी फसल में कीड़े हैं"
→ Agent detects: Hindi
→ Response in: Hindi (text + audio)
→ Audio: Plays in Hindi
```

**Scenario 3: Hinglish Text**
```
User types: "Hello, crops ke baare mein batao"
→ Detected as: Hinglish → Normalized to Hindi
→ Response in: Hindi (text only)
→ Audio: None
```

## State Indicators

### Microphone Button Colors

- 🟢 **Green** = Ready to record (idle)
- 🔴 **Red + Pulse** = Recording in progress
- ⚪ **Gray** = Processing (transcribing/waiting for response)
- 🔵 **Blue** = Playing audio response

### Input Bar

- **Enabled** = You can type
- **Disabled (grayed out)** = Voice interaction in progress

## Browser Support

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome 60+ | ✅ Fully Supported | Recommended |
| Edge 79+ | ✅ Fully Supported | - |
| Firefox 55+ | ✅ Fully Supported | - |
| Safari 14+ | ✅ Fully Supported | May need permission settings |
| Opera 47+ | ✅ Fully Supported | - |
| IE 11 | ❌ Not Supported | Use modern browser |

## Troubleshooting

### "Microphone permission denied"

**Solution:**
1. Click the lock icon in browser address bar
2. Allow microphone access
3. Refresh page
4. Try again

### "Voice recording not supported"

**Solution:**
- Update browser to latest version
- Try Chrome/Firefox instead
- Check if microphone is connected

### No audio plays after response

**Solution:**
1. Check speaker/headphone volume
2. Unmute browser tab
3. Check browser console (F12) for errors
4. Verify `NEXT_PUBLIC_API_URL` in frontend/.env

### WebSocket connection fails

**Solution:**
1. Verify backend is running: `docker-compose ps`
2. Check logs: `docker-compose logs backend`
3. Ensure port 8000 is accessible
4. Check firewall settings

### Poor transcription quality

**Solution:**
1. Speak clearly and at moderate pace
2. Reduce background noise
3. Position microphone 6-12 inches from mouth
4. Use headset microphone for better quality

## Testing Each Language

```bash
# English
"What crops should I plant in summer?"

# Hindi
"गर्मी में कौन सी फसल लगाएं?"

# Bengali  
"গ্রীষ্মে কোন ফসল রোপণ করব?"

# Telugu
"వేసవిలో ఏ పంటలు నాటాలి?"

# Tamil
"கோடையில் என்ன பயிர்களை நடவேண்டும்?"

# Marathi
"उन्हाळ्यात कोणती पिके लावावीत?"

# Gujarati
"ઉનાળામાં કયા પાક વાવવા જોઈએ?"

# Kannada
"ಬೇಸಿಗೆಯಲ್ಲಿ ಯಾವ ಬೆಳೆಗಳನ್ನು ನೆಡಬೇಕು?"

# Malayalam
"വേനൽക്കാലത്ത് ന്ത് വിളകൾ നട്ടുപിടിപ്പിക്കണം?"

# Punjabi
"ਗਰਮੀਆਂ ਵਿੱਚ ਕਿਹੜੀਆਂ ਫਸਲਾਂ ਲਾਉਣੀਆਂ ਚਾਹੀਦੀਆਂ ਹਨ?"

# Hinglish (normalized to Hindi)
"Summer mein kaun si fasal lagayein?"
```

## Advanced Usage

### Disable Voice Button

To disable voice feature:

```typescript
// In ChatWindow.tsx, comment out:
// <VoiceButton ... />
```

### Change Chunk Duration

For different network conditions:

```typescript
// In useVoiceRecorder.ts
const recorder = new VoiceRecorder({
  chunkDuration: 500, // Default: 250ms
  // ...
})
```

### Custom Audio Format

```typescript
// In voiceRecorder.ts, modify getSupportedMimeType()
const types = [
  'audio/webm;codecs=opus', // Preferred
  'audio/mp4',              // Fallback
]
```

## Performance Tips

1. **Use WebM/Opus format** - Best compression + quality
2. **Keep chunks small** - 250ms for real-time feel
3. **Limit concurrent requests** - One voice session at a time
4. **Cache audio responses** - Reduce server load (future enhancement)

## Security Notes

- Microphone access requires **user permission**
- Audio data **not stored permanently** (streaming only)
- WebSocket uses **TLS in production** (wss://)
- CORS configured for **allowed origins only**

## Next Steps

✅ Voice feature is ready to use!

**Try these:**
1. Test all 10 languages
2. Mix text and voice in same session
3. Try Hinglish detection
4. Test in different browsers
5. Check mobile experience

**Learn more:**
- [Full Voice Integration Guide](./VOICE_INTEGRATION.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [API Reference](./VOICE_INTEGRATION.md#api-reference)

---

**Need help?** Check logs:
```bash
# Backend logs
docker-compose logs -f backend

# Frontend logs (browser console)
F12 → Console tab
```

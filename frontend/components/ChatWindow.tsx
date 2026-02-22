'use client'

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'
import LoadingStream from './LoadingStream'
import VoiceButton from './VoiceButton'
import AudioPlayer from './AudioPlayer'
import { Language } from '@/utils/languages'
import { apiClient } from '@/utils/api'
import { getUserLocation } from '@/utils/location'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'
import { sanitizeText } from '@/utils/textUtils'
import { API_BASE } from '@/config/api'

export interface Message {
  id: string
  text: string
  sender: 'user' | 'agent'
  timestamp: Date
  /** true = char-by-char typing animation (text chat); false = instant render */
  streaming?: boolean
  /** 'streaming' while chunks arrive, 'final' when stream_end received */
  status?: 'streaming' | 'final'
}

interface ChatWindowProps {
  currentLanguage: Language
}

/**
 * ── VOICE FLOW STATE MACHINE ──
 *
 *  IDLE
 *    → (user clicks mic)
 *  RECORDING
 *    → (user clicks stop)
 *  PROCESSING              ← LoadingStream dots shown
 *    → (transcript arrives)
 *  DISPLAYING_TRANSCRIPT   ← user message inserted, timestamp recorded
 *    → (first stream_chunk)
 *  STREAMING_RESPONSE      ← single AI bubble updated in-place
 *    → (stream_end)
 *  WAITING_AUDIO_DELAY     ← ≥1 s after transcript was shown
 *    → (delay elapsed)
 *  PLAYING_AUDIO           ← AudioPlayer autoplays
 *    → (playback ends / stop)
 *  IDLE
 */

export default function ChatWindow({ currentLanguage }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  // ── Refs for streaming dedup & audio timing ──
  /** ID of the single AI bubble being built by stream_chunk messages */
  const streamingMsgIdRef = useRef<string | null>(null)
  /** Timestamp when the transcript (user message) was inserted */
  const transcriptShownAtRef = useRef<number | null>(null)
  /** Pending audio URL held until delay elapses */
  const pendingAudioUrlRef = useRef<string | null>(null)
  /** Timer for audio delay */
  const audioDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  /** Track if user has scrolled up (disable auto-scroll) */
  const isNearBottomRef = useRef(true)

  // ── Helpers ──

  const clearAudioDelayTimer = useCallback(() => {
    if (audioDelayTimerRef.current) {
      clearTimeout(audioDelayTimerRef.current)
      audioDelayTimerRef.current = null
    }
  }, [])

  /**
   * Schedule audio playback so it starts ≥ 1 000 ms after the transcript was shown.
   * If the delay has already elapsed by the time audio_url arrives, play immediately.
   */
  const scheduleAudioPlayback = useCallback(
    (url: string) => {
      clearAudioDelayTimer()
      const shownAt = transcriptShownAtRef.current ?? Date.now()
      const elapsed = Date.now() - shownAt
      const delay = Math.max(1000 - elapsed, 0)
      if (delay === 0) {
        setAudioUrl(url)
      } else {
        audioDelayTimerRef.current = setTimeout(() => {
          setAudioUrl(url)
        }, delay)
      }
    },
    [clearAudioDelayTimer]
  )

  // ── Voice callbacks (stable refs wired to single-bubble logic) ──

  /**
   * TRANSCRIPT — insert user message & record timestamp.
   */
  const handleVoiceTranscript = useCallback((text: string, _language: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: sanitizeText(text),
      sender: 'user',
      timestamp: new Date(),
    }
    transcriptShownAtRef.current = Date.now()
    setMessages((prev) => [...prev, userMessage])
  }, [])

  /**
   * STREAM_CHUNK — create or update a SINGLE AI bubble.
   *
   * RULES:
   *   • Exactly ONE message bubble per response.
   *   • First chunk creates it (status='streaming').
   *   • Subsequent chunks update its text in-place via `updateMessage(id)`.
   *   • Never push a new message while streamingMsgIdRef is set.
   */
  const handleVoiceStreamChunk = useCallback((accumulatedText: string) => {
    const clean = sanitizeText(accumulatedText)
    if (!clean) return

    setMessages((prev) => {
      // ── Try updating the existing streaming bubble ──
      if (streamingMsgIdRef.current) {
        const idx = prev.findIndex((m) => m.id === streamingMsgIdRef.current)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = { ...updated[idx], text: clean }
          return updated
        }
        // If the message was somehow removed, fall through to create
      }

      // ── First chunk: create the single streaming bubble ──
      const id = `voice-ai-${Date.now()}`
      streamingMsgIdRef.current = id
      return [
        ...prev,
        {
          id,
          text: clean,
          sender: 'agent' as const,
          timestamp: new Date(),
          streaming: false, // no char-by-char animation for live voice chunks
          status: 'streaming' as const,
        },
      ]
    })
  }, [])

  /**
   * STREAM_END — finalize the SAME bubble with the authoritative complete_response.
   *
   * RULES:
   *   • Replace the streaming bubble's text with `stream_end.complete_response`.
   *   • Mark `status = 'final'`.
   *   • NEVER create a second message.
   */
  const handleVoiceResponse = useCallback((text: string, _language: string) => {
    const clean = sanitizeText(text)
    const currentStreamId = streamingMsgIdRef.current
    streamingMsgIdRef.current = null // done streaming

    setMessages((prev) => {
      if (currentStreamId) {
        const idx = prev.findIndex((m) => m.id === currentStreamId)
        if (idx >= 0) {
          // Replace in-place — same bubble, final text
          const updated = [...prev]
          updated[idx] = {
            ...updated[idx],
            text: clean,
            streaming: false,
            status: 'final' as const,
          }
          return updated
        }
      }
      // Edge case fallback: no streaming bubble existed (chunks were skipped).
      // Create one final message — this is the ONLY path that may add a new message.
      return [
        ...prev,
        {
          id: `voice-ai-${Date.now()}`,
          text: clean,
          sender: 'agent' as const,
          timestamp: new Date(),
          streaming: true, // trigger typing animation for this edge case
          status: 'final' as const,
        },
      ]
    })
  }, [])

  /**
   * AUDIO_URL — hold the URL and schedule delayed playback.
   * Enforce HTTPS in production (browsers block mixed content).
   */
  const handleVoiceAudioUrl = useCallback(
    (url: string, _language: string) => {
      const safeUrl =
        typeof window !== 'undefined' && window.location.protocol === 'https:'
          ? url.replace(/^http:\/\//i, 'https://')
          : url
      pendingAudioUrlRef.current = safeUrl
      scheduleAudioPlayback(safeUrl)
    },
    [scheduleAudioPlayback]
  )

  const handleVoiceError = useCallback((error: string) => {
    streamingMsgIdRef.current = null
    transcriptShownAtRef.current = null
    pendingAudioUrlRef.current = null

    const isPermission = error.includes('permission') || error.includes('denied')
    const displayText = isPermission
      ? '⚠️ Microphone permission denied. Please allow access and try again.'
      : `⚠️ Voice error: ${error}`
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: displayText,
        sender: 'agent',
        timestamp: new Date(),
      },
    ])
  }, [])

  // Voice recording integration
  const voiceRecorder = useVoiceRecorder({
    apiUrl: API_BASE,
    uiLanguage: currentLanguage,
    location: undefined,
    onTranscript: handleVoiceTranscript,
    onStreamChunk: handleVoiceStreamChunk,
    onResponse: handleVoiceResponse,
    onAudioUrl: handleVoiceAudioUrl,
    onError: handleVoiceError,
  })

  const scrollToBottom = useCallback(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  /** Check if user is near bottom of scroll (within 120px) */
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current
    if (!el) return
    const threshold = 120
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // ── Viewport resize handler (mobile keyboard) ──
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const handleResize = () => {
      // When mobile keyboard opens, visualViewport height shrinks.
      // Scroll to bottom to keep input visible.
      requestAnimationFrame(() => {
        scrollToBottom()
      })
    }

    vv.addEventListener('resize', handleResize)
    return () => vv.removeEventListener('resize', handleResize)
  }, [scrollToBottom])

  // Show welcome message on first load or when language changes
  useEffect(() => {
    const welcomeMessages: Record<Language, string> = {
      en: '👋 Namaste! I\'m Krishi Setu, your AI farming companion. How can I help you today?',
      hi: '👋 नमस्ते! मैं कृषि सेतु हूँ, आपका AI कृषि सहायक। आज मैं आपकी कैसे मदद कर सकता हूँ?',
      bn: '👋 নমস্কার! আমি কৃষি সেতু, আপনার AI কৃষি সহায়ক। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?',
      te: '👋 నమస్కారం! నేను కృషి సేతు, మీ AI వ్యవసాయ సహాయకుడిని. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?',
      ta: '👋 வணக்கம்! நான் கிருஷி சேது, உங்கள் AI விவசாய உதவியாளர். இன்று நான் உங்களுக்கு எப்படி உதவ முடியும்?',
      mr: '👋 नमस्कार! मी कृषी सेतू आहे, तुमचा AI शेती सहाय्यक. आज मी तुम्हाला कशी मदत करू शकतो?',
      gu: '👋 નમસ્તે! હું કૃષિ સેતુ છું, તમારો AI ખેતી સહાયક. આજે હું તમને કેવી રીતે મદદ કરી શકું?',
      kn: '👋 ನಮಸ್ಕಾರ! ನಾನು ಕೃಷಿ ಸೇತು, ನಿಮ್ಮ AI ಕೃಷಿ ಸಹಾಯಕ. ಇಂದು ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
      ml: '👋 നമസ്കാരം! ഞാൻ കൃഷി സേതു ആണ്, നിങ്ങളുടെ AI കാർഷിക സഹായി. ഇന്ന് എനിക്ക് നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?',
      pa: '👋 ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਕ੍ਰਿਸ਼ੀ ਸੇਤੂ ਹਾਂ, ਤੁਹਾਡਾ AI ਖੇਤੀ ਸਹਾਇਕ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?',
    }

    // Replace existing welcome message or add first one
    setMessages((prev) => {
      const withoutWelcome = prev.filter((m) => m.id !== 'welcome')
      const welcome: Message = {
        id: 'welcome',
        text: welcomeMessages[currentLanguage],
        sender: 'agent',
        timestamp: new Date(),
      }
      return [welcome, ...withoutWelcome]
    })
  }, [currentLanguage])

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const location = await getUserLocation()

      const response = await apiClient.sendMessage({
        message: text,
        language: currentLanguage,
        location: location || undefined,
      })

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: sanitizeText(response.response),
        sender: 'agent',
        timestamp: new Date(),
        streaming: true,
        status: 'final',
      }
      setMessages((prev) => [...prev, agentMessage])
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '⚠️ Sorry, I could not process your request. Please try again.',
        sender: 'agent',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceButtonClick = async () => {
    try {
      if (voiceRecorder.state === 'idle') {
        // Reset refs for new voice interaction
        streamingMsgIdRef.current = null
        transcriptShownAtRef.current = null
        pendingAudioUrlRef.current = null
        clearAudioDelayTimer()

        await voiceRecorder.startRecording()
      } else if (voiceRecorder.state === 'recording') {
        await voiceRecorder.stopRecording()
      }
    } catch (err) {
      handleVoiceError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleAudioPlayEnd = useCallback(() => {
    setAudioUrl(null)
    pendingAudioUrlRef.current = null
    transcriptShownAtRef.current = null
    voiceRecorder.markPlaybackDone()
  }, [voiceRecorder])

  // Interrupt audio when user starts new recording
  useEffect(() => {
    if (voiceRecorder.state === 'recording') {
      clearAudioDelayTimer()
      if (audioUrl) {
        setAudioUrl(null)
        pendingAudioUrlRef.current = null
      }
    }
  }, [voiceRecorder.state, audioUrl, clearAudioDelayTimer])

  // Cleanup audio delay timer on unmount
  useEffect(() => {
    return () => clearAudioDelayTimer()
  }, [clearAudioDelayTimer])

  // Determine if inputs should be disabled
  const isVoiceActive = voiceRecorder.state !== 'idle'
  const shouldDisableInput = isLoading || isVoiceActive

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
      {/* Background mesh */}
      <div className="absolute inset-0 bg-mesh pointer-events-none" />

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto chat-scrollbar px-3 sm:px-4 pt-4 pb-2 min-h-0"
      >
        <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
          {messages.map((message) => (
            <MemoizedMessageBubble key={message.id} message={message} />
          ))}
          {(isLoading || voiceRecorder.state === 'processing') && <LoadingStream />}
          {voiceRecorder.state === 'waiting_audio' && (
            <div className="flex justify-start animate-fade-in">
              <div className="text-xs text-gray-400 italic px-3 py-1 rounded-full bg-white/50 backdrop-blur-sm">
                Preparing audio…
              </div>
            </div>
          )}
          {/* Audio Player — inline in message flow */}
          {audioUrl && (
            <div className="flex justify-start animate-slide-up">
              <AudioPlayer
                audioUrl={audioUrl}
                onPlayEnd={handleAudioPlayEnd}
                onError={() => {}}
              />
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Input Bar with integrated Voice Button */}
      <div className="relative flex-shrink-0 z-20 bg-sand-50/80 backdrop-blur-sm border-t border-gray-100/60 pb-safe">
        <InputBar
          onSendMessage={handleSendMessage}
          disabled={shouldDisableInput}
          language={currentLanguage}
          voiceButton={
            <VoiceButton
              state={voiceRecorder.state}
              onClick={handleVoiceButtonClick}
              disabled={isLoading}
            />
          }
        />
      </div>
    </div>
  )
}

/** Memoized wrapper — only re-renders when message content actually changes */
const MemoizedMessageBubble = memo(MessageBubble, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.text === next.message.text &&
    prev.message.streaming === next.message.streaming &&
    prev.message.status === next.message.status
  )
})

/**
 * Voice Recorder React Hook
 * Manages voice recording state machine and WebSocket integration
 *
 * STATE MACHINE (strict — only one active state allowed):
 *
 *   IDLE
 *     → (user clicks mic)
 *   RECORDING
 *     → (user clicks stop)
 *   PROCESSING
 *     → (first stream_chunk arrives)
 *   STREAMING
 *     → (stream_end arrives)
 *   WAITING_AUDIO
 *     → (audio_url arrives OR 3 s timeout)
 *   PLAYING
 *     → (playback ends / stop)
 *   IDLE
 *
 * DESIGN:
 * - PRE-WARMS microphone on mount (eliminates 2-3 s getUserMedia delay)
 * - Records audio via pre-warmed MediaStream (<100 ms start)
 * - Sends audio blob via WebSocket (MP3 or raw webm fallback)
 * - Accumulates stream chunks for live typing display
 * - Replaces chunk-assembled text with stream_end's authoritative text
 * - Audio playback waits for stream_end before being delivered to UI
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  VoiceRecorder,
  isVoiceSupported,
} from '@/utils/voiceRecorder'
import { VoiceWebSocketClient, VoiceClientCallbacks, ConnectionStatus } from '@/utils/voiceWebSocket'
import { Language } from '@/utils/languages'
import { LocationCoordinates } from '@/utils/location'

export type RecordingState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'streaming'
  | 'waiting_audio'
  | 'playing'

export interface VoiceRecorderOptions {
  apiUrl: string
  uiLanguage: Language
  location?: LocationCoordinates
  onTranscript?: (text: string, language: string) => void
  onStreamChunk?: (accumulatedText: string) => void
  onResponse?: (text: string, language: string) => void
  onAudioUrl?: (url: string, language: string) => void
  onError?: (error: string) => void
}

export interface UseVoiceRecorderReturn {
  state: RecordingState
  isSupported: boolean
  permissionGranted: boolean
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  connect: () => Promise<void>
  disconnect: () => void
  isConnected: boolean
  connectionStatus: ConnectionStatus
  error: string | null
  markPlaybackDone: () => void
}

const RESPONSE_TIMEOUT_MS = 30_000
/** If no audio_url arrives within this window after stream_end, go idle */
const AUDIO_URL_TIMEOUT_MS = 5_000

const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    channelCount: 1,
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true,
  },
}

export function useVoiceRecorder(options: VoiceRecorderOptions): UseVoiceRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [isSupported, setIsSupported] = useState(false)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('offline')
  const [error, setError] = useState<string | null>(null)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<VoiceRecorder | null>(null)
  const wsClientRef = useRef<VoiceWebSocketClient | null>(null)
  const streamingTextRef = useRef('')
  const responseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Holds audio URL that arrived before stream_end */
  const pendingAudioUrlRef = useRef<{ url: string; language: string } | null>(null)
  /** Timer: if no audio_url arrives within AUDIO_URL_TIMEOUT_MS of stream_end, go idle */
  const audioUrlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** Tracks the current state inside callbacks (avoids stale closures) */
  const stateRef = useRef<RecordingState>('idle')

  const callbacksRef = useRef(options)
  useEffect(() => {
    callbacksRef.current = options
  }, [options])

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // ── Clear timers ──

  const clearResponseTimeout = useCallback(() => {
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current)
      responseTimeoutRef.current = null
    }
  }, [])

  const clearAudioUrlTimeout = useCallback(() => {
    if (audioUrlTimeoutRef.current) {
      clearTimeout(audioUrlTimeoutRef.current)
      audioUrlTimeoutRef.current = null
    }
  }, [])

  const startResponseTimeout = useCallback(() => {
    clearResponseTimeout()
    responseTimeoutRef.current = setTimeout(() => {
      setState('idle')
      callbacksRef.current.onError?.('Agent did not respond in time. Please try again.')
    }, RESPONSE_TIMEOUT_MS)
  }, [clearResponseTimeout])

  // ── PRE-WARM MICROPHONE ON MOUNT ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isVoiceSupported()) return

    let cancelled = false
    const warmUp = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS)
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        setPermissionGranted(true)
      } catch {
        setPermissionGranted(false)
      }
    }
    warmUp()

    return () => {
      cancelled = true
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }
  }, [])

  // ── Initialize WebSocket client ONCE ──
  useEffect(() => {
    const callbacks: VoiceClientCallbacks = {
      onTranscript: (text, language) => {
        callbacksRef.current.onTranscript?.(text, language)
      },

      onStreamChunk: (chunk) => {
        streamingTextRef.current += chunk
        callbacksRef.current.onStreamChunk?.(streamingTextRef.current)
        setState((prev) => {
          if (prev === 'processing') return 'streaming'
          return prev
        })
      },

      onStreamEnd: (fullText, language) => {
        clearResponseTimeout()
        streamingTextRef.current = ''
        callbacksRef.current.onResponse?.(fullText, language)

        setState('waiting_audio')

        if (pendingAudioUrlRef.current) {
          const { url, language: lang } = pendingAudioUrlRef.current
          pendingAudioUrlRef.current = null
          setState('playing')
          callbacksRef.current.onAudioUrl?.(url, lang)
          return
        }

        audioUrlTimeoutRef.current = setTimeout(() => {
          setState((prev) => {
            if (prev === 'waiting_audio') return 'idle'
            return prev
          })
        }, AUDIO_URL_TIMEOUT_MS)
      },

      onAudioUrl: (url, language) => {
        clearResponseTimeout()
        clearAudioUrlTimeout()

        const curState = stateRef.current

        if (curState === 'waiting_audio') {
          setState('playing')
          callbacksRef.current.onAudioUrl?.(url, language)
        } else if (curState === 'streaming' || curState === 'processing') {
          pendingAudioUrlRef.current = { url, language }
        } else {
          setState('playing')
          callbacksRef.current.onAudioUrl?.(url, language)
        }
      },

      onError: (errorMsg) => {
        clearResponseTimeout()
        clearAudioUrlTimeout()
        pendingAudioUrlRef.current = null
        setError(errorMsg)
        setState('idle')
        callbacksRef.current.onError?.(errorMsg)
      },

      onConnect: () => {
        setIsConnected(true)
        setConnectionStatus('connected')
        setError(null)
      },

      onDisconnect: () => {
        setIsConnected(false)
      },

      onConnectionStatus: (status) => {
        setConnectionStatus(status)
      },
    }

    wsClientRef.current = new VoiceWebSocketClient(callbacks)

    return () => {
      clearResponseTimeout()
      clearAudioUrlTimeout()
      wsClientRef.current?.disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Check voice support ──
  useEffect(() => {
    if (typeof window === 'undefined') return
    const supported = isVoiceSupported()
    setIsSupported(supported)
    if (!supported) {
      setError('Voice recording is not supported in this browser')
    }
  }, [])

  const connect = useCallback(async () => {
    const url = callbacksRef.current.apiUrl
    try {
      if (!wsClientRef.current) return
      await wsClientRef.current.connect(url)
    } catch {
      setError('Failed to connect to voice service')
    }
  }, [])

  const disconnect = useCallback(() => {
    wsClientRef.current?.disconnect()
  }, [])

  // ── START RECORDING ──
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const msg = 'Voice recording is not supported in this browser'
      setError(msg)
      callbacksRef.current.onError?.(msg)
      return
    }
    if (state !== 'idle') return

    try {
      const needsStream =
        !streamRef.current ||
        streamRef.current.getTracks().every((t) => t.readyState === 'ended')

      if (needsStream) {
        streamRef.current = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS)
        setPermissionGranted(true)
      }

      if (!wsClientRef.current?.isConnected()) {
        await connect()
      }

      recorderRef.current = new VoiceRecorder(streamRef.current!, {
        onError: (err) => {
          setError(err.message)
          callbacksRef.current.onError?.(err.message)
          setState('idle')
        },
      })

      recorderRef.current.start()
      setState('recording')
      streamingTextRef.current = ''
      pendingAudioUrlRef.current = null
      setError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      callbacksRef.current.onError?.(`Recording failed: ${msg}`)
      setState('idle')
    }
  }, [isSupported, state, connect])

  // ── STOP RECORDING ──
  const stopRecording = useCallback(async () => {
    if (state !== 'recording' || !recorderRef.current) return

    try {
      setState('processing')
      const result = await recorderRef.current.stop()

      if (!wsClientRef.current?.isConnected()) {
        callbacksRef.current.onError?.('Connection lost. Please try again.')
        setState('idle')
        return
      }

      wsClientRef.current.sendVoiceQuery(
        result.audioData,
        result.format,
        callbacksRef.current.uiLanguage,
        callbacksRef.current.location
      )

      startResponseTimeout()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      callbacksRef.current.onError?.(`Stop recording failed: ${msg}`)
      setState('idle')
    }
  }, [state, startResponseTimeout])

  /** Called by ChatWindow when audio playback finishes */
  const markPlaybackDone = useCallback(() => {
    pendingAudioUrlRef.current = null
    setState((prev) => (prev === 'playing' ? 'idle' : prev))
  }, [])

  return {
    state,
    isSupported,
    permissionGranted,
    startRecording,
    stopRecording,
    connect,
    disconnect,
    isConnected,
    connectionStatus,
    error,
    markPlaybackDone,
  }
}

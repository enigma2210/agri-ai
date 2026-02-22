/**
 * Voice WebSocket Client
 * Manages WebSocket connection for voice interaction
 */

import { Language } from './languages'
import { LocationCoordinates } from './location'
import { WS_BASE } from '@/config/api'

export interface VoiceMessage {
  type: 'transcript' | 'stream_chunk' | 'stream_end' | 'audio_url' | 'error' | 'pong'
  content?: string
  url?: string
  language?: string
  message?: string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline'

export interface VoiceClientCallbacks {
  onTranscript?: (text: string, language: string) => void
  onStreamChunk?: (chunk: string) => void
  onStreamEnd?: (fullText: string, language: string) => void
  onAudioUrl?: (url: string, language: string) => void
  onError?: (error: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onConnectionStatus?: (status: ConnectionStatus) => void
}

export class VoiceWebSocketClient {
  private ws: WebSocket | null = null
  private callbacks: VoiceClientCallbacks
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000 // 2 seconds base delay
  private pingInterval: NodeJS.Timeout | null = null
  private intentionalClose = false
  private lastApiUrl = ''

  constructor(callbacks: VoiceClientCallbacks) {
    this.callbacks = callbacks
  }

  connect(apiUrl?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.intentionalClose = false

        // Convert HTTP(S) URL to WS(S) URL, or use central WS_BASE
        const wsUrl = apiUrl
          ? apiUrl.replace('http://', 'ws://').replace('https://', 'wss://')
          : WS_BASE

        this.lastApiUrl = apiUrl || ''

        const voiceWsUrl = `${wsUrl}/api/voice`

        this.callbacks.onConnectionStatus?.('connecting')

        this.ws = new WebSocket(voiceWsUrl)

        this.ws.onopen = () => {
          this.reconnectAttempts = 0
          this.startPing()
          this.callbacks.onConnectionStatus?.('connected')
          this.callbacks.onConnect?.()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data: VoiceMessage = JSON.parse(event.data)
            this.handleMessage(data)
          } catch {
            // silently ignore malformed frames
          }
        }

        this.ws.onerror = () => {
          this.callbacks.onError?.('WebSocket connection error')
        }

        this.ws.onclose = () => {
          this.stopPing()
          this.callbacks.onDisconnect?.()

          if (!this.intentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            this.callbacks.onConnectionStatus?.('reconnecting')
            setTimeout(() => {
              this.connect(this.lastApiUrl || undefined).catch(() => {
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                  this.callbacks.onConnectionStatus?.('offline')
                }
              })
            }, this.reconnectDelay)
          } else if (!this.intentionalClose) {
            this.callbacks.onConnectionStatus?.('offline')
          }
        }
      } catch (error) {
        this.callbacks.onConnectionStatus?.('offline')
        reject(error)
      }
    })
  }

  /**
   * Send a complete voice recording as a single message.
   * Called once after recording stops — no intermediate chunk streaming.
   */
  sendVoiceQuery(
    audioData: string,
    format: string,
    uiLanguage: Language,
    location?: LocationCoordinates
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.callbacks.onError?.('WebSocket not connected')
      return
    }

    const message: Record<string, unknown> = {
      type: 'audio_stream',
      audio_data: audioData,
      format: format || 'mp3',
      is_first: true,    // single message = both first and final
      is_final: true,
      ui_language: uiLanguage,
    }

    if (location) {
      message.location = location
    }

    this.ws.send(JSON.stringify(message))
  }

  private handleMessage(message: VoiceMessage): void {
    switch (message.type) {
      case 'transcript':
        if (message.content) {
          this.callbacks.onTranscript?.(message.content, message.language || 'en')
        }
        break

      case 'stream_chunk':
        if (message.content) {
          this.callbacks.onStreamChunk?.(message.content)
        }
        break

      case 'stream_end':
        if (message.content) {
          this.callbacks.onStreamEnd?.(message.content, message.language || 'en')
        }
        break

      case 'audio_url':
        if (message.url) {
          this.callbacks.onAudioUrl?.(message.url, message.language || 'en')
        }
        break

      case 'error':
        if (message.message) {
          this.callbacks.onError?.(message.message)
        }
        break

      case 'pong':
        break

      default:
        break
    }
  }

  private startPing(): void {
    this.stopPing()
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Ping every 30 seconds
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  disconnect(): void {
    this.intentionalClose = true // Mark as intentional
    this.stopPing()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

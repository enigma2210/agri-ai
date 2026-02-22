/**
 * Voice WebSocket Client
 * Manages WebSocket connection for voice interaction
 */

import { Language } from './languages'
import { LocationCoordinates } from './location'

export interface VoiceMessage {
  type: 'transcript' | 'stream_chunk' | 'stream_end' | 'audio_url' | 'error' | 'pong'
  content?: string
  url?: string
  language?: string
  message?: string
}

export interface VoiceClientCallbacks {
  onTranscript?: (text: string, language: string) => void
  onStreamChunk?: (chunk: string) => void
  onStreamEnd?: (fullText: string, language: string) => void
  onAudioUrl?: (url: string, language: string) => void
  onError?: (error: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export class VoiceWebSocketClient {
  private ws: WebSocket | null = null
  private callbacks: VoiceClientCallbacks
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectDelay = 1000
  private pingInterval: NodeJS.Timeout | null = null
  private intentionalClose = false // Track if disconnect was intentional

  constructor(callbacks: VoiceClientCallbacks) {
    this.callbacks = callbacks
  }

  connect(apiUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.intentionalClose = false // Reset flag
        
        // Convert HTTP(S) URL to WS(S) URL
        const wsUrl = apiUrl
          .replace('http://', 'ws://')
          .replace('https://', 'wss://')
        
        const voiceWsUrl = `${wsUrl}/api/voice`
        
        console.log('Connecting to voice WebSocket:', voiceWsUrl)
        this.ws = new WebSocket(voiceWsUrl)

        this.ws.onopen = () => {
          console.log('Voice WebSocket connected')
          this.reconnectAttempts = 0
          this.startPing()
          this.callbacks.onConnect?.()
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data: VoiceMessage = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onerror = (error) => {
          console.error('Voice WebSocket error:', error)
          this.callbacks.onError?.('WebSocket connection error')
        }

        this.ws.onclose = () => {
          console.log('Voice WebSocket disconnected')
          this.stopPing()
          this.callbacks.onDisconnect?.()
          
          // Only attempt reconnection if it wasn't an intentional disconnect
          if (!this.intentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            setTimeout(() => {
              console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
              this.connect(apiUrl).catch(console.error)
            }, this.reconnectDelay * this.reconnectAttempts)
          }
        }
      } catch (error) {
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
      console.error('WebSocket not connected')
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

    console.log(
      `[Voice] VOICE_CHUNK_SENT: format=${format || 'mp3'}, ` +
        `size=${audioData.length} b64chars`
    )
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
        // Don't require BOTH content and language — content alone is enough
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
        // Keep-alive response
        break

      default:
        console.warn('Unknown message type:', message.type)
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

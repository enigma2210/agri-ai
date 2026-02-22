/**
 * Voice Recording Service
 * Records audio using a pre-warmed MediaStream.
 *
 * DESIGN:
 * - Accepts an EXISTING MediaStream (pre-warmed on app load for <100ms start).
 * - Records internally as webm/opus (browser-native codec).
 * - On stop, TRIES to convert webm → MP3 via lamejs.
 * - If MP3 conversion fails, falls back to sending raw webm base64.
 * - Returns base64 audio with correct format label.
 * - Does NOT stop stream tracks (caller manages stream lifecycle).
 */

export interface VoiceRecorderOptions {
  onError?: (error: Error) => void
}

export interface RecordingResult {
  audioData: string // base64 audio
  format: string   // "mp3" or "webm"
  durationMs: number
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private isRecording = false
  private startTime = 0
  private resolveStop: ((result: RecordingResult) => void) | null = null
  private rejectStop: ((error: Error) => void) | null = null
  private mimeType = 'audio/webm'
  private stream: MediaStream

  /**
   * @param stream  Pre-warmed MediaStream (from getUserMedia on app load).
   * @param options Optional error callback.
   */
  constructor(stream: MediaStream, options: VoiceRecorderOptions = {}) {
    this.stream = stream
    this.options = options
    this.mimeType = VoiceRecorder.getSupportedMimeType()
    console.log(`[VoiceRecorder] Created. mimeType=${this.mimeType}, tracks=${stream.getTracks().length}`)
  }

  private options: VoiceRecorderOptions

  /**
   * Start recording. Synchronous — no getUserMedia call (stream is pre-warmed).
   */
  start(): void {
    if (this.isRecording) {
      throw new Error('Already recording')
    }

    console.log('[VoiceRecorder] start() called')
    this.chunks = []

    // Verify stream is alive
    const tracks = this.stream.getTracks()
    const aliveTracks = tracks.filter(t => t.readyState === 'live')
    console.log(`[VoiceRecorder] Stream tracks: ${tracks.length} total, ${aliveTracks.length} alive`)
    if (aliveTracks.length === 0) {
      throw new Error('No live audio tracks in stream')
    }

    // Create fresh MediaRecorder from pre-warmed stream
    try {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.mimeType,
      })
      console.log(`[VoiceRecorder] MediaRecorder created. state=${this.mediaRecorder.state}`)
    } catch (mrError) {
      console.error('[VoiceRecorder] MediaRecorder creation failed:', mrError)
      throw mrError
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data)
        console.log(`[VoiceRecorder] Chunk received: ${event.data.size} bytes (total chunks: ${this.chunks.length})`)
      }
    }

    this.mediaRecorder.onstop = async () => {
      console.log(`[VoiceRecorder] MediaRecorder.onstop fired. chunks=${this.chunks.length}`)
      try {
        const durationMs = Date.now() - this.startTime
        const webmBlob = new Blob(this.chunks, { type: this.mimeType })
        console.log(
          `[VoiceRecorder] Recording complete: ${durationMs}ms, ` +
            `${webmBlob.size} bytes (${this.mimeType}), ${this.chunks.length} chunks`
        )

        if (webmBlob.size < 100) {
          throw new Error(`Recording too small: ${webmBlob.size} bytes`)
        }

        // Try MP3 conversion, fall back to webm if it fails
        let audioData: string
        let format: string
        try {
          audioData = await this.convertToMp3(webmBlob)
          format = 'mp3'
          console.log(`[VoiceRecorder] MP3 conversion OK: ${audioData.length} b64 chars`)
        } catch (mp3Err) {
          console.warn('[VoiceRecorder] MP3 conversion failed, falling back to webm:', mp3Err)
          audioData = await this.blobToBase64(webmBlob)
          format = 'webm'
          console.log(`[VoiceRecorder] Webm fallback: ${audioData.length} b64 chars`)
        }

        this.resolveStop?.({
          audioData,
          format,
          durationMs,
        })
      } catch (error) {
        console.error('[VoiceRecorder] Post-processing error:', error)
        this.rejectStop?.(error as Error)
      } finally {
        this.cleanup()
      }
    }

    this.mediaRecorder.onerror = (event) => {
      console.error('[VoiceRecorder] MediaRecorder error event:', event)
      const error = new Error('MediaRecorder error')
      this.options.onError?.(error)
      this.rejectStop?.(error)
      this.cleanup()
    }

    // Start recording — 250ms timeslice for real-time internal chunks
    this.mediaRecorder.start(250)
    this.isRecording = true
    this.startTime = Date.now()
    console.log(`[VoiceRecorder] Recording STARTED (timeslice=250ms)`)
  }

  /**
   * Stop recording and return the complete audio.
   * Does NOT stop stream tracks (managed by caller).
   */
  stop(): Promise<RecordingResult> {
    console.log(`[VoiceRecorder] stop() called. isRecording=${this.isRecording}, state=${this.mediaRecorder?.state}`)
    return new Promise((resolve, reject) => {
      if (!this.isRecording || !this.mediaRecorder) {
        reject(new Error('Not recording'))
        return
      }

      this.resolveStop = resolve
      this.rejectStop = reject
      this.isRecording = false

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
        console.log('[VoiceRecorder] MediaRecorder.stop() called')
      }
    })
  }

  // ── MP3 conversion (best-effort) ────────────────────────────────────

  private async convertToMp3(blob: Blob): Promise<string> {
    console.log('[VoiceRecorder] convertToMp3: starting...')

    // Dynamic import — avoids top-level crash if lamejs has issues
    let lamejs: typeof import('lamejs')
    try {
      lamejs = await import('lamejs')
      console.log('[VoiceRecorder] lamejs loaded successfully')
    } catch (importErr) {
      throw new Error(`lamejs import failed: ${importErr}`)
    }

    // Decode browser audio (webm/ogg) → PCM float samples
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    try {
      const arrayBuffer = await blob.arrayBuffer()
      console.log(`[VoiceRecorder] Decoding ${arrayBuffer.byteLength} bytes via AudioContext...`)

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      console.log(
        `[VoiceRecorder] AudioContext decoded: ` +
          `${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz, ` +
          `${audioBuffer.numberOfChannels}ch, ${audioBuffer.length} samples`
      )

      const channelData = audioBuffer.getChannelData(0) // mono
      const sampleRate = audioBuffer.sampleRate

      // Float32 → Int16
      const samples = new Int16Array(channelData.length)
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]))
        samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff
      }

      // Encode Int16 PCM → MP3
      const Mp3Encoder = lamejs.Mp3Encoder || (lamejs as unknown as { default: { Mp3Encoder: typeof lamejs.Mp3Encoder } }).default?.Mp3Encoder
      if (!Mp3Encoder) {
        throw new Error('Mp3Encoder not found in lamejs module')
      }

      const encoder = new Mp3Encoder(1, sampleRate, 128)
      const mp3Chunks: Int8Array[] = []
      const blockSize = 1152

      for (let i = 0; i < samples.length; i += blockSize) {
        const block = samples.subarray(i, i + blockSize)
        const encoded = encoder.encodeBuffer(block)
        if (encoded.length > 0) {
          mp3Chunks.push(new Int8Array(encoded))
        }
      }

      const tail = encoder.flush()
      if (tail.length > 0) {
        mp3Chunks.push(new Int8Array(tail))
      }

      // Combine all MP3 frames
      const totalLen = mp3Chunks.reduce((s, c) => s + c.length, 0)
      console.log(`[VoiceRecorder] MP3 encoded: ${mp3Chunks.length} frames, ${totalLen} bytes`)

      const mp3Data = new Uint8Array(totalLen)
      let offset = 0
      for (const chunk of mp3Chunks) {
        mp3Data.set(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength), offset)
        offset += chunk.length
      }

      return this.uint8ToBase64(mp3Data)
    } finally {
      await audioCtx.close()
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1] || ''
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('FileReader failed'))
      reader.readAsDataURL(blob)
    })
  }

  private uint8ToBase64(data: Uint8Array): string {
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < data.length; i += chunkSize) {
      const slice = data.subarray(i, i + chunkSize)
      binary += String.fromCharCode(...slice)
    }
    return btoa(binary)
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private static getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]
    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        console.log(`[VoiceRecorder] Supported MIME: ${type}`)
        return type
      }
    }
    console.warn('[VoiceRecorder] No preferred MIME type supported, defaulting to audio/webm')
    return 'audio/webm'
  }

  private cleanup(): void {
    this.chunks = []
    this.mediaRecorder = null
    this.resolveStop = null
    this.rejectStop = null
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording
  }
}

/**
 * Check if browser supports voice recording
 */
export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false
  const supported = !!(
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  )
  console.log(`[VoiceRecorder] isVoiceSupported: ${supported}`)
  return supported
}

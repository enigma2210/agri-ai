/**
 * Audio Player Component
 * Handles automatic playback of voice responses with play/pause/stop controls.
 *
 * - Autoplays when a new audioUrl arrives
 * - Shows a floating control bar with play/pause and stop buttons
 * - Calls onPlayEnd when audio finishes or is stopped
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface AudioPlayerProps {
  audioUrl: string | null
  autoPlay?: boolean
  onPlayStart?: () => void
  onPlayEnd?: () => void
  onError?: (error: string) => void
}

export default function AudioPlayer({
  audioUrl,
  autoPlay = true,
  onPlayStart,
  onPlayEnd,
  onError,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(0) // 0–100
  const [showPlayer, setShowPlayer] = useState(false)
  const rafRef = useRef<number | null>(null)

  // Stable callback refs
  const onPlayStartRef = useRef(onPlayStart)
  const onPlayEndRef = useRef(onPlayEnd)
  const onErrorRef = useRef(onError)
  useEffect(() => { onPlayStartRef.current = onPlayStart }, [onPlayStart])
  useEffect(() => { onPlayEndRef.current = onPlayEnd }, [onPlayEnd])
  useEffect(() => { onErrorRef.current = onError }, [onError])

  // Progress updater
  const updateProgress = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.duration && isFinite(audio.duration)) {
      setProgress((audio.currentTime / audio.duration) * 100)
    }
    rafRef.current = requestAnimationFrame(updateProgress)
  }, [])

  const stopProgressLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  // Cleanup helper — stops audio and resets state
  const cleanupAudio = useCallback(() => {
    stopProgressLoop()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    setIsPlaying(false)
    setIsPaused(false)
    setProgress(0)
  }, [stopProgressLoop])

  // Main effect — play new audio when URL changes
  useEffect(() => {
    if (!audioUrl) {
      cleanupAudio()
      setShowPlayer(false)
      return
    }

    // Cleanup any previous audio
    cleanupAudio()

    const audio = new Audio()
    audioRef.current = audio
    setShowPlayer(true)

    const handlePlay = () => {
      setIsPlaying(true)
      setIsPaused(false)
      rafRef.current = requestAnimationFrame(updateProgress)
      onPlayStartRef.current?.()
    }

    const handlePause = () => {
      setIsPaused(true)
      setIsPlaying(false)
      stopProgressLoop()
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setIsPaused(false)
      setProgress(100)
      stopProgressLoop()
      // Brief delay then hide player and notify parent
      setTimeout(() => {
        setShowPlayer(false)
        setProgress(0)
        onPlayEndRef.current?.()
      }, 600)
    }

    const handleError = () => {
      setIsPlaying(false)
      setIsPaused(false)
      stopProgressLoop()
      setShowPlayer(false)
      onErrorRef.current?.('Failed to play audio')
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    audio.src = audioUrl

    if (autoPlay) {
      audio.play().catch((err) => {
        console.error('Audio autoplay blocked:', err)
        setIsPlaying(false)
        setIsPaused(false)
        onErrorRef.current?.(err instanceof Error ? err.message : 'Autoplay blocked')
      })
    }

    return () => {
      stopProgressLoop()
      audio.pause()
      audio.src = ''
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudio()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Controls ──

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch(console.error)
    } else {
      audio.pause()
    }
  }, [])

  const handleStop = useCallback(() => {
    cleanupAudio()
    setShowPlayer(false)
    onPlayEndRef.current?.()
  }, [cleanupAudio])

  if (!showPlayer) return null

  return (
    <div className="glass border border-white/30 shadow-glass-lg rounded-2xl px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 w-full max-w-[360px]">
      {/* Play / Pause button */}
      <button
        onClick={handlePlayPause}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-700 hover:bg-primary-800 text-white transition-all flex-shrink-0 shadow-sm active:scale-95"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          /* Pause icon */
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          /* Play icon */
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Progress bar + label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-600 truncate">
            {isPlaying ? '🔊 Playing…' : isPaused ? '⏸ Paused' : '🔊 Audio ready'}
          </span>
        </div>
        <div className="w-full bg-primary-100 rounded-full h-1.5">
          <div
            className="bg-primary-700 h-1.5 rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stop button */}
      <button
        onClick={handleStop}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-all flex-shrink-0 active:scale-95"
        aria-label="Stop"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      </button>
    </div>
  )
}

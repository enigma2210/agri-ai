/**
 * Voice Button Component
 * Animated microphone button with emerald/saffron design system
 */

'use client'

import { RecordingState } from '@/hooks/useVoiceRecorder'

interface VoiceButtonProps {
  state: RecordingState
  onClick: () => void
  disabled?: boolean
  className?: string
}

export default function VoiceButton({
  state,
  onClick,
  disabled = false,
  className = '',
}: VoiceButtonProps) {
  const isRecording = state === 'recording'
  const isProcessing = state === 'processing'
  const isStreaming = state === 'streaming'
  const isWaitingAudio = state === 'waiting_audio'
  const isPlaying = state === 'playing'
  const isBusy = isProcessing || isStreaming || isWaitingAudio || isPlaying
  const isDisabled = disabled || isBusy

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        relative flex items-center justify-center
        w-10 h-10 rounded-xl
        transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 focus:ring-red-400 shadow-lg'
            : isBusy
            ? 'bg-gray-200 cursor-wait text-gray-400'
            : 'bg-primary-50 text-primary-700 hover:bg-primary-100 focus:ring-primary-400 hover:shadow-sm'
        }
        ${isDisabled && !isBusy ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      aria-label={
        isRecording
          ? 'Stop recording'
          : isBusy
          ? 'Processing...'
          : 'Start voice recording'
      }
    >
      {/* Microphone Icon */}
      <svg
        className={`w-5 h-5 transition-transform duration-200 ${
          isRecording ? 'scale-110 text-white' : 'scale-100'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        {isRecording ? (
          // Stop icon when recording
          <rect x="6" y="6" width="12" height="12" rx="2" strokeWidth="2" />
        ) : isBusy ? (
          // Loading spinner
          <>
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </>
        ) : (
          // Microphone icon
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        )}
      </svg>

      {/* Ripple effect for recording */}
      {isRecording && (
        <>
          <span className="absolute inset-0 rounded-xl bg-red-400 animate-ping opacity-40" />
          <span className="absolute -inset-1 rounded-2xl border-2 border-red-300 animate-pulse opacity-50" />
        </>
      )}
    </button>
  )
}

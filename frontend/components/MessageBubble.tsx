'use client'

import { useEffect, useState, useRef } from 'react'
import { Message } from './ChatWindow'
import { sanitizeText } from '@/utils/textUtils'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const [displayedText, setDisplayedText] = useState('')
  const isUser = message.sender === 'user'
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sanitize text once
  const cleanText = sanitizeText(message.text)

  // Streaming effect for agent messages
  useEffect(() => {
    // Cleanup previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (message.streaming && !isUser && cleanText) {
      let index = 0
      setDisplayedText('')

      intervalRef.current = setInterval(() => {
        if (index < cleanText.length) {
          // Batch 3 characters at a time for smoother, faster display
          const end = Math.min(index + 3, cleanText.length)
          setDisplayedText(cleanText.slice(0, end))
          index = end
        } else {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      }, 15)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } else {
      setDisplayedText(cleanText)
    }
  }, [cleanText, message.streaming, isUser])

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}
    >
      {/* Agent avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary-700 text-white flex items-center justify-center text-[10px] sm:text-xs font-bold mr-2 sm:mr-2.5 mt-0.5 shadow-sm">
          🌱
        </div>
      )}

      <div
        className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 ${
          isUser
            ? 'bg-primary-700 text-white rounded-br-sm shadow-glass'
            : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100 shadow-float'
        }`}
      >
        {/* Message text */}
        <div
          className={`text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words ${
            isUser ? 'text-white' : 'text-gray-700'
          }`}
        >
          {displayedText}
        </div>

        {/* Timestamp */}
        <div
          className={`text-[10px] mt-1.5 font-medium ${
            isUser ? 'text-primary-200' : 'text-gray-300'
          }`}
        >
          {message.timestamp.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] sm:text-xs font-bold ml-2 sm:ml-2.5 mt-0.5">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  )
}

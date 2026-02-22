'use client'

import { useState, KeyboardEvent } from 'react'
import { Language } from '@/utils/languages'

interface InputBarProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  language: Language
}

export default function InputBar({ onSendMessage, disabled, language }: InputBarProps) {
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage('')
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const placeholders: Record<Language, string> = {
    en: 'Ask about crops, weather, farming...',
    hi: 'फसलों, मौसम, खेती के बारे में पूछें...',
    bn: 'ফসল, আবহাওয়া, কৃষি সম্পর্কে জিজ্ঞাসা করুন...',
    te: 'పంటలు, వాతావరణం, వ్యవసాయం గురించి అడగండి...',
    ta: 'பயிர்கள், வானிலை, விவசாயம் பற்றி கேளுங்கள்...',
    mr: 'पिके, हवामान, शेती बद्दल विचारा...',
    gu: 'પાક, હવામાન, ખેતી વિશે પૂછો...',
    kn: 'ಬೆಳೆಗಳು, ಹವಾಮಾನ, ಕೃಷಿ ಬಗ್ಗೆ ಕೇಳಿ...',
    ml: 'വിളകൾ, കാലാവസ്ഥ, കൃഷി എന്നിവയെക്കുറിച്ച് ചോദിക്കുക...',
    pa: 'ਫਸਲਾਂ, ਮੌਸਮ, ਖੇਤੀ ਬਾਰੇ ਪੁੱਛੋ...',
  }

  return (
    <div className="px-4 py-3 sm:px-6">
      <div
        className={`max-w-2xl mx-auto flex items-end gap-2 rounded-2xl bg-white border px-3 py-2 transition-all duration-300 ${
          isFocused
            ? 'border-primary-300 shadow-glow ring-1 ring-primary-200/40'
            : 'border-gray-200 shadow-float'
        }`}
      >
        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholders[language]}
            disabled={disabled}
            rows={1}
            className="w-full px-2 py-2 text-[15px] text-gray-800 placeholder-gray-300 resize-none focus:outline-none disabled:bg-transparent disabled:cursor-not-allowed bg-transparent"
            style={{
              minHeight: '40px',
              maxHeight: '120px',
            }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
            message.trim() && !disabled
              ? 'bg-primary-700 text-white hover:bg-primary-800 shadow-sm active:scale-95'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          {disabled ? (
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

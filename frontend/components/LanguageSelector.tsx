'use client'

import { motion } from 'framer-motion'
import { Language, getLanguagesList } from '@/utils/languages'

interface LanguageSelectorProps {
  currentLanguage: Language
  onSelectLanguage: (language: Language) => void
  onClose: () => void
}

export default function LanguageSelector({
  currentLanguage,
  onSelectLanguage,
  onClose,
}: LanguageSelectorProps) {
  const languages = getLanguagesList()

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 glass border border-white/30 rounded-3xl shadow-glass-lg z-50 max-w-sm mx-auto overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100/60 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Choose Language</h2>
            <p className="text-xs text-gray-400 mt-0.5">भाषा चुनें</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Language List */}
        <div className="max-h-80 overflow-y-auto chat-scrollbar py-2">
          {languages.map((lang, i) => (
            <motion.button
              key={lang.code}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              onClick={() => onSelectLanguage(lang.code)}
              className={`w-full px-6 py-3.5 flex items-center gap-4 transition-all duration-200 ${
                currentLanguage === lang.code
                  ? 'bg-primary-50/80'
                  : 'hover:bg-gray-50/60'
              }`}
            >
              {/* Language Name */}
              <div className="flex-1 text-left">
                <div className={`text-sm font-semibold ${
                  currentLanguage === lang.code ? 'text-primary-700' : 'text-gray-800'
                }`}>
                  {lang.nativeName}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{lang.name}</div>
              </div>

              {/* Selected Indicator */}
              {currentLanguage === lang.code ? (
                <div className="w-5 h-5 rounded-full bg-primary-700 text-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-200 flex-shrink-0" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100/60 text-center">
          <p className="text-[11px] text-gray-300 font-medium">
            10 Indian languages supported
          </p>
        </div>
      </motion.div>
    </>
  )
}

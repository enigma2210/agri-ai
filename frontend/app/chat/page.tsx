'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import ChatWindow from '@/components/ChatWindow'
import LanguageSelector from '@/components/LanguageSelector'
import ConnectionIndicator from '@/components/ConnectionIndicator'
import { supportedLanguages, Language } from '@/utils/languages'
import { API_BASE } from '@/config/api'
import type { ConnectionStatus } from '@/utils/voiceWebSocket'

export default function ChatPage() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en')
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [backendStatus, setBackendStatus] = useState<ConnectionStatus>('connecting')

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('krishi_language') as Language
    if (saved && supportedLanguages[saved]) {
      setCurrentLanguage(saved)
    }

    // ── Cold-start warm-up (silent, non-blocking) ──
    if (API_BASE) {
      setBackendStatus('connecting')
      fetch(`${API_BASE}/`, { mode: 'cors' })
        .then((res) => {
          setBackendStatus(res.ok ? 'connected' : 'offline')
        })
        .catch(() => {
          setBackendStatus('reconnecting')
          // Retry once after 5s (Render cold start can take 15-30s)
          setTimeout(() => {
            fetch(`${API_BASE}/`, { mode: 'cors' })
              .then((res) => setBackendStatus(res.ok ? 'connected' : 'offline'))
              .catch(() => setBackendStatus('offline'))
          }, 5000)
        })
    }
  }, [])

  const handleLanguageChange = (language: Language) => {
    setCurrentLanguage(language)
    localStorage.setItem('krishi_language', language)
    setShowLanguageSelector(false)
  }

  if (!mounted) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-sand-50 bg-mesh" style={{ height: '100dvh' }}>
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-float">🌱</span>
          <span className="text-sm font-medium text-primary-700 tracking-wide">
            Krishi Setu
          </span>
        </div>
      </div>
    )
  }

  return (
    <main className="fixed inset-0 flex flex-col bg-sand-50 overflow-hidden" style={{ height: '100dvh' }}>
      {/* ── Header ── */}
      <header className="relative z-30 glass border-b border-white/20 px-4 sm:px-6 h-14 flex items-center justify-between flex-shrink-0 pt-safe">
        {/* Left — Brand */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span className="text-xl">🌱</span>
            <div className="leading-tight">
              <h1 className="text-sm font-bold text-primary-700 tracking-tight">
                Krishi Setu
              </h1>
              <p className="text-[10px] text-gray-400 font-medium">कृषि सेतु</p>
            </div>
          </Link>
          <ConnectionIndicator status={backendStatus} />
        </div>

        {/* Right — Language toggle */}
        <button
          onClick={() => setShowLanguageSelector(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/60 hover:bg-white/90 border border-gray-200/60 transition-all text-sm font-medium text-gray-600 hover:text-primary-700"
          aria-label="Change language"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="uppercase text-xs tracking-wide">{currentLanguage}</span>
        </button>
      </header>

      {/* ── Chat Window ── */}
      <ChatWindow currentLanguage={currentLanguage} />

      {/* ── Language Selector Modal ── */}
      <AnimatePresence>
        {showLanguageSelector && (
          <LanguageSelector
            currentLanguage={currentLanguage}
            onSelectLanguage={handleLanguageChange}
            onClose={() => setShowLanguageSelector(false)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}

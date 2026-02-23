'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

const features = [
  {
    icon: '🌾',
    title: 'Crop Advisory',
    desc: 'Get AI-powered recommendations for your specific soil, climate, and crop.',
  },
  {
    icon: '🌦️',
    title: 'Weather Insights',
    desc: 'Hyper-local weather forecasts and alerts tailored to your farm.',
  },
  {
    icon: '🗣️',
    title: 'Voice Enabled',
    desc: 'Speak naturally in 10 Indian languages — no typing needed.',
  },
  {
    icon: '🐛',
    title: 'Pest & Disease ID',
    desc: 'Identify crop diseases and get treatment advice instantly.',
  },
  {
    icon: '💰',
    title: 'Market Prices',
    desc: 'Real-time mandi prices and trends at your fingertips.',
  },
  {
    icon: '📚',
    title: 'Knowledge Base',
    desc: 'Government schemes, best practices, and seasonal guides.',
  },
]

const languages = [
  'English', 'हिंदी', 'বাংলা', 'తెలుగు', 'தமிழ்',
  'मराठी', 'ગુજરાતી', 'ಕನ್ನಡ', 'മലയാളം', 'ਪੰਜਾਬੀ',
]

export default function LandingPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-sand-50 overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-white/20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🌱</span>
            <span className="text-lg font-bold text-primary-700 tracking-tight">
              Krishi Setu
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-sm text-gray-500 font-medium">
              कृषि सेतु
            </span>
            <Link
              href="/chat"
              className="bg-primary-700 hover:bg-primary-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-glow active:scale-[0.97]"
            >
              Open Chat
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative pt-24 sm:pt-32 pb-14 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background mesh */}
        <div className="absolute inset-0 bg-mesh pointer-events-none" />

        {/* Decorative blobs */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 -right-20 w-80 h-80 bg-saffron-300/15 rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              AI-Powered • 10 Languages
            </div>

            {/* Main heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-4">
              <span className="text-gradient">Krishi Setu</span>
            </h1>
            <p className="text-xl sm:text-2xl text-gray-500 font-medium mb-2">
              कृषि सेतु — Your AI Farming Companion
            </p>
            <p className="text-base sm:text-lg text-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
              Talk to an AI that understands Indian agriculture. Voice-first, multilingual, and built for the field.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/chat"
              className="group relative bg-primary-700 hover:bg-primary-800 text-white px-8 py-4 rounded-2xl text-base font-semibold transition-all hover:shadow-glow active:scale-[0.97] flex items-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Start Conversation
              <span className="absolute inset-0 rounded-2xl ring-2 ring-primary-400/0 group-hover:ring-primary-400/30 transition-all" />
            </Link>
            <a
              href="#features"
              className="text-gray-500 hover:text-primary-700 px-6 py-4 text-base font-medium transition-colors flex items-center gap-2"
            >
              Learn More
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
          </motion.div>

          {/* Language pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-14 flex flex-wrap justify-center gap-2"
          >
            {languages.map((lang, i) => (
              <span
                key={lang}
                className="px-3 py-1 text-xs font-medium rounded-full bg-white/70 border border-gray-200/60 text-gray-500 backdrop-blur-sm"
              >
                {lang}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="max-w-5xl mx-auto px-4 sm:px-6 py-14 sm:py-20 scroll-mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Everything your farm needs
          </h2>
          <p className="text-gray-400 text-lg max-w-lg mx-auto">
            One intelligent assistant for all your agricultural queries
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group p-5 sm:p-6 rounded-2xl bg-white border border-gray-100 hover:border-primary-200 hover:shadow-glass transition-all duration-300 cursor-default"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-base font-semibold text-gray-900 mb-1.5 group-hover:text-primary-700 transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative bg-gradient-hero rounded-2xl sm:rounded-3xl p-8 sm:p-14 text-center text-white overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 -translate-y-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full -translate-x-1/3 translate-y-1/3" />
          </div>
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">
              Ready to transform your farming?
            </h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">
              Start a free conversation with Krishi Setu — no sign-up required.
            </p>
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-4 rounded-2xl text-base font-semibold hover:bg-gray-50 transition-all active:scale-[0.97] shadow-float-lg"
            >
              🌱 Start Now — Free
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200/60 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌱</span>
            <span className="text-sm font-semibold text-primary-700">Krishi Setu</span>
            <span className="text-xs text-gray-400">• कृषि सेतु</span>
          </div>
          <p className="text-xs text-gray-400">
            Built for Indian farmers with ❤️ — AI-powered, voice-first, multilingual.
          </p>
        </div>
      </footer>
    </div>
  )
}

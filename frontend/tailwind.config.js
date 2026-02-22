/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Krishi Setu — Deep Emerald & Warm Sand
        primary: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0F766E',   // ← hero brand color
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        sand: {
          50:  '#FDFBF7',
          100: '#F9F5ED',
          200: '#F4F1EC',   // ← warm sand bg
          300: '#E8E2D7',
          400: '#D4CBBB',
          500: '#B8AC98',
        },
        saffron: {
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        surface: {
          glass: 'rgba(255,255,255,0.72)',
          'glass-dark': 'rgba(15,118,110,0.06)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(15,118,110,0.08)',
        'glass-lg': '0 12px 48px 0 rgba(15,118,110,0.12)',
        'glow': '0 0 20px rgba(15,118,110,0.25)',
        'glow-saffron': '0 0 20px rgba(245,158,11,0.3)',
        'float': '0 4px 24px rgba(0,0,0,0.06)',
        'float-lg': '0 8px 40px rgba(0,0,0,0.1)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'gradient-hero': 'linear-gradient(135deg, #0F766E 0%, #14b8a6 50%, #0d9488 100%)',
        'gradient-saffron': 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
        'gradient-warm': 'linear-gradient(180deg, #FDFBF7 0%, #F4F1EC 100%)',
        'mesh': 'radial-gradient(at 40% 20%, rgba(15,118,110,0.08) 0px, transparent 50%), radial-gradient(at 80% 50%, rgba(245,158,11,0.05) 0px, transparent 50%), radial-gradient(at 10% 80%, rgba(15,118,110,0.04) 0px, transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'typing-dot': 'typingDot 1.4s infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 20px rgba(15,118,110,0.25)' }, '50%': { boxShadow: '0 0 40px rgba(15,118,110,0.45)' } },
        typingDot: { '0%,100%': { opacity: '0.3' }, '50%': { opacity: '1' } },
        shimmer:   { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
}

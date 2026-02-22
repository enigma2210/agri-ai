/**
 * Supported languages for Krishi Setu
 * STRICT REQUIREMENT: Only these 10 languages are supported
 */

export type Language = 'en' | 'hi' | 'bn' | 'te' | 'ta' | 'mr' | 'gu' | 'kn' | 'ml' | 'pa'

export interface LanguageInfo {
  code: Language
  name: string
  nativeName: string
}

export const supportedLanguages: Record<Language, LanguageInfo> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English'
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी'
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা'
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు'
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்'
  },
  mr: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी'
  },
  gu: {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી'
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ'
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം'
  },
  pa: {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ'
  }
}

export const getLanguagesList = (): LanguageInfo[] => {
  return Object.values(supportedLanguages)
}

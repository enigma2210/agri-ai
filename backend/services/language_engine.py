"""
Language Detection and Normalization Engine
Handles language detection, Hinglish normalization, and script conversion
"""
import re
from typing import Optional, Tuple
from services.language import SUPPORTED_LANGUAGES, validate_language

# Hinglish detection patterns (Latin script with Hindi word markers)
HINGLISH_PATTERNS = [
    r'\b(kaise|kya|kab|kahan|kyun|aap|tum|hum|main|hai|hain|ho|kar|ke|ko|ka|ki)\b',
    r'\b(bharat|desh|log|sab|bahut|thoda|jyada|kam|achha|bura)\b',
    r'\b(kheti|fasal|pani|barish|mausam|zameen|khet)\b',
]

# Common Hindi words in Latin script
COMMON_HINGLISH_WORDS = {
    'kaise', 'kya', 'kab', 'kahan', 'kyun', 'aap', 'tum', 'hum', 'main',
    'hai', 'hain', 'ho', 'kar', 'ke', 'ko', 'ka', 'ki', 'bharat', 'desh',
    'kheti', 'fasal', 'pani', 'barish', 'mausam'
}


def detect_hinglish(text: str) -> bool:
    """
    Detect if text is Hinglish (Hindi written in Latin script)
    
    Args:
        text: Input text to analyze
        
    Returns:
        True if text appears to be Hinglish
    """
    text_lower = text.lower()
    
    # Check for Hinglish patterns
    for pattern in HINGLISH_PATTERNS:
        if re.search(pattern, text_lower):
            return True
    
    # Count Hinglish word matches
    words = text_lower.split()
    hinglish_count = sum(1 for word in words if word in COMMON_HINGLISH_WORDS)
    
    # If more than 30% words are Hinglish markers, consider it Hinglish
    if len(words) > 0 and (hinglish_count / len(words)) > 0.3:
        return True
    
    return False


def detect_language(text: str) -> str:
    """
    Detect the language of input text
    
    Args:
        text: Input text to analyze
        
    Returns:
        Language code (en, hi, bn, etc.)
    """
    # Check for Hinglish first (special case)
    if detect_hinglish(text):
        return 'hi'  # Normalize to Hindi
    
    # Check for script-based detection
    if contains_devanagari(text):
        return 'hi'  # Hindi
    elif contains_bengali(text):
        return 'bn'  # Bengali
    elif contains_telugu(text):
        return 'te'  # Telugu
    elif contains_tamil(text):
        return 'ta'  # Tamil
    elif contains_gujarati(text):
        return 'gu'  # Gujarati
    elif contains_kannada(text):
        return 'kn'  # Kannada
    elif contains_malayalam(text):
        return 'ml'  # Malayalam
    elif contains_gurmukhi(text):
        return 'pa'  # Punjabi
    
    # Default to English if no script detected
    return 'en'


def contains_devanagari(text: str) -> bool:
    """Check if text contains Devanagari script (Hindi/Marathi)"""
    return bool(re.search(r'[\u0900-\u097F]', text))


def contains_bengali(text: str) -> bool:
    """Check if text contains Bengali script"""
    return bool(re.search(r'[\u0980-\u09FF]', text))


def contains_telugu(text: str) -> bool:
    """Check if text contains Telugu script"""
    return bool(re.search(r'[\u0C00-\u0C7F]', text))


def contains_tamil(text: str) -> bool:
    """Check if text contains Tamil script"""
    return bool(re.search(r'[\u0B80-\u0BFF]', text))


def contains_gujarati(text: str) -> bool:
    """Check if text contains Gujarati script"""
    return bool(re.search(r'[\u0A80-\u0AFF]', text))


def contains_kannada(text: str) -> bool:
    """Check if text contains Kannada script"""
    return bool(re.search(r'[\u0C80-\u0CFF]', text))


def contains_malayalam(text: str) -> bool:
    """Check if text contains Malayalam script"""
    return bool(re.search(r'[\u0D00-\u0D7F]', text))


def contains_gurmukhi(text: str) -> bool:
    """Check if text contains Gurmukhi script (Punjabi)"""
    return bool(re.search(r'[\u0A00-\u0A7F]', text))


def normalize_script(text: str, detected_language: str) -> str:
    """
    Normalize script for the detected language
    For Hinglish, this would ideally transliterate to Devanagari
    For now, we keep the text as-is and rely on the AI agent
    
    Args:
        text: Input text
        detected_language: Detected language code
        
    Returns:
        Normalized text (currently unchanged, agent handles transliteration)
    """
    # The AI agent will handle actual script conversion
    # We just detect and mark the language
    return text


def determine_output_language(
    input_text: str,
    ui_language: str,
    modality: str
) -> Tuple[str, str]:
    """
    Determine output language based on input modality and content
    
    RULES:
    - TEXT INPUT: Detect language from text.
        - If detected == 'en' but ui_language is non-English, prefer ui_language
          (the user explicitly chose a language in the UI).
        - Otherwise use detected language.
    - VOICE INPUT: Always respond in ui_language
    
    Args:
        input_text: User's input message (may be empty for voice)
        ui_language: Current UI language setting
        modality: 'text' or 'voice'
        
    Returns:
        Tuple of (detected_language, output_language)
    """
    if modality == 'voice':
        # Voice: Always use UI language for output
        return (ui_language, ui_language)
    
    # Text: Detect language and respond in same language
    detected = detect_language(input_text)
    
    # Validate detected language is supported
    if not validate_language(detected):
        detected = 'en'  # Fallback to English
    
    # Edge case: if detection says English but user explicitly selected a
    # non-English language, trust the user's UI selection.  This covers
    # short messages, proper nouns, or mixed-script text that trips up detection.
    if detected == 'en' and ui_language != 'en' and validate_language(ui_language):
        return (detected, ui_language)
    
    return (detected, detected)

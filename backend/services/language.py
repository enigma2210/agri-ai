"""
Language validation and management service
Enforces strict language support as per product requirements
"""
from typing import Dict, Optional

# STRICT REQUIREMENT: Only these 10 languages are supported
# DO NOT add any other languages
SUPPORTED_LANGUAGES: Dict[str, str] = {
    "en": "English",
    "hi": "हिंदी (Hindi)",
    "bn": "বাংলা (Bengali)",
    "te": "తెలుగు (Telugu)",
    "ta": "தமிழ் (Tamil)",
    "mr": "मराठी (Marathi)",
    "gu": "ગુજરાતી (Gujarati)",
    "kn": "ಕನ್ನಡ (Kannada)",
    "ml": "മലയാളം (Malayalam)",
    "pa": "ਪੰਜਾਬੀ (Punjabi)",
}

# Default language
DEFAULT_LANGUAGE = "en"


def validate_language(language_code: str) -> bool:
    """
    Validate if a language code is supported
    
    Args:
        language_code: ISO language code (e.g., 'en', 'hi')
        
    Returns:
        True if language is supported, False otherwise
    """
    return language_code in SUPPORTED_LANGUAGES


def get_language_name(language_code: str) -> Optional[str]:
    """
    Get the display name for a language code
    
    Args:
        language_code: ISO language code
        
    Returns:
        Language name or None if not supported
    """
    return SUPPORTED_LANGUAGES.get(language_code)


def get_default_language() -> str:
    """Get the default language code"""
    return DEFAULT_LANGUAGE


def normalize_language(language_code: Optional[str]) -> str:
    """
    Normalize and validate language code, fallback to default if invalid
    
    Args:
        language_code: Language code to normalize
        
    Returns:
        Valid language code (defaults to English if invalid)
    """
    if not language_code or not validate_language(language_code):
        return DEFAULT_LANGUAGE
    return language_code

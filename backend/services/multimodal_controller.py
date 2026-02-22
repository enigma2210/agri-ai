"""
Multimodal Controller - Central brain for handling text and voice interactions
Manages modality detection, routing, and response generation
"""
from typing import Dict, Any, Optional, Literal
from enum import Enum
import logging

logger = logging.getLogger(__name__)

# Modality types
Modality = Literal['text', 'voice']
# Language name map for agent instructions
LANGUAGE_NAMES: Dict[str, str] = {
    "en": "English",
    "hi": "Hindi (हिंदी)",
    "bn": "Bengali (বাংলা)",
    "te": "Telugu (తెలుగు)",
    "ta": "Tamil (தமிழ்)",
    "mr": "Marathi (मराठी)",
    "gu": "Gujarati (ગુજરાતી)",
    "kn": "Kannada (ಕನ್ನಡ)",
    "ml": "Malayalam (മലയാളം)",
    "pa": "Punjabi (ਪੰਜਾਬੀ)",
}
# System states
class SystemState(Enum):
    IDLE = "idle"
    LISTENING = "listening"
    PROCESSING_AUDIO = "processing_audio"
    PROCESSING_TEXT = "processing_text"
    STREAMING_RESPONSE = "streaming_response"
    PLAYING_AUDIO = "playing_audio"


class MultimodalController:
    """
    Controller for managing multimodal interactions
    
    RULES:
    - TEXT INPUT → Text response only
    - VOICE INPUT → Text + Audio response
    """
    
    def __init__(self):
        self.current_state = SystemState.IDLE
    
    def determine_modality(
        self,
        message: Optional[str] = None,
        audio_data: Optional[str] = None
    ) -> Modality:
        """
        Determine interaction modality
        
        Args:
            message: Text message (if provided)
            audio_data: Audio data (if provided)
            
        Returns:
            'text' or 'voice'
        """
        if audio_data:
            return 'voice'
        elif message:
            return 'text'
        else:
            raise ValueError("Either message or audio_data must be provided")
    
    def should_generate_audio(self, modality: Modality) -> bool:
        """
        Determine if audio response should be generated
        
        Args:
            modality: Interaction modality
            
        Returns:
            True if audio should be generated
        """
        return modality == 'voice'
    
    def create_agent_payload(
        self,
        message: str,
        output_language: str,
        location: Optional[Dict[str, float]],
        modality: Modality
    ) -> Dict[str, Any]:
        """
        Create payload for AI agent based on modality
        
        Args:
            message: User message
            output_language: Language for response
            location: User location coordinates
            modality: Interaction modality
            
        Returns:
            Agent payload dictionary
        """
        # Build language instruction to prepend to message
        lang_name = LANGUAGE_NAMES.get(output_language, output_language)
        if output_language and output_language != "en":
            lang_instruction = (
                f"[IMPORTANT INSTRUCTION: You MUST respond ENTIRELY in {lang_name}. "
                f"Use {lang_name} script only. Do NOT use English. "
                f"Every word of your response must be in {lang_name}.]\n\n"
            )
        else:
            lang_instruction = ""

        augmented_message = lang_instruction + message
        logger.info(
            f"Agent payload: lang={output_language}, modality={modality}, "
            f"lang_instruction={'YES' if lang_instruction else 'NO'}, "
            f"msg_len={len(augmented_message)}"
        )

        payload = {
            "type": "query",
            "message": augmented_message,
            "stream": True,
            "context": {
                "language": output_language,
                "modality": modality,
                "response_language": lang_name,
            }
        }
        
        if location:
            payload["context"]["location"] = location
        
        # Add audio generation flag for voice modality
        if modality == 'voice':
            payload["context"]["generate_audio"] = True
        
        return payload
    
    def set_state(self, new_state: SystemState):
        """Update system state"""
        logger.info(f"State transition: {self.current_state.value} → {new_state.value}")
        self.current_state = new_state
    
    def get_state(self) -> SystemState:
        """Get current system state"""
        return self.current_state
    
    def can_accept_input(self) -> bool:
        """Check if system can accept new input"""
        return self.current_state in [SystemState.IDLE, SystemState.STREAMING_RESPONSE]
    
    def process_text_input(
        self,
        message: str,
        ui_language: str,
        detected_language: str,
        location: Optional[Dict[str, float]]
    ) -> Dict[str, Any]:
        """
        Process text input and create agent request
        
        Args:
            message: User's text message
            ui_language: Current UI language
            detected_language: Detected input language
            location: User location
            
        Returns:
            Agent payload
        """
        self.set_state(SystemState.PROCESSING_TEXT)
        
        # For text, use detected language as output language
        output_language = detected_language
        
        payload = self.create_agent_payload(
            message=message,
            output_language=output_language,
            location=location,
            modality='text'
        )
        
        return payload
    
    def process_voice_input(
        self,
        ui_language: str,
        location: Optional[Dict[str, float]]
    ) -> Dict[str, Any]:
        """
        Process voice input metadata
        Voice transcription happens on agent side
        
        Args:
            ui_language: Current UI language (for response)
            location: User location
            
        Returns:
            Context for voice interaction
        """
        self.set_state(SystemState.PROCESSING_AUDIO)
        
        # For voice, always use UI language
        return {
            "output_language": ui_language,
            "location": location,
            "modality": "voice",
            "generate_audio": True
        }

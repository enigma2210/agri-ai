"""
Pydantic models for chat API requests and responses
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict


class LocationContext(BaseModel):
    """User location context"""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    message: str = Field(..., min_length=1, max_length=5000, description="User's query message")
    language: str = Field(default="en", description="Language code (en, hi, bn, etc.)")
    location: Optional[LocationContext] = Field(None, description="Optional user location")
    
    @field_validator('message')
    @classmethod
    def validate_message(cls, v: str) -> str:
        """Validate message is not empty or just whitespace"""
        if not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()
    
    @field_validator('language')
    @classmethod
    def validate_language(cls, v: str) -> str:
        """Ensure language code is lowercase"""
        return v.lower().strip()
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "What is the best time to plant rice?",
                "language": "en",
                "location": {
                    "latitude": 28.6139,
                    "longitude": 77.2090
                }
            }
        }


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str = Field(..., description="AI agent's response")
    language: str = Field(..., description="Response language code") 
    detected_language: str = Field(default="en", description="Detected input language")
    success: bool = Field(default=True, description="Request success status")
    
    class Config:
        json_schema_extra = {
            "example": {
                "response": "The best time to plant rice is during the monsoon season...",
                "language": "en",
                "success": True
            }
        }

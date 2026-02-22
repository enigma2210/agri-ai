"""
Configuration management for Krishi Setu Backend
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Agent WebSocket Configuration
    AGENT_WS_URL: str = "wss://agent.kissan.ai/ws"
    WS_TIMEOUT: int = 30
    WS_MAX_RETRIES: int = 3
    
    # Public URL (set to your Render service URL in production)
    PUBLIC_URL: str = ""
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://*.onrender.com",
        "https://*.vercel.app",
    ]
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

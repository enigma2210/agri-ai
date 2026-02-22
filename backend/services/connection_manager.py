"""
WebSocket Connection Manager for handling multiple concurrent connections
"""
from typing import Dict, Set
from fastapi import WebSocket
import logging
import json

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages active WebSocket connections for voice streaming
    """
    
    def __init__(self):
        # Store active connections: {connection_id: WebSocket}
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, connection_id: str):
        """
        Accept and register a new WebSocket connection
        
        Args:
            websocket: WebSocket connection
            connection_id: Unique identifier for this connection
        """
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        logger.info(f"WebSocket connected: {connection_id}")
    
    def disconnect(self, connection_id: str):
        """
        Remove a WebSocket connection
        
        Args:
            connection_id: Connection identifier
        """
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            logger.info(f"WebSocket disconnected: {connection_id}")
    
    async def send_message(self, connection_id: str, message: dict):
        """
        Send a message to a specific connection
        
        Args:
            connection_id: Target connection
            message: Message dictionary to send
        """
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            await websocket.send_text(json.dumps(message))
    
    async def send_text(self, connection_id: str, text: str):
        """
        Send raw text to a connection
        
        Args:
            connection_id: Target connection
            text: Text to send
        """
        if connection_id in self.active_connections:
            websocket = self.active_connections[connection_id]
            await websocket.send_text(text)
    
    def get_connection(self, connection_id: str) -> WebSocket:
        """Get a specific connection"""
        return self.active_connections.get(connection_id)
    
    def get_active_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)


# Global connection manager instance
manager = ConnectionManager()

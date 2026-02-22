# Kissan AI - Backend

FastAPI-based backend gateway for Kissan AI WebSocket agent.

## Architecture

```
FastAPI Gateway ↔ WebSocket Client ↔ AI Agent (wss://agent.kissan.ai/ws)
```

## Features

- ✅ WebSocket client with auto-reconnect
- ✅ Language validation (10 Indian languages)
- ✅ Location context support
- ✅ Streaming response handling
- ✅ Production-grade error handling
- ✅ CORS configuration
- ✅ Health check endpoints

## Installation

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env
```

## Configuration

Edit `.env`:

```bash
AGENT_WS_URL=wss://agent.kissan.ai/ws
WS_TIMEOUT=30
WS_MAX_RETRIES=3
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=http://localhost:3000,https://kissan.ai
LOG_LEVEL=INFO
```

## Running

### Development
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Docker
```bash
docker build -t kissan-ai-backend .
docker run -p 8000:8000 --env-file .env kissan-ai-backend
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
backend/
├── main.py              # FastAPI application
├── config.py            # Configuration management
├── services/
│   ├── agent_ws.py      # WebSocket client
│   └── language.py      # Language validation
├── models/
│   └── chat.py          # Pydantic models
├── requirements.txt
├── Dockerfile
└── .env.example
```

## Endpoints

### GET /
Health check - returns service status

### GET /api/health
Detailed health check with agent endpoint info

### GET /api/languages
Get list of supported languages

### POST /api/chat
Send chat message to AI agent

Request:
```json
{
  "message": "How to grow rice?",
  "language": "en",
  "location": {
    "latitude": 28.6139,
    "longitude": 77.2090
  }
}
```

Response:
```json
{
  "response": "Rice cultivation requires...",
  "language": "en",
  "success": true
}
```

### POST /api/speech-to-text
Placeholder for future voice input (not implemented)

### POST /api/text-to-speech
Placeholder for future voice output (not implemented)

## WebSocket Protocol

The backend communicates with the AI agent using this protocol:

### Sent to Agent:
```json
{
  "type": "query",
  "message": "user message",
  "stream": true,
  "context": {
    "language": "en",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090
    }
  }
}
```

### Received from Agent:

Streaming chunk:
```json
{
  "type": "stream_chunk",
  "content": "partial text"
}
```

Final response:
```json
{
  "type": "stream_end",
  "complete_response": "full response text"
}
```

Error:
```json
{
  "type": "error",
  "message": "error description"
}
```

## Error Handling

The backend handles these scenarios:

- ❌ Invalid language code → 400 Bad Request
- ❌ WebSocket connection failure → Auto-retry with exponential backoff
- ❌ Agent timeout → 500 Internal Server Error
- ❌ Invalid request format → 422 Validation Error

## Logging

Logs are written to stdout with this format:
```
2026-02-22 10:30:45,123 - __main__ - INFO - Chat request - Language: en, Message length: 25
```

Set log level via `LOG_LEVEL` environment variable:
- `DEBUG` - Detailed logs including WebSocket chunks
- `INFO` - Standard operational logs (default)
- `WARNING` - Warnings and errors only
- `ERROR` - Errors only

## Testing

```bash
# Run tests
pytest tests/

# With coverage
pytest --cov=. tests/
```

## Production Considerations

1. **Environment Variables**: Never commit `.env` files
2. **CORS**: Configure `CORS_ORIGINS` for your domain
3. **Workers**: Use multiple Uvicorn workers for production
4. **Reverse Proxy**: Use Nginx for SSL termination
5. **Monitoring**: Implement health check monitoring
6. **Rate Limiting**: Configure at Nginx level

## Dependencies

- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `websockets` - WebSocket client
- `pydantic` - Data validation
- `pydantic-settings` - Settings management
- `python-dotenv` - Environment variables

## License

Proprietary

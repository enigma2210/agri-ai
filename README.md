# 🌾 Kissan AI - किसान एआई

**Production-Grade Multilingual AI Agent Platform for Indian Farmers**

---

## 📋 Overview

Kissan AI is a farmer-first AI assistant platform designed specifically for Indian agriculture. Built with production-grade architecture, it provides real-time AI-powered responses in 10 Indian languages, helping farmers with crop management, weather insights, and agricultural best practices.

### ✨ Key Features

- 🤖 **Real-time AI Agent** - Streaming responses via WebSocket
- � **Multimodal Interaction** - Text + Voice input support
- 🌍 **10 Indian Languages** - English, Hindi, Bengali, Telugu, Tamil, Marathi, Gujarati, Kannada, Malayalam, Punjabi
- 🔊 **Voice Responses** - Audio playback in selected language
- 🧠 **Smart Language Detection** - Auto-detects input language including Hinglish
- 📱 **Mobile-First PWA** - Install on any device
- 📍 **Location-Aware** - Context-based responses using geolocation
- ⚡ **Low Bandwidth Optimized** - Built for rural connectivity
- 🔒 **Production Ready** - Docker, HTTPS, rate limiting

---

## 🏗️ Architecture

```
┌─────────────┐       ┌──────────────┐      ┌────────────────┐
│   Frontend  │─────▶│   Backend    │─────▶│  WebSocket     │
│   Next.js   │       │   FastAPI    │      │  AI Agent      │
│   (Port     │       │   Gateway    │      │  wss://agent.  │
│   3000)     │       │   (Port8000) │      │  kissan.ai/ws  │
└─────────────┘       └──────────────┘      └────────────────┘
```

**Why Gateway Pattern?**
- Security: Frontend never directly connects to WebSocket agent
- Validation: Language and request validation
- Error Handling: Graceful degradation
- Monitoring: Centralized logging and metrics

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **TailwindCSS** for styling
- **PWA** support with next-pwa
- **Axios** for API communication

### Backend
- **FastAPI** (Python async framework)
- **WebSockets** client for agent communication
- **Pydantic** for data validation
- **Uvicorn** ASGI server

### Infrastructure
- **Docker & Docker Compose**
- **Nginx** reverse proxy
- **SSL/TLS** ready

---

## 📁 Project Structure

```
kissan-ai/
├── backend/                    # FastAPI Backend
│   ├── main.py                # Main application
│   ├── config.py              # Configuration
│   ├── services/
│   │   ├── agent_ws.py        # WebSocket client service
│   │   └── language.py        # Language validation
│   ├── models/
│   │   └── chat.py            # Pydantic models
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/                   # Next.js Frontend
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   ├── ChatWindow.tsx     # Main chat interface
│   │   ├── MessageBubble.tsx  # Message display
│   │   ├── InputBar.tsx       # User input
│   │   ├── LanguageSelector.tsx
│   │   └── LoadingStream.tsx  # Loading indicator
│   ├── utils/
│   │   ├── api.ts             # API client
│   │   ├── languages.ts       # Language definitions
│   │   └── location.ts        # Geolocation utilities
│   ├── public/
│   │   └── manifest.json      # PWA manifest
│   ├── package.json
│   ├── Dockerfile
│   └── next.config.js
│
├── nginx/
│   ├── nginx.conf             # Nginx configuration
│   └── ssl/                   # SSL certificates
│
├── docker-compose.yml          # Docker orchestration
└── README.md                   # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **Docker & Docker Compose** (for deployment)

### Option 1: Local Development

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env

# Run backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at `http://localhost:8000`

#### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create environment file
copy .env.local.example .env.local

# Run development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### Option 2: Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access the application:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

---

## 🌐 Supported Languages

| Language | Code | Native Name |
|----------|------|-------------|
| English | `en` | English |
| Hindi | `hi` | हिंदी |
| Bengali | `bn` | বাংলা |
| Telugu | `te` | తెలుగు |
| Tamil | `ta` | தமிழ் |
| Marathi | `mr` | मराठी |
| Gujarati | `gu` | ગુજરાતી |
| Kannada | `kn` | ಕನ್ನಡ |
| Malayalam | `ml` | മലയാളം |
| Punjabi | `pa` | ਪੰਜਾਬੀ |

**Note:** These are the ONLY supported languages. The system will reject any other language code.

---

## 🔌 API Reference

### Backend Endpoints

#### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "supported_languages": ["en", "hi", "bn", ...]
}
```

#### Get Languages
```
GET /api/languages
```

Response:
```json
{
  "languages": [
    {"code": "en", "name": "English"},
    {"code": "hi", "name": "हिंदी (Hindi)"}
  ]
}
```

#### Send Chat Message
```
POST /api/chat
```

Request:
```json
{
  "message": "What is the best time to plant rice?",
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
  "response": "The best time to plant rice...",
  "language": "en",
  "success": true
}
```

---

## 📱 PWA Installation

### Android
1. Open the app in Chrome
2. Tap the menu (⋮)
3. Select "Install app" or "Add to Home screen"

### iOS
1. Open the app in Safari
2. Tap the share button
3. Select "Add to Home Screen"

---

## 🔒 Production Deployment

### SSL Certificate Setup

```bash
# Install Certbot
sudo apt-get install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d kissan.ai -d www.kissan.ai

# Copy certificates to nginx/ssl/
cp /etc/letsencrypt/live/kissan.ai/fullchain.pem nginx/ssl/certificate.crt
cp /etc/letsencrypt/live/kissan.ai/privkey.pem nginx/ssl/private.key
```

### Environment Variables

#### Backend (.env)
```bash
AGENT_WS_URL=wss://agent.kissan.ai/ws
WS_TIMEOUT=30
WS_MAX_RETRIES=3
HOST=0.0.0.0
PORT=8000
CORS_ORIGINS=https://kissan.ai,https://www.kissan.ai
LOG_LEVEL=INFO
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=https://kissan.ai
```

### Deploy to Production

```bash
# Build and deploy
docker-compose -f docker-compose.yml up -d --build

# Enable auto-restart
docker update --restart unless-stopped kissan-ai-frontend
docker update --restart unless-stopped kissan-ai-backend
docker update --restart unless-stopped kissan-ai-nginx
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm run test
```

### API Testing
```bash
# Health check
curl http://localhost:8000/api/health

# Send chat message
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello",
    "language": "en"
  }'
```

---

## 📊 Monitoring & Logs

```bash
# View all logs
docker-compose logs -f

# Backend logs only
docker-compose logs -f backend

# Frontend logs only
docker-compose logs -f frontend

# Nginx logs
docker-compose logs -f nginx
```

---

## 🛡️ Security Features

- ✅ HTTPS/TLS encryption
- ✅ CORS protection
- ✅ Rate limiting (10 req/s for API, 30 req/s general)
- ✅ Input validation
- ✅ SQL injection protection (Pydantic models)
- ✅ XSS protection headers
- ✅ Secure WebSocket connections

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is proprietary and confidential.

---

## 👥 Team

Built with ❤️ for Indian farmers

---

## 📞 Support

For issues and questions:
- 📧 Email: support@kissan.ai
- 🐛 Issues: GitHub Issues
- 📖 Docs: [Documentation](./docs)

---

## 🗺️ Roadmap

- [x] Core Chat Interface
- [x] 10 Language Support
- [x] WebSocket Integration
- [x] Location Context
- [x] PWA Support
- [ ] Voice Input (Speech-to-Text)
- [ ] Voice Output (Text-to-Speech)
- [ ] Image Analysis (Crop Disease Detection)
- [ ] Weather Integration
- [ ] Market Price Data
- [ ] Offline Mode
- [ ] Analytics Dashboard

---

**Made in India 🇮🇳 | For Farmers, By Developers**

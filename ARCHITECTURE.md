# 🏛️ Kissan AI - System Architecture

This document describes the complete system architecture, data flows, and design decisions for Kissan AI.

---

## 🎯 Architecture Overview

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         USER DEVICES                            │
│  Mobile Browsers │ Desktop Browsers │ PWA (Installed App)       │
└────────────────┬───────────────────────────────────────────────┘
                 │
                 │ HTTPS/SSL
                 │
┌────────────────▼───────────────────────────────────────────────┐
│                        NGINX LAYER                              │
│  • SSL Termination     • Rate Limiting    • Load Balancing     │
│  • Security Headers    • Gzip             • Caching            │
└────────────┬──────────────────────────┬────────────────────────┘
             │                          │
             │ Port 3000                │ Port 8000
             │                          │
┌────────────▼──────────┐  ┌────────────▼──────────────────────┐
│   FRONTEND LAYER      │  │      BACKEND LAYER                 │
│   Next.js 14          │  │      FastAPI                       │
│   • App Router        │  │      • REST API                    │
│   • React 18          │  │      • Input Validation            │
│   • TypeScript        │  │      • Language Validation         │
│   • TailwindCSS       │  │      • WebSocket Proxy             │
│   • PWA Support       │  │      • Error Handling              │
└───────────────────────┘  └────────────┬───────────────────────┘
                                        │
                                        │ WebSocket
                                        │
                           ┌────────────▼───────────────┐
                           │   AI AGENT SERVICE         │
                           │   wss://agent.kissan.ai/ws │
                           │   • Stream Processing      │
                           │   • NLP & ML Models        │
                           │   • Multi-language Support │
                           └────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### 1. User Query Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Enters message in InputBar
     ▼
┌─────────────────┐
│  ChatWindow     │
│  (React State)  │
└────┬────────────┘
     │ 2. Call handleSendMessage()
     │    - Add user message to UI
     │    - Get location (if allowed)
     ▼
┌─────────────────┐
│  API Client     │
│  (utils/api.ts) │
└────┬────────────┘
     │ 3. POST /api/chat
     │    {message, language, location}
     ▼
┌─────────────────────┐
│  Backend FastAPI    │
│  (main.py)          │
└────┬────────────────┘
     │ 4. Validate language
     │ 5. Open WebSocket connection
     ▼
┌──────────────────────┐
│  WebSocket Client    │
│  (agent_ws.py)       │
└────┬─────────────────┘
     │ 6. Send query payload
     │    {type: "query", message, context}
     ▼
┌──────────────────────┐
│  AI Agent Service    │
│  (External)          │
└────┬─────────────────┘
     │ 7. Stream responses
     │    {type: "stream_chunk", content}
     │    {type: "stream_end", complete_response}
     ▼
┌──────────────────────┐
│  Backend Aggregates  │
│  Response            │
└────┬─────────────────┘
     │ 8. Return complete response
     ▼
┌─────────────────┐
│  Frontend       │
│  Displays       │
│  with Streaming │
│  Effect         │
└─────────────────┘
```

### 2. Language Selection Flow

```
User clicks language button
        ↓
LanguageSelector modal opens
        ↓
User selects language (e.g., "hi")
        ↓
State updated: setCurrentLanguage("hi")
        ↓
localStorage.setItem("kissan_language", "hi")
        ↓
Modal closes
        ↓
All future messages send language="hi"
        ↓
Backend validates language in supported list
        ↓
WebSocket context includes language
```

### 3. Location Context Flow

```
User sends message
        ↓
ChatWindow calls getUserLocation()
        ↓
Browser requests permission (if not granted)
        ↓
If granted:
    navigator.geolocation.getCurrentPosition()
    ↓
    {latitude: X, longitude: Y}
If denied:
    location = null
        ↓
API request includes location (or undefined)
        ↓
Backend forwards to agent in context
```

---

## 📦 Component Architecture

### Backend Components

```
┌──────────────────────────────────────────────────┐
│                  main.py                         │
│  ┌─────────────────────────────────────────┐    │
│  │  FastAPI Application                    │    │
│  │  • CORS Middleware                      │    │
│  │  • Route Handlers                       │    │
│  │  • Lifespan Manager                     │    │
│  └─────────────┬───────────────────────────┘    │
│                │                                 │
│  ┌─────────────▼────────┐  ┌──────────────────┐ │
│  │  services/           │  │  models/         │ │
│  │  ┌────────────────┐  │  │  ┌─────────────┐ │ │
│  │  │ agent_ws.py    │  │  │  │ chat.py     │ │ │
│  │  │ • WS Client    │  │  │  │ • Request   │ │ │
│  │  │ • Auto-retry   │  │  │  │ • Response  │ │ │
│  │  │ • Streaming    │  │  │  │ • Location  │ │ │
│  │  └────────────────┘  │  │  └─────────────┘ │ │
│  │  ┌────────────────┐  │  │                  │ │
│  │  │ language.py    │  │  │                  │ │
│  │  │ • Validation   │  │  │                  │ │
│  │  │ • Constants    │  │  │                  │ │
│  │  └────────────────┘  │  │                  │ │
│  └──────────────────────┘  └──────────────────┘ │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │            config.py                     │   │
│  │  • Environment Variables                 │   │
│  │  • Pydantic Settings                     │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### Frontend Components

```
┌──────────────────────────────────────────────────┐
│                app/page.tsx                      │
│  ┌─────────────────────────────────────────┐    │
│  │  Home Component                        │    │
│  │  • Language State                      │    │
│  │  • Modal State                         │    │
│  │  • LocalStorage Sync                   │    │
│  └─────┬──────────────────────┬───────────┘    │
│        │                      │                 │
│  ┌─────▼────────┐  ┌──────────▼──────────┐     │
│  │ ChatWindow   │  │ LanguageSelector    │     │
│  └─────┬────────┘  └─────────────────────┘     │
│        │                                        │
│  ┌─────▼────────┐  ┌──────────────────┐        │
│  │ InputBar     │  │ MessageBubble    │        │
│  └──────────────┘  └──────────────────┘        │
│                                                 │
│  ┌──────────────────────────────────────┐      │
│  │         utils/                       │      │
│  │  ┌────────┐ ┌──────────┐ ┌────────┐ │      │
│  │  │ api.ts │ │langs.ts  │ │loc.ts  │ │      │
│  │  └────────┘ └──────────┘ └────────┘ │      │
│  └──────────────────────────────────────┘      │
└──────────────────────────────────────────────────┘
```

---

## 🔐 Security Architecture

### 1. Network Security

```
Internet
   ↓
Firewall (UFW)
   ↓ Ports 80, 443 only
SSL/TLS Termination (Nginx)
   ↓ HTTPS enforced
Rate Limiting
   ↓ 10 req/s (API), 30 req/s (general)
Security Headers
   ↓ X-Frame-Options, CSP, etc.
Application Layer (Backend/Frontend)
```

### 2. Input Validation Pipeline

```
User Input
   ↓
Frontend: Basic validation (length, non-empty)
   ↓
Backend: Pydantic model validation
   ↓
  ├─ Message: 1-5000 chars
  ├─ Language: Must be in supported list
  └─ Location: Valid lat/lng ranges
   ↓
Sanitization (Pydantic auto-handles)
   ↓
Safe to process
```

### 3. Language Validation

```
Request received
   ↓
Extract language code
   ↓
validate_language(code)
   ↓
Check against SUPPORTED_LANGUAGES dict
   ↓
If invalid: HTTP 400 + error message
If valid: Continue processing
```

---

## 🚀 Performance Architecture

### 1. Frontend Optimization

```
Build Time:
├─ Code Splitting (Next.js automatic)
├─ Tree Shaking (Webpack)
├─ Minification (Terser)
└─ Image Optimization (Next.js)

Runtime:
├─ Progressive Rendering (streaming text)
├─ useState for local state (no Redux overhead)
├─ useEffect for side effects only
└─ Memoization where needed

Network:
├─ Gzip compression (Nginx)
├─ CDN ready (static assets)
├─ Cache headers (1 year for static)
└─ HTTP/2 (Nginx)
```

### 2. Backend Optimization

```
Server:
├─ Async/await throughout (FastAPI)
├─ Uvicorn ASGI server
├─ Multiple workers in production
└─ Connection pooling (WebSocket reuse)

Data:
├─ Streaming responses (no buffering)
├─ Minimal JSON payloads
└─ Pydantic: Fast validation (Rust core)

Network:
├─ Keep-alive connections
├─ WebSocket reuse
└─ Timeout handling (30s default)
```

### 3. Caching Strategy

```
Browser:
├─ Static assets: 1 year
├─ HTML: No cache
└─ API responses: No cache (real-time)

Server:
├─ Location: 5 min cache (browser)
├─ Language list: Could be cached
└─ Agent responses: No cache (dynamic)
```

---

## 🔄 State Management

### Frontend State

```
Component State (useState):
├─ messages: Message[] (chat history)
├─ isLoading: boolean
├─ currentLanguage: Language
├─ showLanguageSelector: boolean
└─ inputText: string

Persistent State (localStorage):
└─ kissan_language: Language

Server State:
└─ Fetched via API calls (no global store)
```

### Backend State

```
Application State:
├─ FastAPI app instance
└─ Configuration (settings)

Request State:
├─ WebSocket connection (per request)
└─ Streaming chunks (accumulated)

No Persistent State:
└─ Stateless API (horizontal scaling ready)
```

---

## 🌐 Deployment Architecture

### Development

```
Developer Machine:
├─ Backend: Uvicorn (hot reload)
├─ Frontend: Next.js dev server (hot reload)
└─ No Nginx (direct access)
```

### Production

```
Cloud Server (e.g., AWS EC2, DigitalOcean):
└─ Docker Host
    ├─ Container: kissan-ai-nginx
    │   ├─ Expose: 80, 443
    │   └─ Network: kissan-network
    │
    ├─ Container: kissan-ai-frontend
    │   ├─ Expose: 3000 (internal)
    │   └─ Network: kissan-network
    │
    └─ Container: kissan-ai-backend
        ├─ Expose: 8000 (internal)
        └─ Network: kissan-network

External Dependencies:
└─ AI Agent: wss://agent.kissan.ai/ws
```

### Scaling Strategy

```
Horizontal Scaling:
├─ Frontend: Multiple containers behind Nginx
├─ Backend: Multiple workers, multiple containers
└─ Nginx: Load balancer

Vertical Scaling:
├─ Increase container resources
└─ More Uvicorn workers

Database (if added later):
└─ Separate service, replicated
```

---

## 📊 Monitoring Architecture

```
Application Logs:
├─ Backend: Python logging → stdout
├─ Frontend: Console logs
└─ Nginx: Access + Error logs

Docker Logs:
└─ docker compose logs -f

Metrics (future):
├─ Response times
├─ Error rates
├─ WebSocket connection status
└─ Language usage statistics

Health Checks:
├─ /api/health endpoint
├─ Docker healthcheck directives
└─ Automated monitoring script
```

---

## 🔌 API Contract

### Request Schema

```typescript
interface ChatRequest {
  message: string        // 1-5000 chars
  language: Language     // One of 10 supported
  location?: {           // Optional
    latitude: number     // -90 to 90
    longitude: number    // -180 to 180
  }
}
```

### Response Schema

```typescript
interface ChatResponse {
  response: string       // AI generated text
  language: string       // Echo of request language
  success: boolean       // Always true (errors throw)
}
```

### WebSocket Protocol

```typescript
// Client → Agent
{
  type: "query"
  message: string
  stream: true
  context: {
    language: string
    location?: {
      latitude: number
      longitude: number
    }
  }
}

// Agent → Client (streaming)
{
  type: "stream_chunk"
  content: string
}

// Agent → Client (final)
{
  type: "stream_end"
  complete_response: string
}

// Agent → Client (error)
{
  type: "error"
  message: string
}
```

---

## 🎨 UI/UX Architecture

### Design System

```
Colors:
├─ Primary: Green (#16a34a) - Agriculture theme
├─ User Bubble: Primary green
├─ Agent Bubble: White bg, dark text
└─ Background: Light gray (#f9fafb)

Typography:
├─ System fonts (fast loading)
├─ Large sizes (rural readability)
└─ Support for 10 scripts

Layout:
├─ Mobile-first (320px+)
├─ WhatsApp-inspired
└─ Full-height viewport (no scroll)

Interactions:
├─ Streaming text (typewriter effect)
├─ Typing indicator (3 dots)
├─ Language modal (bottom sheet style)
└─ Smooth animations (CSS transitions)
```

---

## 🔧 Error Handling Architecture

### Frontend

```
Try-Catch Blocks:
├─ API calls
├─ Location access
└─ LocalStorage operations

User Feedback:
├─ Error message in chat
├─ Graceful degradation
└─ No crashes (defensive coding)
```

### Backend

```
Exception Handling:
├─ HTTPException for client errors (4xx)
├─ Generic Exception for server errors (5xx)
└─ WebSocket errors → retry with backoff

Logging:
├─ Error level: Full stack trace
├─ Warning level: Recoverable issues
└─ Info level: Normal operations
```

### WebSocket

```
Connection Failures:
├─ Retry 1: After 1 second
├─ Retry 2: After 2 seconds
├─ Retry 3: After 3 seconds
└─ Give up: Raise exception

Timeout Handling:
└─ 30 second default timeout
```

---

## 📱 Progressive Web App (PWA) Architecture

```
Manifest (manifest.json):
├─ Name: "Kissan AI"
├─ Display: "standalone"
├─ Icons: 192x192, 512x512
└─ Theme: Green (#16a34a)

Service Worker:
├─ Generated by next-pwa
├─ Caches static assets
└─ Future: Offline support

Installation:
├─ Android: Chrome prompt
├─ iOS: Safari share menu
└─ Desktop: Browser install button
```

---

## 🌍 Internationalization (i18n) Architecture

```
Language Support:
├─ 10 Indian languages (+ English)
├─ Native script display
└─ RTL not needed (all LTR scripts)

Implementation:
├─ No i18n library (only 10 languages)
├─ Hardcoded translations in components
├─ Language-specific placeholders
└─ Welcome messages per language

Future:
└─ Could add i18next if UI grows
```

---

## 🚦 Future Architecture Considerations

### Voice Support

```
Speech-to-Text:
User speaks → Browser API → Base64 audio → Backend → STT API → Text

Text-to-Speech:
Text response → TTS API → Audio URL → Frontend plays
```

### Offline Mode

```
Service Worker:
├─ Cache chat history
├─ Queue messages
└─ Sync when online
```

### Analytics

```
Events to Track:
├─ Messages sent (by language)
├─ Response times
├─ Error rates
└─ User retention
```

---

## 📐 Design Principles

1. **Simplicity**: Minimal UI, clear purpose
2. **Performance**: Low bandwidth, fast responses
3. **Accessibility**: Large text, clear contrast
4. **Reliability**: Error handling, retries
5. **Scalability**: Stateless, containerized
6. **Security**: Input validation, HTTPS
7. **Maintainability**: Typed, documented, modular

---

**This architecture is production-ready and startup-ready! 🚀**

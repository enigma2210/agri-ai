# Project Structure - Kissan AI

This document provides an overview of the complete project structure.

```
kissan-ai/
│
├── backend/                          # FastAPI Backend
│   ├── services/                     # Business logic services
│   │   ├── __init__.py
│   │   ├── agent_ws.py              # WebSocket client for AI agent
│   │   └── language.py              # Language validation service
│   │
│   ├── models/                       # Pydantic data models
│   │   ├── __init__.py
│   │   └── chat.py                  # Chat request/response models
│   │
│   ├── main.py                       # FastAPI application entry point
│   ├── config.py                     # Configuration management
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Docker image definition
│   ├── .env.example                  # Environment template
│   ├── .gitignore                    # Git ignore rules
│   └── README.md                     # Backend documentation
│
├── frontend/                         # Next.js 14 Frontend
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx               # Root layout with metadata
│   │   ├── page.tsx                 # Home page (main chat)
│   │   └── globals.css              # Global CSS styles
│   │
│   ├── components/                   # React components
│   │   ├── ChatWindow.tsx           # Main chat container
│   │   ├── MessageBubble.tsx        # Individual message display
│   │   ├── InputBar.tsx             # User input component
│   │   ├── LanguageSelector.tsx     # Language picker modal
│   │   └── LoadingStream.tsx        # Loading/typing indicator
│   │
│   ├── utils/                        # Utility functions
│   │   ├── api.ts                   # API client (Axios)
│   │   ├── languages.ts             # Language definitions
│   │   └── location.ts              # Geolocation utilities
│   │
│   ├── public/                       # Static assets
│   │   └── manifest.json            # PWA manifest
│   │
│   ├── package.json                  # Node dependencies
│   ├── tsconfig.json                 # TypeScript config
│   ├── next.config.js                # Next.js configuration
│   ├── tailwind.config.js            # TailwindCSS config
│   ├── postcss.config.js             # PostCSS config
│   ├── Dockerfile                    # Docker image definition
│   ├── .env.local.example            # Environment template
│   ├── .gitignore                    # Git ignore rules
│   └── README.md                     # Frontend documentation
│
├── nginx/                            # Nginx Reverse Proxy
│   ├── nginx.conf                    # Nginx configuration
│   └── ssl/                          # SSL certificates
│       └── README.md                 # SSL setup instructions
│
├── docker-compose.yml                # Docker Compose orchestration
├── .gitignore                        # Root git ignore
├── README.md                         # Main documentation
├── DEPLOYMENT.md                     # Production deployment guide
├── QUICKSTART.md                     # Quick start guide
├── STRUCTURE.md                      # This file
├── setup.sh                          # Setup script (Linux/Mac)
└── setup.bat                         # Setup script (Windows)
```

## Component Descriptions

### Backend (`/backend`)

**Purpose**: Gateway API that proxies requests to the WebSocket AI agent

**Key Files**:
- `main.py`: FastAPI app with all endpoints
- `services/agent_ws.py`: WebSocket client with retry logic
- `services/language.py`: Language validation (10 languages only)
- `models/chat.py`: Request/response schemas
- `config.py`: Environment-based configuration

**Endpoints**:
- `GET /` - Health check
- `GET /api/health` - Detailed health
- `GET /api/languages` - Supported languages
- `POST /api/chat` - Main chat endpoint
- `POST /api/speech-to-text` - Placeholder (future)
- `POST /api/text-to-speech` - Placeholder (future)

### Frontend (`/frontend`)

**Purpose**: Mobile-first PWA chat interface

**Key Files**:
- `app/page.tsx`: Main page with language selector
- `components/ChatWindow.tsx`: Chat logic and state
- `components/MessageBubble.tsx`: WhatsApp-style messages
- `components/InputBar.tsx`: Text input with placeholders
- `components/LanguageSelector.tsx`: Language picker modal
- `utils/api.ts`: Backend API client
- `utils/languages.ts`: Language metadata
- `utils/location.ts`: Geolocation wrapper

**Features**:
- Real-time streaming responses
- 10 language support with native scripts
- Location-aware queries
- PWA installable
- Mobile-optimized UI

### Nginx (`/nginx`)

**Purpose**: Reverse proxy with SSL termination

**Features**:
- HTTPS/SSL support
- Rate limiting (10 req/s API, 30 req/s general)
- Security headers
- Gzip compression
- Static file caching
- Load balancing ready

### Docker Setup

**Services**:
1. **backend**: FastAPI on port 8000
2. **frontend**: Next.js on port 3000
3. **nginx**: Reverse proxy on ports 80/443

**Network**: `kissan-network` (bridge)

**Volumes**: SSL certificates mounted to nginx

## Data Flow

```
User Browser
    ↓
Nginx (SSL/TLS, Rate Limiting)
    ↓
├─→ Frontend (Next.js) - Static pages, UI
│
├─→ Backend (FastAPI) - /api/* routes
    ↓
    WebSocket Client
        ↓
        AI Agent (wss://agent.kissan.ai/ws)
```

## Technology Decisions

| Component | Technology | Why? |
|-----------|-----------|------|
| Backend Framework | FastAPI | Async, fast, type-safe, auto docs |
| Frontend Framework | Next.js 14 | SSR, App Router, production-ready |
| Styling | TailwindCSS | Utility-first, mobile-first |
| Language | TypeScript | Type safety, better DX |
| WebSocket | websockets | Standard Python library |
| Proxy | Nginx | Industry standard, performant |
| Container | Docker | Portability, consistency |
| PWA | next-pwa | Offline support, installable |
| Validation | Pydantic | Python data validation |
| HTTP Client | Axios | Feature-rich, interceptors |

## File Naming Conventions

- **Backend**: `snake_case.py`
- **Frontend**: `PascalCase.tsx` (components), `camelCase.ts` (utils)
- **Config**: `kebab-case.config.js`
- **Docs**: `UPPERCASE.md`

## Code Organization

### Backend Structure
```
Service Layer (services/)
    ↓
FastAPI Routes (main.py)
    ↓
Pydantic Models (models/)
```

### Frontend Structure
```
Pages (app/)
    ↓
Components (components/)
    ↓
Utilities (utils/)
```

## Environment Variables

### Backend
- `AGENT_WS_URL`: WebSocket agent endpoint
- `WS_TIMEOUT`: Connection timeout
- `WS_MAX_RETRIES`: Retry attempts
- `CORS_ORIGINS`: Allowed origins
- `HOST`, `PORT`: Server config

### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL

## Build Artifacts

**Backend**:
- `__pycache__/`: Python bytecode (ignored)
- `venv/`: Virtual environment (ignored)

**Frontend**:
- `.next/`: Next.js build (ignored)
- `node_modules/`: Dependencies (ignored)
- `out/`: Static export (if used)

**Docker**:
- Images: `kissan-ai-backend`, `kissan-ai-frontend`
- Network: `kissan-network`
- Volumes: `nginx-ssl`

## Port Mapping

| Service | Internal | External |
|---------|----------|----------|
| Frontend | 3000 | 3000 (dev), 80/443 (prod) |
| Backend | 8000 | 8000 (dev), 80/443 (prod) |
| Nginx | 80, 443 | 80, 443 |
| Agent WS | - | wss://agent.kissan.ai/ws |

## File Sizes (Approximate)

- Backend Docker Image: ~500MB
- Frontend Docker Image: ~300MB
- Total Deployment: ~1GB
- Source Code: ~10MB

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| CORS | localhost:3000 | kissan.ai |
| SSL | HTTP | HTTPS |
| Logging | DEBUG | INFO |
| Workers | 1 | 4+ |
| Hot Reload | Yes | No |
| Source Maps | Yes | No |
| Minification | No | Yes |
| PWA | Disabled | Enabled |

---

This structure is designed for:
- ✅ Scalability
- ✅ Maintainability
- ✅ Production readiness
- ✅ Developer experience
- ✅ Security

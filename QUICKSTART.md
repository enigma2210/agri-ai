# Kissan AI - Quick Start Guide

Get started with Kissan AI in 5 minutes!

## Prerequisites

- **Windows**: PowerShell or Command Prompt
- **Linux/Mac**: Terminal
- **Python** 3.11 or higher
- **Node.js** 18 or higher
- **Git** (to clone repository)

## Quick Start

### Option 1: Automated Setup (Recommended)

#### Windows
```cmd
setup.bat
```

#### Linux/Mac
```bash
chmod +x setup.sh
./setup.sh
```

This will:
1. ✅ Check prerequisites
2. ✅ Set up Python virtual environment
3. ✅ Install backend dependencies
4. ✅ Install frontend dependencies
5. ✅ Create environment files

### Option 2: Manual Setup

#### Step 1: Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
copy .env.example .env  # Windows
cp .env.example .env    # Linux/Mac
```

#### Step 2: Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create environment file
copy .env.local.example .env.local  # Windows
cp .env.local.example .env.local    # Linux/Mac
```

## Running the Application

### Terminal 1: Start Backend

```bash
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at:
- App: http://localhost:3000

## Testing the Application

1. Open http://localhost:3000
2. Click the language selector (🇮🇳 EN button)
3. Choose a language
4. Type a farming question
5. Watch the AI respond in real-time!

## Example Questions to Try

- **English**: "What is the best time to plant rice?"
- **हिंदी**: "धान की फसल कब बोनी चाहिए?"
- **বাংলা**: "ধান চাষের সঠিক সময় কখন?"

## Docker Quick Start

If you have Docker installed:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

## Troubleshooting

### Backend Issues

**Error: Module not found**
```bash
# Ensure virtual environment is activated
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Reinstall dependencies
pip install -r requirements.txt
```

**Error: Port 8000 already in use**
```bash
# Change port in command
uvicorn main:app --reload --port 8001
# Update NEXT_PUBLIC_API_URL in frontend/.env.local
```

### Frontend Issues

**Error: Cannot find module**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Error: Connection refused**
- Ensure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`

### Common Issues

**Python command not found**
- Install Python 3.11+ from https://www.python.org/
- Ensure Python is in your PATH

**Node/npm command not found**
- Install Node.js 18+ from https://nodejs.org/
- Restart your terminal after installation

**Permission denied (Linux/Mac)**
```bash
chmod +x setup.sh
```

## Next Steps

1. ✅ Explore all 10 supported languages
2. ✅ Try different farming questions
3. ✅ Test on mobile browser
4. ✅ Install as PWA (Add to Home Screen)
5. ✅ Enable location for better context
6. ✅ Read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup

## Development Tips

### Hot Reload
- Backend: Changes auto-reload with `--reload` flag
- Frontend: Changes auto-reload with `npm run dev`

### View Logs
- Backend: Logs appear in terminal
- Frontend: Check browser console (F12)

### API Testing
```bash
# Health check
curl http://localhost:8000/api/health

# Send message
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","language":"en"}'
```

### Code Changes
- Backend: Edit files in `backend/`
- Frontend: Edit files in `frontend/app/` and `frontend/components/`

## Support

- 📖 Full Documentation: [README.md](README.md)
- 🚀 Deployment Guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- 🐛 Issues: Report via GitHub Issues
- 💬 Questions: Contact support team

---

**Happy Coding! 🌾**

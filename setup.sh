#!/bin/bash
# Quick Start Script for Kissan AI - Linux/Mac
# This script sets up both backend and frontend for local development

set -e

echo "========================================"
echo " Kissan AI - Quick Start Setup"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python is not installed"
    echo "Please install Python 3.11+ from https://www.python.org/"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "[OK] Python and Node.js are installed"
echo ""

# Setup Backend
echo "========================================"
echo " Setting up Backend..."
echo "========================================"
cd backend

echo "Creating Python virtual environment..."
python3 -m venv venv

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Creating .env file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[CREATED] .env file created from .env.example"
else
    echo "[EXISTS] .env file already exists"
fi

echo "Backend setup complete!"
echo ""

# Setup Frontend
echo "========================================"
echo " Setting up Frontend..."
echo "========================================"
cd ../frontend

echo "Installing Node.js dependencies..."
npm install

echo "Creating .env.local file..."
if [ ! -f .env.local ]; then
    cp .env.local.example .env.local
    echo "[CREATED] .env.local file created"
else
    echo "[EXISTS] .env.local file already exists"
fi

echo "Frontend setup complete!"
echo ""

# Go back to root
cd ..

echo "========================================"
echo " Setup Complete!"
echo "========================================"
echo ""
echo "To start the application:"
echo ""
echo "1. Backend (in a new terminal):"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "2. Frontend (in another terminal):"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "Then visit: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "========================================"
echo ""

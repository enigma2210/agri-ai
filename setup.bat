@echo off
REM Quick Start Script for Kissan AI - Windows
REM This script sets up both backend and frontend for local development

echo ========================================
echo  Kissan AI - Quick Start Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://www.python.org/
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Python and Node.js are installed
echo.

REM Setup Backend
echo ========================================
echo  Setting up Backend...
echo ========================================
cd backend

echo Creating Python virtual environment...
python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo Creating .env file...
if not exist .env (
    copy .env.example .env
    echo [CREATED] .env file created from .env.example
) else (
    echo [EXISTS] .env file already exists
)

echo Backend setup complete!
echo.

REM Setup Frontend
echo ========================================
echo  Setting up Frontend...
echo ========================================
cd ..\frontend

echo Installing Node.js dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install npm dependencies
    pause
    exit /b 1
)

echo Creating .env.local file...
if not exist .env.local (
    copy .env.local.example .env.local
    echo [CREATED] .env.local file created
) else (
    echo [EXISTS] .env.local file already exists
)

echo Frontend setup complete!
echo.

REM Go back to root
cd ..

echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo To start the application:
echo.
echo 1. Backend (in a new terminal):
echo    cd backend
echo    venv\Scripts\activate
echo    uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo.
echo 2. Frontend (in another terminal):
echo    cd frontend
echo    npm run dev
echo.
echo Then visit: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo ========================================
echo.

pause

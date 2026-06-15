@echo off
REM ── FairLens AI Backend — Windows Startup Script ─────────────────────────
echo Starting FairLens AI Backend...

REM Check Python
where python >nul 2>&1
if errorlevel 1 (
    echo Python not found. Please install Python 3.11+
    pause
    exit /b 1
)

REM Create venv if not exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate venv
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Copy .env if not exists
if not exist ".env" (
    copy .env.example .env
    echo Created .env from template. Please edit .env and add your API keys.
    notepad .env
)

REM Start server
echo.
echo =========================================
echo  FairLens AI Backend running at:
echo  http://localhost:8000
echo  API Docs: http://localhost:8000/api/docs
echo =========================================
echo.
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

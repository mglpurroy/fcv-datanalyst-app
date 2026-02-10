@echo off
echo ================================================
echo Starting FCV Data Analyst - Full Application
echo ================================================
echo.
echo This will open two terminal windows:
echo   1. Backend (FastAPI) - http://localhost:8000
echo   2. Frontend (Angular) - http://localhost:4200
echo.
echo Wait for both to start, then open http://localhost:4200 in your browser
echo.
pause

start "FCV Backend" "%~dp0START_BACKEND.bat"
timeout /t 3 /nobreak >nul
start "FCV Frontend" "%~dp0START_FRONTEND.bat"

echo.
echo Both servers are starting in separate windows...
echo Once ready, open your browser to: http://localhost:4200
echo.
pause

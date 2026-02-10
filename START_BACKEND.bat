@echo off
echo ================================================
echo Starting FCV Data Analyst - FastAPI Backend
echo ================================================
echo.

cd /d "%~dp0backend"

echo Freeing port 8000 if in use...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 echo Killed process %%a on port 8000
)
echo.

echo Installing Python dependencies (first time)...
C:\Users\wb617270\AppData\Local\r-miniconda\python.exe -m pip install -r requirements.txt
echo.

echo Starting backend server...
echo Backend will be available at: http://localhost:8000
echo API documentation at: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

C:\Users\wb617270\AppData\Local\r-miniconda\python.exe main.py

pause

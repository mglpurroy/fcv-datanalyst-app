@echo off
echo ================================================
echo Killing process on port 8000
echo ================================================
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do (
    echo Found process %%a on port 8000
    taskkill /PID %%a /F
    echo Process killed
)

echo.
echo Done! You can now start the backend.
pause

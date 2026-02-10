@echo off
echo ================================================
echo Starting FCV Data Analyst - Angular Frontend
echo ================================================
echo.

cd /d "%~dp0angular-app"

echo Installing Node dependencies (first time - may take a few minutes)...
call npm install
echo.

echo Starting frontend server...
echo Frontend will be available at: http://localhost:4200
echo.
echo Press Ctrl+C to stop the server
echo.

call npm start

pause

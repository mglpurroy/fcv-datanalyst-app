@echo off
echo ================================================
echo Killing process on port 4200 (Angular dev server)
echo ================================================
echo.

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4200') do (
    echo Found process %%a on port 4200
    taskkill /PID %%a /F
    echo Process killed
)

echo.
echo Done! You can now run npm start in angular-app.
pause

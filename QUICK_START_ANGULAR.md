# Quick Start Guide - Angular FCV Data Analyst

Get the Angular version of the FCV Data Analyst chatbot running in 5 minutes.

## Prerequisites

Install these if you don't have them:
- **Python 3.8+**: Download from [python.org](https://www.python.org/downloads/)
- **Node.js 18+**: Download from [nodejs.org](https://nodejs.org/)

## Step 1: Start the Backend (2 minutes)

Open a terminal/command prompt:

```bash
# Navigate to the backend directory
cd streamlit-deploy/backend

# Install Python dependencies (first time only)
pip install -r requirements.txt

# Start the backend server
python main.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

✅ Backend is ready at `http://localhost:8000`

**Keep this terminal open!**

## Step 2: Start the Frontend (2 minutes)

Open a **NEW** terminal/command prompt:

```bash
# Navigate to the Angular app directory
cd streamlit-deploy/angular-app

# Install Node dependencies (first time only - may take 2-3 minutes)
npm install

# Start the development server
npm start
```

You should see:
```
✔ Browser application bundle generation complete.
** Angular Live Development Server is listening on localhost:4200
```

✅ Frontend is ready at `http://localhost:4200`

## Step 3: Use the App (1 minute)

1. Open your browser to `http://localhost:4200`

2. **Upload Data** (left sidebar):
   - Click "File Upload" tab
   - Choose a CSV file, or
   - Click "URL" tab and paste a CSV URL
   - Click "Upload" or "Load Data"

3. **Configure API** (left sidebar):
   - Select your API provider (OpenAI, Anthropic, or Azure)
   - Enter your API key
   - Click "Save Configuration"

4. **Ask Questions**:
   - Type in the chat input at the bottom
   - Example: "Show me trends in fatalities over time"
   - Press Enter or click Send

5. **View Results**:
   - See generated code
   - View analysis output
   - Explore charts
   - Read AI-generated narratives

## That's It! 🎉

You're now running the Angular version of the FCV Data Analyst chatbot.

## Common Issues

### Backend won't start

**Error**: `ModuleNotFoundError`
**Fix**: 
```bash
cd backend
pip install -r requirements.txt
```

### Frontend won't start

**Error**: `npm: command not found`
**Fix**: Install Node.js from [nodejs.org](https://nodejs.org/)

**Error**: Dependency issues
**Fix**:
```bash
cd angular-app
rm -rf node_modules
npm install
```

### Can't connect to backend

**Error**: "Connection refused" or CORS error
**Fix**: 
1. Make sure backend is running (check terminal)
2. Backend should show: `Uvicorn running on http://0.0.0.0:8000`
3. Try restarting both servers

### Charts not showing

**Fix**: Refresh the browser page (Ctrl+F5 or Cmd+Shift+R)

## What's Next?

- 📖 Read [README_ANGULAR.md](README_ANGULAR.md) for full documentation
- 🚀 Check [ANGULAR_MIGRATION_GUIDE.md](ANGULAR_MIGRATION_GUIDE.md) for deployment
- 🔧 Review [backend/README.md](backend/README.md) for API details
- 💻 Explore [angular-app/README.md](angular-app/README.md) for frontend info

## Need Help?

1. Check the API documentation: `http://localhost:8000/docs`
2. Look at browser console (F12 → Console tab)
3. Check backend terminal for error messages
4. Review the troubleshooting sections in the README files

## Stopping the Servers

To stop the servers:
1. Go to each terminal window
2. Press `Ctrl+C` (Windows/Linux) or `Cmd+C` (Mac)

## API Keys

Get your API keys from:
- **OpenAI**: [platform.openai.com](https://platform.openai.com/api-keys)
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com/)
- **Azure**: Contact your Azure admin (for ITSAI Platform)

---

**Enjoy analyzing FCV data with AI! 🌍✨**

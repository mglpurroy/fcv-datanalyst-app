# 📦 Packaging Instructions

## Create Zip File

### Option 1: Run Python Script
```bash
python create_zip.py
```

### Option 2: Manual Zip
Manually zip these items:
- `backend/` folder
- `angular-app/` folder  
- `START_BACKEND.bat`
- `START_FRONTEND.bat`
- `START_BOTH.bat`
- `KILL_PORT_4200.bat`
- `QUICK_START_ANGULAR.md`
- `README_ANGULAR.md`
- `TEST_PROMPTS.md`
- `SQL_DATABASE_GUIDE.md`
- `SHARED_PACKAGE_UPDATE_GUIDE.md`

The zip will be created as `FCV-Data-Analyst-App.zip` in your **Documents folder** (`%USERPROFILE%\Documents`).

---

## 📋 What's Included

✅ **Backend** - FastAPI server with LLM integration  
✅ **Frontend** - Angular 17 application  
✅ **Startup Scripts** - Easy launch for Windows  
✅ **Documentation** - Quick start guides

---

## 🚀 For Recipients

1. Extract the zip file
2. Follow `QUICK_START_ANGULAR.md`
3. Run `START_BOTH.bat` to start both servers

**If you received an older zip and need to apply the latest updates** (Data Chatbot naming, out-of-scope handling, default Claude, Plotly annotation fix, sidebar purpose text, pre-loaded data wording, UI enhancements such as collapsed sections and copy/download), see **`SHARED_PACKAGE_UPDATE_GUIDE.md`** for step-by-step instructions.

**For developers:** If the frontend fails to start (e.g. `ng` not recognized, port 4200 in use, or `npm install` fails), see the “Running the frontend” and “Angular compile fix” sections in `SHARED_PACKAGE_UPDATE_GUIDE.md`. Use `KILL_PORT_4200.bat` to free port 4200.

# Running the app from Documents (one place)

The app can be **centralized in Documents** so you edit in the repo and run from one folder.

## One-time setup

1. From the repo `streamlit-deploy` folder, run:
   ```bash
   python sync_app_to_documents.py
   ```
   Or double-click **SYNC_APP_TO_DOCUMENTS.bat**.

2. This creates/updates **`Documents\FCV-Data-Analyst-App`** with:
   - `backend/`
   - `angular-app/` (no `node_modules` – preserved if already there)
   - `START_BACKEND.bat`, `START_FRONTEND.bat`, `START_BOTH.bat`
   - `KILL_PORT_4200.bat`, `KILL_PORT_8000.bat`
   - Quick start and other docs

3. **First time only:** In `Documents\FCV-Data-Analyst-App\angular-app`, run:
   ```bash
   npm install
   ```

## Daily workflow

- **Edit** code in the repo (`streamlit-deploy` in OneDrive).
- **Sync** to Documents when you want to run the latest version:
  ```bash
  python sync_app_to_documents.py
  ```
  or run **SYNC_APP_TO_DOCUMENTS.bat**.
- **Run** the app from Documents:
  - Open `Documents\FCV-Data-Analyst-App`
  - Double-click **START_BOTH.bat** (or run START_BACKEND.bat and START_FRONTEND.bat in two terminals).

Backend runs from `Documents\FCV-Data-Analyst-App\backend`, frontend from `Documents\FCV-Data-Analyst-App\angular-app`. No need to run anything from the OneDrive path.

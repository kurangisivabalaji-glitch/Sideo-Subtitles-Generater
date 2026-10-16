@echo off
title Universal AI Video Subtitle Generator
echo =======================================================
echo    Universal AI Video Subtitle Generator Studio
echo =======================================================
echo.

REM Set paths for Python and Node
set "PATH=C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.20.0-win-x64;C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin;C:\Users\Admin\AppData\Local\Programs\Python\Python310;C:\Users\Admin\AppData\Local\Programs\Python\Python310\Scripts;%PATH%"
set "PYTHONPATH=%~dp0backend"

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Backend - FastAPI" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Vite React Frontend on http://localhost:5173 ...
start "Frontend - Vite React" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo =======================================================
echo    Application is launching!
echo    Frontend: http://localhost:5173
echo    Backend API: http://127.0.0.1:8000/docs
echo =======================================================
echo.
timeout /t 3 >nul
start http://localhost:5173
pause

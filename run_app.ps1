# Universal AI Video Subtitle Generator - PowerShell Launcher
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   Universal AI Video Subtitle Generator Studio" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Set environment PATH
$nodeDir = "C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.20.0-win-x64"
$ffmpegDir = "C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin"
$pyDir = "C:\Users\Admin\AppData\Local\Programs\Python\Python310"
$env:Path = "$nodeDir;$ffmpegDir;$pyDir;$pyDir\Scripts;$env:Path"
$env:PYTHONPATH = "$baseDir\backend"

Write-Host "[1/2] Starting Backend (FastAPI) on http://127.0.0.1:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\backend'; `$env:PYTHONPATH = '$baseDir\backend'; `$env:Path = '$nodeDir;$ffmpegDir;$pyDir;$pyDir\Scripts;' + `$env:Path; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Frontend (Vite React) on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir\frontend'; `$env:Path = '$nodeDir;$ffmpegDir;$pyDir;$pyDir\Scripts;' + `$env:Path; npm run dev"

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Studio running! Open http://localhost:5173 in your browser." -ForegroundColor Cyan

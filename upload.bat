@echo off
setlocal
cd /d "%~dp0"
echo ===================================================
echo   River of Life - Push Updates to GitHub
echo ===================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0upload.ps1"
echo.
pause

@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-installer-zip.ps1" %*
exit /b %errorlevel%

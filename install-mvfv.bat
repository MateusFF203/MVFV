@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-mvfv.ps1" %*
exit /b %errorlevel%

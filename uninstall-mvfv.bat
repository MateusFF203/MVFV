@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall-mvfv.ps1" %*
exit /b %errorlevel%

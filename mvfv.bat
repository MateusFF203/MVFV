@echo off
setlocal

where node >nul 2>nul
if errorlevel 1 (
    echo [MVFV] Node.js not found in PATH.
    echo [MVFV] Install Node.js from https://nodejs.org and try again.
    exit /b 1
)

set "MVFV_JS=%~dp0mvfv.js"

if not exist "%MVFV_JS%" (
    echo [MVFV] Executor not found: %MVFV_JS%
    exit /b 1
)

node "%MVFV_JS%" %*
exit /b %errorlevel%

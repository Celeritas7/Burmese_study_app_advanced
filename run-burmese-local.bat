@echo off
setlocal enabledelayedexpansion
title Burmese Study - local server
cd /d "%~dp0"

set "PORT=8092"

echo.
echo   Burmese Study - local server
echo   folder: %cd%
echo.

REM --- find the entry page ---
set "PAGE="
if exist "index.html" set "PAGE=index.html"
if not defined PAGE if exist "study.html" set "PAGE=study.html"
if not defined PAGE (
  for %%F in (*.html) do if not defined PAGE set "PAGE=%%F"
)
if not defined PAGE (
  echo   [X] No .html file found here. Put this .bat in the app root folder.
  echo.
  pause
  exit /b 1
)
echo   entry page: %PAGE%

REM --- find a working Python ---
set "PY="
python -c "import sys" >nul 2>&1 && set "PY=python"
if not defined PY ( py -c "import sys" >nul 2>&1 && set "PY=py" )
if not defined PY ( python3 -c "import sys" >nul 2>&1 && set "PY=python3" )

if defined PY (
  echo   Python found: %PY%
  echo   Starting server on port %PORT% ...
  echo.
  REM open the browser a few seconds AFTER the server starts
  start "" cmd /c "timeout /t 3 >nul & start """" ""http://localhost:%PORT%/%PAGE%"""
  echo   KEEP THIS WINDOW OPEN. Close it to stop the server.
  echo   ------------------------------------------------------------
  %PY% -m http.server %PORT%
  echo   ------------------------------------------------------------
  echo.
  echo   Server stopped ^(or failed to start - read any error above^).
  echo.
  pause
  exit /b 0
)

REM --- fall back to Node ---
where npx >nul 2>&1
if %errorlevel%==0 (
  echo   Python not usable - using Node instead.
  echo.
  start "" cmd /c "timeout /t 5 >nul & start """" ""http://localhost:%PORT%/%PAGE%"""
  echo   KEEP THIS WINDOW OPEN. Close it to stop the server.
  echo   ------------------------------------------------------------
  npx --yes serve -l %PORT% .
  echo   ------------------------------------------------------------
  echo.
  pause
  exit /b 0
)

echo   [X] Neither Python nor Node is available on PATH.
echo.
echo   Install Python: https://www.python.org/downloads/
echo   On the first install screen, tick "Add python.exe to PATH".
echo.
pause
exit /b 1

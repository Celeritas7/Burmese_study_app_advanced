@echo off
title Burmese Study - generate Speak audio
cd /d "%~dp0"

set "PY="
python -c "import sys" >nul 2>&1 && set "PY=python"
if not defined PY ( py -c "import sys" >nul 2>&1 && set "PY=py" )
if not defined PY ( python3 -c "import sys" >nul 2>&1 && set "PY=python3" )
if not defined PY (
  echo   [X] Python not found. Install it from https://www.python.org/downloads/
  pause
  exit /b 1
)

if not defined AZURE_SPEECH_KEY ( echo   [X] Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first. & pause & exit /b 1 )
echo.
%PY% tools\gen_speak_audio.py %*
echo.
echo   Next: git add audio ^&^& git commit -m "Speak audio" ^&^& git push
pause

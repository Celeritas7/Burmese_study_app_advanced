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

echo   Installing edge-tts ...
%PY% -m pip install --quiet --upgrade edge-tts
echo.
%PY% tools\gen_speak_audio.py %*
echo.
echo   Next: git add audio ^&^& git commit -m "Speak audio" ^&^& git push
pause

@echo off
title Burmese Study - generate app audio (Phase 12)
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
if not defined SUPABASE_SERVICE_KEY ( echo   [X] Set SUPABASE_SERVICE_KEY first ^(Supabase - Project Settings - API - service_role^). & pause & exit /b 1 )
echo.
node tools\app-audio-list.mjs || ( pause & exit /b 1 )
echo.
%PY% tools\gen_app_audio.py %*
echo.
echo   Next: git add audio/app/texts.json audio/app/clips.json ^&^& git commit -m "App audio" ^&^& git push
pause

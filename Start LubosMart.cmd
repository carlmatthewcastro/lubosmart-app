@echo off
setlocal
title LubosMart Local Development
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1"
if errorlevel 1 pause
endlocal

@echo off
cd /d "%~dp0"
node build.js
if errorlevel 1 pause

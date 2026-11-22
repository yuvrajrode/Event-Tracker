@echo off
title Gather
set "APP_URL=file:///%~dp0index.html"
set "APP_URL=%APP_URL:\=/%"

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="%APP_URL%" --window-size=1280,820
    exit /b
)
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%" --window-size=1280,820
    exit /b
)
start "" "%~dp0index.html"

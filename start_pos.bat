@echo off
title Villa 30 POS System
echo ==============================================
echo       Starting Villa 30 POS System...
echo ==============================================
echo.

:: Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed on this PC!
    echo Please install Node.js from https://nodejs.org/ to run this system.
    echo Press any key to exit...
    pause >nul
    exit /b
)

:: Wait for a second and then open the browser
echo System is booting up... The browser will open automatically.
start http://localhost:5173/

:: Start the Vite development server
npm run dev

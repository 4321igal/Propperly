@echo off
where code >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: VS Code CLI not found.
    echo Open VS Code and run:
    echo View -> Command Palette -> Install 'code' command in PATH
    pause
    exit /b 1
)

echo Opening VS Code...
code .

@ECHO off
CALL node --version
IF %errorlevel% NEQ 0 (
    ECHO Node is not installed.  Get it and install it from https://nodejs.org/en/download.
    CHOICE /n /m "Open in browser? [Y] or [N]"
    IF errorlevel 2 ( EXIT /B 1 )
    IF errorlevel 1 ( explorer.exe https://nodejs.org/en/download )
    EXIT /B 1
)

node -r babel-register server/app.js
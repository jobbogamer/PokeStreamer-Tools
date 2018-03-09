@ECHO off
SETLOCAL EnableDelayedExpansion

REM Check if we need to install node modules
IF NOT EXIST "node_modules" (
    ECHO The node_modules directory does not exist.  Installing.
    SET install=true
) ELSE IF "%~1"=="-i" (
    SET install=true
) ELSE IF "%~1"=="--install" (
    SET install=true
) ELSE (
    CALL .\node_modules\.bin\webpack --version > NUL
    IF %errorlevel% NEQ 0 (
        ECHO Webpack is not installed.  Installing.
        SET install=true
    )
)
IF "%install%"=="true" ( 
    CALL npm --version > NUL
    IF %errorlevel% NEQ 0 (
        ECHO NPM is not installed.  Install node from https://nodejs.org/en/download.
        CHOICE /n /m "Open in browser? [Y] or [N]"
        IF errorlevel 2 ( EXIT /B 1 )
        IF errorlevel 1 ( explorer.exe https://nodejs.org/en/download )
        EXIT /B 1
    )

    npm install --save
    IF %errorlevel% NEQ 0 (
        ECHO Installation failed.  May the force be with you in your troubleshooting!
        EXIT /B 1
    )
)

REM Run webpack to build app
ECHO Building...
npm run build
IF %errorlevel% NEQ 0 (
    ECHO Build failed.  Run %~f0 --install if you have not already.  Otherwise, may the force be with you in your troubleshooting!
    EXIT /B 1
)
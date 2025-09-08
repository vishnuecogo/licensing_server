@echo off
REM =============================================================================
REM EVACHATBOT LICENSING SERVER - DEPLOYMENT SCRIPT (Windows)
REM =============================================================================
REM This script helps you deploy the licensing server with different configurations

setlocal enabledelayedexpansion

REM Function to show usage
if "%1"=="-h" goto :show_usage
if "%1"=="--help" goto :show_usage
if "%1"=="/?" goto :show_usage

REM Set default values
set ENVIRONMENT=%1
set ACTION=%2
if "%ENVIRONMENT%"=="" set ENVIRONMENT=local
if "%ACTION%"=="" set ACTION=up

echo [INFO] Evachatbot Licensing Server Deployment
echo [INFO] Environment: %ENVIRONMENT%
echo [INFO] Action: %ACTION%
echo.

REM Setup environment
call :setup_environment %ENVIRONMENT%
if errorlevel 1 exit /b 1

REM Perform action
call :perform_action %ACTION%
if errorlevel 1 exit /b 1

REM Show final status for up/build actions
if "%ACTION%"=="up" goto :show_final_status
if "%ACTION%"=="build" goto :show_final_status
if "%ACTION%"=="restart" goto :show_final_status
goto :end

:show_final_status
echo.
echo [INFO] Final service status:
docker-compose ps
echo.

REM Load environment variables to show access URLs
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="HOST_IP" set HOST_IP=%%b
    if "%%a"=="FRONTEND_PORT" set FRONTEND_PORT=%%b
    if "%%a"=="BACKEND_PORT" set BACKEND_PORT=%%b
    if "%%a"=="DATABASE_PORT" set DATABASE_PORT=%%b
)

echo [SUCCESS] Deployment complete!
echo.
echo Access URLs:
echo   Frontend:  http://%HOST_IP%:%FRONTEND_PORT%
echo   Backend:   http://%HOST_IP%:%BACKEND_PORT%
echo   API Docs:  http://%HOST_IP%:%BACKEND_PORT%/docs
echo   Database:  %HOST_IP%:%DATABASE_PORT%
echo.
echo Admin Login:
echo   Email:     admin@eva.local
echo   Password:  admin123
goto :end

:setup_environment
if "%1"=="local" (
    if exist ".env.local" (
        copy .env.local .env >nul
        echo [SUCCESS] Using local development environment
    ) else (
        echo [ERROR] .env.local file not found!
        exit /b 1
    )
) else if "%1"=="server" (
    if exist ".env.server" (
        copy .env.server .env >nul
        echo [SUCCESS] Using server deployment environment
        echo [WARNING] Make sure to update HOST_IP and SECRET_KEY in .env.server!
    ) else (
        echo [ERROR] .env.server file not found!
        exit /b 1
    )
) else if "%1"=="server2" (
    if exist ".env.server2" (
        copy .env.server2 .env >nul
        echo [SUCCESS] Using second server deployment environment
        echo [WARNING] Make sure to update HOST_IP and SECRET_KEY in .env.server2!
    ) else (
        echo [ERROR] .env.server2 file not found!
        exit /b 1
    )
) else if "%1"=="custom" (
    if exist ".env" (
        echo [SUCCESS] Using existing .env file
    ) else (
        echo [ERROR] .env file not found! Create one or use another environment.
        exit /b 1
    )
) else (
    echo [ERROR] Unknown environment: %1
    goto :show_usage
    exit /b 1
)
exit /b 0

:perform_action
if "%1"=="up" (
    echo [INFO] Starting services...
    docker-compose up -d
    echo [SUCCESS] Services started!
) else if "%1"=="down" (
    echo [INFO] Stopping services...
    docker-compose down
    echo [SUCCESS] Services stopped!
) else if "%1"=="restart" (
    echo [INFO] Restarting services...
    docker-compose down
    docker-compose up -d
    echo [SUCCESS] Services restarted!
) else if "%1"=="logs" (
    echo [INFO] Showing logs...
    docker-compose logs -f
) else if "%1"=="status" (
    echo [INFO] Service status:
    docker-compose ps
) else if "%1"=="build" (
    echo [INFO] Building and starting services...
    docker-compose up --build -d
    echo [SUCCESS] Services built and started!
) else (
    echo [ERROR] Unknown action: %1
    goto :show_usage
    exit /b 1
)
exit /b 0

:show_usage
echo Usage: %0 [ENVIRONMENT] [ACTION]
echo.
echo ENVIRONMENTS:
echo   local     - Deploy for local development (localhost)
echo   server    - Deploy for server (modify .env.server first!)
echo   server2   - Deploy for second server instance
echo   custom    - Use existing .env file
echo.
echo ACTIONS:
echo   up        - Start services (default)
echo   down      - Stop services
echo   restart   - Restart services
echo   logs      - Show logs
echo   status    - Show service status
echo   build     - Build and start services
echo.
echo Examples:
echo   %0 local up          # Start local development
echo   %0 server build      # Build and deploy on server
echo   %0 server2 restart   # Restart second server instance
echo   %0 custom logs       # Show logs using existing .env
exit /b 0

:end

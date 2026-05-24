@echo off
title Smart Energy Hub - Inicializador de Servicios
echo ──────────────────────────────────────────────────────────
echo   ⚡ Smart Energy Hub — Inicializador de Servicios
echo ──────────────────────────────────────────────────────────
echo.

:: Obtener la ruta del directorio donde está el archivo .bat
set BASE_DIR=%~dp0
set HUB_DIR=%BASE_DIR%smart-energy-hub

echo Directorio base detectado: %HUB_DIR%
echo.

:: 0. Copiar el nuevo favicon al directorio public
if exist "%BASE_DIR%copy-favicon.js" (
    echo [0/6] Copiando el nuevo favicon generado...
    node "%BASE_DIR%copy-favicon.js"
)

:: Generar diagramas SVG a partir de los archivos markdown
if exist "%BASE_DIR%generate-svgs.js" (
    echo [*] Generando diagramas SVG del Corte 2...
    node "%BASE_DIR%generate-svgs.js"
)

:: 1. Verificar e instalar dependencias en los microservicios, simulador y frontend
echo [1/6] Verificando dependencias de Ingesta...
if not exist "%HUB_DIR%\services\ingesta\node_modules\" (
    echo Instalando dependencias en Ingesta...
    cmd /c "cd /d "%HUB_DIR%\services\ingesta" && npm install"
) else (
    echo Dependencias ya instaladas.
)

echo [2/6] Verificando dependencias de Analitica...
if not exist "%HUB_DIR%\services\analitica\node_modules\" (
    echo Instalando dependencias en Analitica...
    cmd /c "cd /d "%HUB_DIR%\services\analitica" && npm install"
) else (
    echo Dependencias ya instaladas.
)

echo [3/6] Verificando dependencias de Alertas...
if not exist "%HUB_DIR%\services\alertas\node_modules\" (
    echo Instalando dependencias en Alertas...
    cmd /c "cd /d "%HUB_DIR%\services\alertas" && npm install"
) else (
    echo Dependencias ya instaladas.
)

echo [4/6] Verificando dependencias de API Gateway...
if not exist "%HUB_DIR%\services\api-gateway\node_modules\" (
    echo Instalando dependencias en API Gateway...
    cmd /c "cd /d "%HUB_DIR%\services\api-gateway" && npm install"
) else (
    echo Dependencias ya instaladas.
)

echo [5/6] Verificando dependencias de Simulator...
if not exist "%HUB_DIR%\simulator\node_modules\" (
    echo Instalando dependencias en Simulator...
    cmd /c "cd /d "%HUB_DIR%\simulator" && npm install"
) else (
    echo Dependencias ya instaladas.
)

echo [6/6] Verificando dependencias de Frontend...
if not exist "%HUB_DIR%\frontend\node_modules\" (
    echo Instalando dependencias en Frontend...
    cmd /c "cd /d "%HUB_DIR%\frontend" && npm install"
) else (
    echo Dependencias ya instaladas.
)

echo.
echo ──────────────────────────────────────────────────────────
echo   🚀 Levantando los servicios en segundo plano...
echo ──────────────────────────────────────────────────────────
echo.

:: 2. Levantar el Backend + Simulador usando run-all.js en una nueva ventana
echo Levantando API Gateway, Ingesta, Analitica, Alertas y Simulador...
start "Smart Energy Hub - Backend" cmd /k "cd /d "%HUB_DIR%" && node run-all.js"

:: 3. Levantar el Frontend en otra nueva ventana
echo Levantando Frontend Web...
start "Smart Energy Hub - Frontend" cmd /k "cd /d "%HUB_DIR%\frontend" && npm run dev"

echo.
echo 🏁 ¡Todo listo! Se han abierto las ventanas de los servicios.
echo - Acceso al Frontend: http://localhost:5173
echo.
pause

@echo off
:: Asegurar que nos paramos en la carpeta donde está este archivo .bat
cd /d "%~dp0"

echo ==========================================================
echo   INICIANDO SISTEMA DE GESTION MUNICIPAL (MODO OFFLINE)
echo ==========================================================
echo.

:: Si no existe .env, crearlo desde la plantilla
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" > nul
        echo [OK] Archivo .env creado desde plantilla.
    )
)

echo [1/2] Levantando el servidor local en segundo plano...
:: Lanzamos node de forma directa y minimizada sin anidamientos de comillas raros
start /min node server.js

echo [2/2] Esperando que el servidor inicie...
:: Usamos ping para hacer una espera de 3 segundos compatible con cualquier Windows 7/10
ping 127.0.0.1 -n 4 > nul

echo [Listo] Abriendo el sistema en tu navegador predeterminado...
start http://localhost:3000

exit

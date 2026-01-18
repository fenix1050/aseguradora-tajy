@echo off
echo ========================================
echo Iniciando servidor local...
echo ========================================
echo.
echo El servidor se iniciara en: http://localhost:8000
echo.
echo Presiona Ctrl+C para detener el servidor
echo ========================================
echo.

REM Verificar si Python esta instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python no esta instalado
    echo Por favor instala Python desde https://www.python.org/downloads/
    pause
    exit /b
)

REM Iniciar servidor HTTP simple con Python
cd /d "%~dp0"
python -m http.server 8000

pause

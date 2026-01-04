@echo off
echo ========================================
echo  Iniciando Servidor do Ano 12 Semanas
echo ========================================
echo.
echo O aplicativo abrirá automaticamente no seu navegador.
echo.
echo Acesse: http://localhost:8000
echo ========================================
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

cd /d "%~dp0"
python -m http.server 8000

@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title GTOS — Instalação

echo.
echo  ██████╗ ████████╗ ██████╗ ███████╗
echo ██╔════╝    ██╔══╝██╔═══██╗██╔════╝
echo ██║  ███╗   ██║   ██║   ██║███████╗
echo ██║   ██║   ██║   ██║   ██║╚════██║
echo ╚██████╔╝   ██║   ╚██████╔╝███████║
echo  ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝
echo.
echo  Gestor de Trafego . Sistema Operacional
echo  ----------------------------------------
echo  Instalacao automatica
echo.

:: ── Python ───────────────────────────────────────────────────────────────────
echo [1/4] Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  Python nao encontrado. Baixando instalador...
    echo  Aguarde — isso pode levar alguns minutos.
    echo.

    :: Baixa Python 3.12 via winget (disponivel no Windows 10+)
    winget install --id Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    if %errorlevel% neq 0 (
        echo  winget falhou. Tentando download direto...
        :: Fallback: baixa o instalador via PowerShell
        powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.0/python-3.12.0-amd64.exe' -OutFile '%TEMP%\python-installer.exe'"
        if %errorlevel% neq 0 (
            echo.
            echo  ERRO: Nao foi possivel baixar o Python automaticamente.
            echo  Acesse https://python.org/downloads e instale manualmente.
            echo  Depois execute este script novamente.
            pause
            exit /b 1
        )
        echo  Instalando Python...
        "%TEMP%\python-installer.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_pip=1
        del "%TEMP%\python-installer.exe" >nul 2>&1
    )

    :: Atualiza PATH para esta sessao
    for /f "tokens=*" %%i in ('powershell -Command "[System.Environment]::GetEnvironmentVariable(\"PATH\",\"User\")"') do set "PATH=%%i;%PATH%"

    python --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo  AVISO: Python instalado mas nao detectado ainda.
        echo  Feche este terminal, abra um novo e execute instalar.bat novamente.
        pause
        exit /b 1
    )
    echo  Python instalado com sucesso.
) else (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo  OK: %%v
)

:: ── pip atualizado ────────────────────────────────────────────────────────────
echo.
echo [2/4] Atualizando pip...
python -m pip install --upgrade pip --quiet
echo  OK.

:: ── Node.js / Claude Code ─────────────────────────────────────────────────────
echo.
echo [3/4] Verificando Claude Code...
claude --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  Claude Code nao encontrado. Verificando Node.js...
    node --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo  Node.js nao encontrado. Instalando...
        winget install --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
        if %errorlevel% neq 0 (
            echo.
            echo  ERRO: Nao foi possivel instalar Node.js automaticamente.
            echo  Acesse https://nodejs.org e instale a versao LTS manualmente.
            echo  Depois execute este script novamente.
            pause
            exit /b 1
        )
        for /f "tokens=*" %%i in ('powershell -Command "[System.Environment]::GetEnvironmentVariable(\"PATH\",\"User\")"') do set "PATH=%%i;%PATH%"
    )
    echo  Instalando Claude Code...
    npm install -g @anthropic-ai/claude-code >nul 2>&1
    claude --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo  AVISO: Claude Code instalado. Feche e abra um novo terminal,
        echo  depois execute instalar.bat novamente para continuar.
        pause
        exit /b 1
    )
    echo  Claude Code instalado.
) else (
    for /f "tokens=*" %%v in ('claude --version 2^>^&1') do echo  OK: %%v
)

:: ── Setup GTOS ────────────────────────────────────────────────────────────────
echo.
echo [4/4] Configurando GTOS...
python setup\wizard.py
if %errorlevel% neq 0 (
    echo.
    echo  ERRO durante o setup. Veja as mensagens acima.
    pause
    exit /b 1
)

echo.
echo  Instalacao concluida!
echo  Para iniciar o Jarvis em background:
echo    python scripts\jarvis.py --instalar
echo.
pause

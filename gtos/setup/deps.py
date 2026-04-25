"""
Verifica e instala todas as dependências do GTOS.
Compatível com macOS e Windows.
"""
import sys
import subprocess
import platform
from pathlib import Path

IS_WINDOWS = platform.system() == 'Windows'
IS_MAC     = platform.system() == 'Darwin'

# (import_name, pip_name, obrigatório)
PACKAGES = [
    ('sounddevice', 'sounddevice',  True),
    ('numpy',       'numpy',        True),
    ('soundfile',   'soundfile',    True),
    ('openai',      'openai',       False),   # opcional — só para voz
    ('pyttsx3',     'pyttsx3',      True),    # TTS cross-platform
]

def _pip_install(pkg):
    subprocess.check_call(
        [sys.executable, '-m', 'pip', 'install', '--quiet', pkg],
        stdout=subprocess.DEVNULL if not sys.flags.verbose else None
    )

def check_python():
    v = sys.version_info
    if v < (3, 9):
        print(f"  ❌ Python {v.major}.{v.minor} detectado. GTOS requer Python 3.9+.")
        print(f"     Baixe em: https://python.org/downloads")
        sys.exit(1)
    print(f"  ✅ Python {v.major}.{v.minor}.{v.micro}")

def check_packages():
    ok = True
    for import_name, pip_name, required in PACKAGES:
        try:
            __import__(import_name)
            print(f"  ✅ {pip_name}")
        except ImportError:
            print(f"  📦 Instalando {pip_name}...", end=' ', flush=True)
            try:
                _pip_install(pip_name)
                print("OK")
            except subprocess.CalledProcessError:
                if required:
                    print(f"FALHOU")
                    print(f"     Execute manualmente: pip install {pip_name}")
                    ok = False
                else:
                    print(f"ignorado (opcional)")
    return ok

def check_playwright():
    try:
        import playwright
        # Verifica se o browser está instalado
        result = subprocess.run(
            [sys.executable, '-m', 'playwright', 'install', '--dry-run', 'chromium'],
            capture_output=True, text=True
        )
        if 'chromium' in result.stdout.lower() and 'browser' in result.stdout.lower():
            raise RuntimeError("não instalado")
        print("  ✅ playwright + chromium")
    except (ImportError, RuntimeError, Exception):
        print("  📦 Instalando playwright...", end=' ', flush=True)
        try:
            _pip_install('playwright')
            print("OK")
            print("  📦 Instalando chromium...", end=' ', flush=True)
            subprocess.check_call(
                [sys.executable, '-m', 'playwright', 'install', 'chromium'],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            print("OK")
        except subprocess.CalledProcessError:
            print("FALHOU")
            print("     Execute manualmente: pip install playwright && playwright install chromium")
            return False
    return True

def check_claude_cli():
    cmd = 'claude.cmd' if IS_WINDOWS else 'claude'
    result = subprocess.run(
        [cmd, '--version'],
        capture_output=True, text=True, shell=IS_WINDOWS
    )
    if result.returncode == 0:
        version = result.stdout.strip().split('\n')[0]
        print(f"  ✅ claude CLI ({version})")
        return True
    else:
        print("  ❌ claude CLI não encontrado.")
        if IS_WINDOWS:
            print("     Instale via: npm install -g @anthropic-ai/claude-code")
            print("     (requer Node.js — https://nodejs.org)")
        else:
            print("     Instale via: npm install -g @anthropic-ai/claude-code")
        return False

def run_all(skip_playwright=False):
    """Executa todas as verificações. Retorna True se OK para prosseguir."""
    print("\n  ── VERIFICANDO DEPENDÊNCIAS ─────────────\n")

    check_python()

    pkgs_ok = check_packages()

    if not skip_playwright:
        play_ok = check_playwright()
    else:
        play_ok = True

    claude_ok = check_claude_cli()

    print()

    if not pkgs_ok:
        print("  ⚠️  Algumas dependências falharam na instalação automática.")
        print("     Veja os erros acima e instale manualmente.")
        return False

    if not claude_ok:
        print("  ⚠️  Claude CLI é obrigatório. Instale antes de continuar.")
        return False

    print("  ✅ Ambiente pronto.\n")
    return True


if __name__ == '__main__':
    ok = run_all()
    sys.exit(0 if ok else 1)

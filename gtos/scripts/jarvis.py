"""
Jarvis — Interface de voz para o GTOS.
Compatível com macOS e Windows.

Uso:
  python scripts/jarvis.py --instalar     # instala como serviço (sobe no login)
  python scripts/jarvis.py --desinstalar  # remove o serviço
  python scripts/jarvis.py --status       # verifica se está rodando
  python scripts/jarvis.py --daemon       # modo background (chamado pelo serviço)
  python scripts/jarvis.py --voz          # loop de voz interativo

Dependências:
  pip install sounddevice numpy openai soundfile pyttsx3
"""
import os
import sys
import time
import subprocess
import argparse
import platform
from pathlib import Path

_venv_py = Path(__file__).resolve().parent.parent / '.venv' / (
    'Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
if _venv_py.exists() and os.path.normcase(sys.executable) != os.path.normcase(str(_venv_py)):
    os.execv(str(_venv_py), [str(_venv_py)] + sys.argv)

ROOT       = Path(__file__).resolve().parent.parent
IS_WINDOWS = platform.system() == 'Windows'
IS_MAC     = platform.system() == 'Darwin'

# Labels / nomes do serviço por plataforma
MAC_PLIST_LABEL = 'com.gtos.jarvis'
MAC_PLIST_PATH  = Path.home() / 'Library' / 'LaunchAgents' / f'{MAC_PLIST_LABEL}.plist'
WIN_STARTUP_VBS = Path(os.getenv('APPDATA', '')) / 'Microsoft' / 'Windows' / \
                  'Start Menu' / 'Programs' / 'Startup' / 'gtos-jarvis.vbs'
LOG_PATH = Path('/tmp/gtos-jarvis.log') if not IS_WINDOWS else Path(os.getenv('TEMP', 'C:\\Temp')) / 'gtos-jarvis.log'

def load_env():
    env_file = ROOT / '.env'
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

load_env()

OPENAI_KEY  = os.getenv('OPENAI_API_KEY', '')
OPERADOR    = os.getenv('OPERADOR_NOME', 'chefe')
VOICE_RATE  = 16000
CLAP_THRESH = 0.45
CLAP_WINDOW = 1.5
SILENCE_SEC = 1.8
SILENCE_AMP = 0.02


# ── TTS ──────────────────────────────────────────────────────────────────────

def speak(text: str):
    text = str(text).replace('"', "'")[:500]
    try:
        if IS_MAC:
            subprocess.run(['say', '-v', 'Luciana', '-r', '170', text], check=False)
        else:
            import pyttsx3
            engine = pyttsx3.init()
            # Tenta voz em português se disponível
            voices = engine.getProperty('voices')
            pt_voice = next((v for v in voices if 'pt' in v.id.lower() or 'brazil' in v.name.lower()), None)
            if pt_voice:
                engine.setProperty('voice', pt_voice.id)
            engine.setProperty('rate', 160)
            engine.say(text)
            engine.runAndWait()
    except Exception as e:
        print(f"[TTS erro] {e}", file=sys.stderr)


# ── Abrir projeto ─────────────────────────────────────────────────────────────

def open_project():
    if IS_MAC:
        # Abre Obsidian (retorna à última posição — idealmente o grafo)
        subprocess.Popen(['open', '-a', 'Obsidian'], stderr=subprocess.DEVNULL)

        # Abre Terminal com Claude
        script = (
            'tell application "Terminal" to activate\n'
            f'tell application "Terminal" to do script "cd {ROOT} && claude"'
        )
        subprocess.run(['osascript', '-e', script], check=False)

        # Aguarda Claude iniciar e envia saudação para disparar o boot
        time.sleep(5)
        subprocess.run(['osascript', '-e',
            'tell application "Terminal" to activate\n'
            'tell application "System Events"\n'
            '    keystroke "oi"\n'
            '    key code 36\n'
            'end tell'
        ], check=False)

    elif IS_WINDOWS:
        # Abre Obsidian
        for obs_path in [
            Path(os.getenv('LOCALAPPDATA', '')) / 'Programs' / 'obsidian' / 'Obsidian.exe',
            Path(os.getenv('PROGRAMFILES', 'C:/Program Files')) / 'Obsidian' / 'Obsidian.exe',
        ]:
            if obs_path.exists():
                subprocess.Popen([str(obs_path)])
                break

        # Tenta Windows Terminal primeiro, cai para cmd
        wt = subprocess.run(['where', 'wt'], capture_output=True)
        if wt.returncode == 0:
            subprocess.Popen(f'wt -d "{ROOT}" cmd /k claude', shell=True)
        else:
            subprocess.Popen(f'start cmd /k "cd /d {ROOT} && claude"', shell=True)

        # Envia saudação via SendKeys
        time.sleep(5)
        subprocess.run([
            'powershell', '-Command',
            '[void][reflection.assembly]::LoadWithPartialName("System.Windows.Forms"); '
            '[System.Windows.Forms.SendKeys]::SendWait("oi{ENTER}")'
        ], capture_output=True, shell=True)

    else:  # Linux
        for term in ['gnome-terminal', 'konsole', 'xfce4-terminal', 'xterm']:
            if subprocess.run(['which', term], capture_output=True).returncode == 0:
                subprocess.Popen([term, '--', 'bash', '-c', f'cd "{ROOT}" && claude; exec bash'])
                break


# ── Instalação como serviço ───────────────────────────────────────────────────

MAC_PLIST = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>{label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{python}</string>
        <string>{script}</string>
        <string>--daemon</string>
    </array>
    <key>RunAtLoad</key><true/>
    <key>KeepAlive</key><true/>
    <key>StandardOutPath</key><string>{log}</string>
    <key>StandardErrorPath</key><string>{log}</string>
    <key>WorkingDirectory</key><string>{root}</string>
</dict>
</plist>
"""

# VBS abre o Python em background sem janela de console no Windows
WIN_VBS = 'Set sh = CreateObject("WScript.Shell")\nsh.Run "\\"{python}\\" \\"{script}\\" --daemon", 0, False\n'

def cmd_instalar():
    if IS_MAC:
        _instalar_mac()
    elif IS_WINDOWS:
        _instalar_windows()
    else:
        print("Linux: adicione ao crontab ou systemd manualmente.")
        print(f"  @reboot {sys.executable} {Path(__file__).resolve()} --daemon &")


def _instalar_mac():
    MAC_PLIST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MAC_PLIST_PATH.write_text(MAC_PLIST.format(
        label=MAC_PLIST_LABEL,
        python=sys.executable,
        script=str(Path(__file__).resolve()),
        log=str(LOG_PATH),
        root=str(ROOT),
    ))
    subprocess.run(['launchctl', 'unload', str(MAC_PLIST_PATH)], capture_output=True)
    result = subprocess.run(['launchctl', 'load', str(MAC_PLIST_PATH)], capture_output=True, text=True)
    if result.returncode == 0:
        print("✅ Jarvis instalado como LaunchAgent (macOS).")
        _print_post_install()
    else:
        print(f"❌ Erro: {result.stderr}")


def _instalar_windows():
    WIN_STARTUP_VBS.parent.mkdir(parents=True, exist_ok=True)
    WIN_STARTUP_VBS.write_text(WIN_VBS.format(
        python=str(sys.executable).replace('\\', '\\\\'),
        script=str(Path(__file__).resolve()).replace('\\', '\\\\'),
    ))
    # Inicia imediatamente sem esperar reiniciar
    subprocess.Popen(
        [sys.executable, str(Path(__file__).resolve()), '--daemon'],
        creationflags=0x00000008,  # DETACHED_PROCESS
        close_fds=True
    )
    print("✅ Jarvis instalado na pasta Startup (Windows).")
    _print_post_install()


def _print_post_install():
    print("   Bata 2 palmas a qualquer momento para abrir o GTOS.")
    print(f"   Log: {LOG_PATH}")
    print(f"\n   Para remover: python scripts/jarvis.py --desinstalar")


def cmd_desinstalar():
    if IS_MAC:
        if MAC_PLIST_PATH.exists():
            subprocess.run(['launchctl', 'unload', str(MAC_PLIST_PATH)], capture_output=True)
            MAC_PLIST_PATH.unlink()
            print("✅ Jarvis removido (macOS LaunchAgent).")
        else:
            print("Jarvis não estava instalado.")

    elif IS_WINDOWS:
        if WIN_STARTUP_VBS.exists():
            WIN_STARTUP_VBS.unlink()
            # Mata processo se estiver rodando
            subprocess.run(['taskkill', '/F', '/IM', 'python.exe', '/FI',
                            f'WINDOWTITLE eq gtos-jarvis'], capture_output=True)
            print("✅ Jarvis removido (Windows Startup).")
        else:
            print("Jarvis não estava instalado.")


def cmd_status():
    if IS_MAC:
        r = subprocess.run(['launchctl', 'list', MAC_PLIST_LABEL], capture_output=True, text=True)
        running = r.returncode == 0
    elif IS_WINDOWS:
        running = WIN_STARTUP_VBS.exists()
    else:
        running = False

    if running:
        print(f"✅ Jarvis está ativo.")
        print(f"   Log: tail -f {LOG_PATH}" if not IS_WINDOWS else f"   Log: {LOG_PATH}")
    else:
        print("❌ Jarvis não está instalado como serviço.")
        print("   Instale com: python scripts/jarvis.py --instalar")


# ── Detecção de palmas ────────────────────────────────────────────────────────

def _check_audio_deps():
    missing = []
    for pkg in ['sounddevice', 'numpy']:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"Instale: pip install {' '.join(missing)}", file=sys.stderr)
        sys.exit(1)


def wait_for_claps(n=2):
    import sounddevice as sd
    import numpy as np

    claps = []
    last_clap_time = 0

    with sd.InputStream(samplerate=44100, channels=1, blocksize=1024) as stream:
        while True:
            data, _ = stream.read(1024)
            amplitude = float(np.max(np.abs(data)))
            now = time.time()

            if amplitude > CLAP_THRESH and (now - last_clap_time) > 0.25:
                last_clap_time = now
                claps = [t for t in claps if now - t < CLAP_WINDOW]
                claps.append(now)
                print(f"Palma {len(claps)}", flush=True)
                if len(claps) >= n:
                    return


# ── Voz ──────────────────────────────────────────────────────────────────────

def record_voice():
    import sounddevice as sd
    import numpy as np

    frames = []
    silence_start = None
    has_speech = False

    with sd.InputStream(samplerate=VOICE_RATE, channels=1, blocksize=512, dtype='float32') as stream:
        while True:
            data, _ = stream.read(512)
            frames.append(data.copy())
            amplitude = float(np.max(np.abs(data)))
            if amplitude > SILENCE_AMP:
                has_speech = True
                silence_start = None
            elif has_speech:
                if silence_start is None:
                    silence_start = time.time()
                elif time.time() - silence_start >= SILENCE_SEC:
                    break

    return __import__('numpy').concatenate(frames, axis=0)


def transcribe(audio_data) -> str:
    if not OPENAI_KEY:
        return ""
    try:
        import openai, soundfile as sf, io
        client = openai.OpenAI(api_key=OPENAI_KEY)
        buf = io.BytesIO()
        sf.write(buf, audio_data, VOICE_RATE, format='WAV', subtype='PCM_16')
        buf.seek(0); buf.name = 'audio.wav'
        return client.audio.transcriptions.create(
            model='whisper-1', file=buf, language='pt'
        ).text.strip()
    except Exception as e:
        print(f"[Whisper erro] {e}", file=sys.stderr)
        return ""


def ask_claude(prompt: str) -> str:
    cmd = 'claude.cmd' if IS_WINDOWS else 'claude'
    try:
        result = subprocess.run(
            [cmd, '-p', prompt],
            capture_output=True, text=True, cwd=str(ROOT), timeout=30,
            shell=IS_WINDOWS
        )
        return result.stdout.strip()
    except Exception:
        return ""


def voice_loop():
    _check_audio_deps()
    speak(f"Olá {OPERADOR}, GTOS pronto.")
    print("Loop de voz ativo.", flush=True)

    while True:
        try:
            audio = record_voice()
            import numpy as np
            if float(np.max(np.abs(audio))) < SILENCE_AMP * 2:
                continue
            text = transcribe(audio)
            if not text:
                continue
            print(f"Você: {text}", flush=True)
            if any(w in text.lower() for w in ['tchau', 'fechar', 'sair', 'encerrar']):
                speak("Até logo.")
                break
            response = ask_claude(text)
            if response:
                print(f"GTOS: {response[:200]}", flush=True)
                speak(response[:400])
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Erro: {e}", file=sys.stderr, flush=True)
            time.sleep(1)


# ── Daemon (chamado pelo serviço) ─────────────────────────────────────────────

def daemon_loop():
    _check_audio_deps()
    print("Jarvis daemon iniciado. Aguardando palmas...", flush=True)

    while True:
        try:
            wait_for_claps(2)
            print("2 palmas. Abrindo projeto...", flush=True)
            speak(f"Abrindo o GTOS.")
            open_project()
            time.sleep(5)
            print("Aguardando palmas...", flush=True)
        except KeyboardInterrupt:
            print("Daemon encerrado.", flush=True)
            break
        except Exception as e:
            print(f"Erro: {e}", file=sys.stderr, flush=True)
            time.sleep(3)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Jarvis — Interface de voz do GTOS')
    parser.add_argument('--instalar',    action='store_true')
    parser.add_argument('--desinstalar', action='store_true')
    parser.add_argument('--status',      action='store_true')
    parser.add_argument('--daemon',      action='store_true')
    parser.add_argument('--voz',         action='store_true')
    args = parser.parse_args()

    if   args.instalar:    cmd_instalar()
    elif args.desinstalar: cmd_desinstalar()
    elif args.status:      cmd_status()
    elif args.daemon:      daemon_loop()
    elif args.voz:         voice_loop()
    else:                  parser.print_help()


if __name__ == '__main__':
    main()

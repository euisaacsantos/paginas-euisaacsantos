"""
Jarvis — Interface de voz para o GTOS.

Funcionalidades:
  - Detecta duas palmas em background e abre o projeto no Claude Code
  - Loop de voz: ouve → transcreve (Whisper) → envia ao Claude → responde em voz (say)

Uso:
  python scripts/jarvis.py --instalar     # instala como serviço (roda no login, sempre)
  python scripts/jarvis.py --desinstalar  # remove o serviço
  python scripts/jarvis.py --status       # verifica se está rodando
  python scripts/jarvis.py --daemon       # modo background (chamado pelo LaunchAgent)
  python scripts/jarvis.py --voz          # abre loop de voz manualmente

Dependências:
  pip install sounddevice numpy openai soundfile
  (Whisper via OpenAI API — requer OPENAI_API_KEY no .env)
"""
import os
import sys
import time
import subprocess
import threading
import argparse
from pathlib import Path

ROOT    = Path(__file__).resolve().parent.parent
PLIST_LABEL = 'com.gtos.jarvis'
PLIST_PATH  = Path.home() / 'Library' / 'LaunchAgents' / f'{PLIST_LABEL}.plist'
LOG_PATH    = Path('/tmp/gtos-jarvis.log')

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

# ── Instalação como LaunchAgent ─────────────────────────────────────────────

PLIST_TEMPLATE = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{label}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{python}</string>
        <string>{script}</string>
        <string>--daemon</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{log}</string>
    <key>StandardErrorPath</key>
    <string>{log}</string>
    <key>WorkingDirectory</key>
    <string>{root}</string>
</dict>
</plist>
"""

def cmd_instalar():
    python = sys.executable
    script = str(Path(__file__).resolve())

    PLIST_PATH.parent.mkdir(parents=True, exist_ok=True)
    PLIST_PATH.write_text(PLIST_TEMPLATE.format(
        label=PLIST_LABEL,
        python=python,
        script=script,
        log=str(LOG_PATH),
        root=str(ROOT),
    ))

    # Descarrega versão anterior se existir
    subprocess.run(['launchctl', 'unload', str(PLIST_PATH)],
                   capture_output=True)

    result = subprocess.run(['launchctl', 'load', str(PLIST_PATH)],
                            capture_output=True, text=True)

    if result.returncode == 0:
        print(f"✅ Jarvis instalado como serviço.")
        print(f"   Bata 2 palmas a qualquer momento para abrir o GTOS.")
        print(f"   Log: {LOG_PATH}")
        print(f"\n   Para remover: python scripts/jarvis.py --desinstalar")
    else:
        print(f"❌ Erro ao carregar LaunchAgent: {result.stderr}")
        print(f"   Tente: launchctl load {PLIST_PATH}")


def cmd_desinstalar():
    if not PLIST_PATH.exists():
        print("Jarvis não está instalado como serviço.")
        return
    subprocess.run(['launchctl', 'unload', str(PLIST_PATH)], capture_output=True)
    PLIST_PATH.unlink()
    print("✅ Jarvis removido. Não vai mais subir no login.")


def cmd_status():
    result = subprocess.run(
        ['launchctl', 'list', PLIST_LABEL],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"✅ Jarvis está rodando em background.")
        print(f"   Log: tail -f {LOG_PATH}")
    else:
        print("❌ Jarvis não está rodando.")
        print(f"   Instale com: python scripts/jarvis.py --instalar")


# ── Detecção de palmas ────────────────────────────────────────────────────────

def check_deps():
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


def open_project():
    script = f'''
    tell application "Terminal"
        activate
        do script "cd {ROOT} && claude"
    end tell
    '''
    subprocess.run(['osascript', '-e', script], check=False)


# ── Voz ──────────────────────────────────────────────────────────────────────

def speak(text: str):
    text = text.replace('"', "'")[:500]
    subprocess.run(['say', '-v', 'Luciana', '-r', '170', text], check=False)


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
    import openai, soundfile as sf, io, numpy as np

    if not OPENAI_KEY:
        return ""

    client = openai.OpenAI(api_key=OPENAI_KEY)
    buf = io.BytesIO()
    sf.write(buf, audio_data, VOICE_RATE, format='WAV', subtype='PCM_16')
    buf.seek(0)
    buf.name = 'audio.wav'
    return client.audio.transcriptions.create(
        model='whisper-1', file=buf, language='pt'
    ).text.strip()


def ask_claude(prompt: str) -> str:
    result = subprocess.run(
        ['claude', '-p', prompt],
        capture_output=True, text=True, cwd=str(ROOT), timeout=30
    )
    return result.stdout.strip()


def voice_loop():
    check_deps()
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
                speak(f"Até logo.")
                break

            response = ask_claude(text)
            if response:
                print(f"GTOS: {response[:200]}", flush=True)
                speak(response[:400])

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Erro: {e}", flush=True, file=sys.stderr)
            time.sleep(1)


# ── Modo daemon (background, LaunchAgent) ────────────────────────────────────

def daemon_loop():
    """Roda indefinidamente: detecta palmas → abre projeto → volta a ouvir."""
    check_deps()
    print(f"Jarvis daemon iniciado. Aguardando palmas...", flush=True)

    while True:
        try:
            wait_for_claps(2)
            print("2 palmas detectadas. Abrindo projeto...", flush=True)
            speak(f"Abrindo o GTOS.")
            open_project()
            # Aguarda antes de voltar a ouvir (evita re-trigger imediato)
            time.sleep(5)
            print("Aguardando próximas palmas...", flush=True)

        except KeyboardInterrupt:
            print("Daemon encerrado.", flush=True)
            break
        except Exception as e:
            print(f"Erro no daemon: {e}", flush=True, file=sys.stderr)
            time.sleep(3)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Jarvis — Interface de voz do GTOS')
    parser.add_argument('--instalar',    action='store_true', help='Instala como serviço (sobe no login)')
    parser.add_argument('--desinstalar', action='store_true', help='Remove o serviço')
    parser.add_argument('--status',      action='store_true', help='Verifica se está rodando')
    parser.add_argument('--daemon',      action='store_true', help='Modo background (LaunchAgent)')
    parser.add_argument('--voz',         action='store_true', help='Loop de voz interativo')
    args = parser.parse_args()

    if args.instalar:
        cmd_instalar()
    elif args.desinstalar:
        cmd_desinstalar()
    elif args.status:
        cmd_status()
    elif args.daemon:
        daemon_loop()
    elif args.voz:
        voice_loop()
    else:
        parser.print_help()


if __name__ == '__main__':
    main()

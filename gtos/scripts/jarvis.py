"""
Jarvis — Interface de voz para o GTOS.

Funcionalidades:
  - Detecta duas palmas e abre o projeto no Claude Code
  - Loop de voz: ouve → transcreve (Whisper) → envia ao Claude → responde em voz (say)

Uso:
  python scripts/jarvis.py             # modo palmas + voz
  python scripts/jarvis.py --voz       # só loop de voz (projeto já aberto)
  python scripts/jarvis.py --palmas    # só aguarda palmas para abrir projeto

Dependências:
  pip install sounddevice numpy openai soundfile
  (Whisper via OpenAI API — requer OPENAI_API_KEY no .env)
"""
import os
import sys
import json
import time
import subprocess
import threading
import tempfile
import argparse
from pathlib import Path

ROOT = Path(__file__).parent.parent

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

OPENAI_KEY   = os.getenv('OPENAI_API_KEY', '')
OPERADOR     = os.getenv('OPERADOR_NOME', 'chefe')
SAMPLE_RATE  = 44100
VOICE_RATE   = 16000
CLAP_THRESH  = 0.45   # amplitude threshold para detectar palma
CLAP_WINDOW  = 1.5    # segundos entre palmas
SILENCE_SEC  = 1.8    # segundos de silêncio para parar gravação
SILENCE_AMP  = 0.02   # amplitude considerada silêncio


def check_deps():
    missing = []
    for pkg in ['sounddevice', 'numpy', 'openai', 'soundfile']:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
    if missing:
        print(f"  Instale as dependências: pip install {' '.join(missing)}")
        sys.exit(1)


def speak(text: str):
    """TTS via macOS say. Voz Luciana (português BR)."""
    text = text.replace('"', "'")[:500]
    subprocess.run(['say', '-v', 'Luciana', '-r', '170', text], check=False)


def speak_async(text: str):
    threading.Thread(target=speak, args=(text,), daemon=True).start()


def wait_for_claps(n=2):
    """Bloqueia até detectar n palmas em CLAP_WINDOW segundos."""
    import sounddevice as sd
    import numpy as np

    claps = []
    print(f"  👂 Aguardando {n} palmas...", flush=True)

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, blocksize=1024) as stream:
        last_clap_time = 0
        while True:
            data, _ = stream.read(1024)
            amplitude = float(np.max(np.abs(data)))
            now = time.time()

            if amplitude > CLAP_THRESH and (now - last_clap_time) > 0.25:
                last_clap_time = now
                claps = [t for t in claps if now - t < CLAP_WINDOW]
                claps.append(now)
                print(f"  👏 Palma {len(claps)}", flush=True)

                if len(claps) >= n:
                    return True


def record_voice():
    """Grava até detectar silêncio. Retorna numpy array."""
    import sounddevice as sd
    import numpy as np

    print("  🎤 Ouvindo...", end=' ', flush=True)
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

    print("✓", flush=True)
    return np.concatenate(frames, axis=0)


def transcribe(audio_data) -> str:
    """Transcreve áudio via OpenAI Whisper API."""
    if not OPENAI_KEY:
        print("  ⚠️  OPENAI_API_KEY não configurado. Transcrevendo localmente...")
        return transcribe_local(audio_data)

    import openai
    import soundfile as sf
    import io

    client = openai.OpenAI(api_key=OPENAI_KEY)

    buf = io.BytesIO()
    import numpy as np
    sf.write(buf, audio_data, VOICE_RATE, format='WAV', subtype='PCM_16')
    buf.seek(0)
    buf.name = 'audio.wav'

    result = client.audio.transcriptions.create(
        model='whisper-1',
        file=buf,
        language='pt'
    )
    return result.text.strip()


def transcribe_local(audio_data) -> str:
    """Fallback: transcrição local com faster-whisper."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("  Instale: pip install faster-whisper")
        return ""

    import numpy as np
    import soundfile as sf
    import tempfile

    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        sf.write(f.name, audio_data, VOICE_RATE, subtype='PCM_16')
        tmp_path = f.name

    model = WhisperModel('tiny', device='cpu', compute_type='int8')
    segments, _ = model.transcribe(tmp_path, language='pt')
    os.unlink(tmp_path)
    return ' '.join(s.text for s in segments).strip()


def ask_claude(prompt: str) -> str:
    """Envia prompt ao Claude Code em modo headless (-p)."""
    result = subprocess.run(
        ['claude', '-p', prompt],
        capture_output=True, text=True,
        cwd=str(ROOT), timeout=30
    )
    return result.stdout.strip() or result.stderr.strip()


def open_project():
    """Abre o Terminal com Claude Code no projeto."""
    script = f'''
    tell application "Terminal"
        activate
        do script "cd {ROOT} && claude"
    end tell
    '''
    subprocess.run(['osascript', '-e', script], check=False)
    time.sleep(2)


def voice_loop():
    """Loop principal de interação por voz."""
    check_deps()
    speak(f"Olá {OPERADOR}, GTOS pronto.")
    print(f"\n  ✅ Loop de voz ativo. Fale algo após o sinal.\n")

    while True:
        try:
            audio = record_voice()
            import numpy as np
            if float(np.max(np.abs(audio))) < SILENCE_AMP * 2:
                continue  # silêncio puro, ignora

            text = transcribe(audio)
            if not text:
                continue

            print(f"  Você: {text}")

            # Comandos especiais
            low = text.lower()
            if any(w in low for w in ['tchau', 'fechar', 'sair', 'encerrar']):
                speak(f"Até logo, {OPERADOR}.")
                break

            response = ask_claude(text)
            if response:
                print(f"  GTOS: {response[:200]}")
                speak(response[:400])

        except KeyboardInterrupt:
            speak("Encerrando.")
            break
        except Exception as e:
            print(f"  Erro: {e}")
            time.sleep(1)


def main():
    parser = argparse.ArgumentParser(description='Jarvis — Interface de voz do GTOS')
    parser.add_argument('--voz', action='store_true', help='Só loop de voz')
    parser.add_argument('--palmas', action='store_true', help='Só aguarda palmas')
    args = parser.parse_args()

    if args.voz:
        voice_loop()
        return

    check_deps()

    if args.palmas:
        wait_for_claps(2)
        open_project()
        return

    # Modo padrão: palmas → abre projeto → loop de voz
    print("\n  GTOS Jarvis iniciado.")
    print(f"  Bata 2 palmas para abrir o projeto.\n")

    while True:
        wait_for_claps(2)
        speak(f"Abrindo o GTOS, {OPERADOR}.")
        open_project()

        continuar = input("\n  Ativar loop de voz? [S/n]: ").strip().lower()
        if continuar in ('', 's', 'sim', 'y'):
            voice_loop()
        break


if __name__ == '__main__':
    main()

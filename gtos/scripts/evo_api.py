"""
Wrapper para Evolution Go v3 (WhatsApp).
Uso: python scripts/evo_api.py --phone 5511999999999 --msg "Olá"
"""
import os
import sys
import json
import argparse
import urllib.request
import urllib.parse
from pathlib import Path

_venv_py = Path(__file__).resolve().parent.parent / '.venv' / (
    'Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
if _venv_py.exists() and os.path.normcase(sys.executable) != os.path.normcase(str(_venv_py)):
    os.execv(str(_venv_py), [str(_venv_py)] + sys.argv)

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

EVO_URL      = os.getenv('EVO_URL', '').rstrip('/')
EVO_API_KEY  = os.getenv('EVO_API_KEY', '')
EVO_INSTANCE = os.getenv('EVO_INSTANCE', '')


def _post(path, body):
    if not EVO_URL:
        raise RuntimeError("EVO_URL não configurado no .env")
    url = f"{EVO_URL}/{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url, data=data,
        headers={'Content-Type': 'application/json', 'apikey': EVO_API_KEY},
        method='POST'
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def send_text(phone: str, message: str):
    """Envia mensagem de texto simples."""
    phone = phone.replace('+', '').replace(' ', '').replace('-', '')
    return _post(f"message/sendText/{EVO_INSTANCE}", {
        'number': phone,
        'text': message
    })


def send_media(phone: str, url: str, caption: str = '', media_type: str = 'image'):
    """Envia mídia (image/video/document)."""
    phone = phone.replace('+', '').replace(' ', '').replace('-', '')
    return _post(f"message/sendMedia/{EVO_INSTANCE}", {
        'number': phone,
        'mediatype': media_type,
        'media': url,
        'caption': caption
    })


def send_document(phone: str, url: str, filename: str, caption: str = ''):
    phone = phone.replace('+', '').replace(' ', '').replace('-', '')
    return _post(f"message/sendMedia/{EVO_INSTANCE}", {
        'number': phone,
        'mediatype': 'document',
        'media': url,
        'fileName': filename,
        'caption': caption
    })


def check_connection():
    """Verifica se a instância está conectada."""
    url = f"{EVO_URL}/instance/connectionState/{EVO_INSTANCE}"
    req = urllib.request.Request(url, headers={'apikey': EVO_API_KEY})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--phone', required=True, help='Número com DDI (ex: 5511999999999)')
    parser.add_argument('--msg', required=True, help='Mensagem a enviar')
    args = parser.parse_args()

    result = send_text(args.phone, args.msg)
    print(json.dumps(result, indent=2, ensure_ascii=False))

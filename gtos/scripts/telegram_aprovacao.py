"""
Bot Telegram para aprovação de relatórios antes do envio via WhatsApp.

Uso:
  python scripts/telegram_aprovacao.py --arquivo clientes/slug/relatorios/relatorio.md --cliente slug

Fluxo:
  1. Envia o rascunho do relatório no Telegram com botões Aprovar / Editar / Cancelar
  2. Aguarda resposta
  3. Se aprovado: chama evo_api.py para enviar via WhatsApp
  4. Se cancelado: apenas registra
"""
import os
import sys
import json
import time
import argparse
import urllib.request
import urllib.parse
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

BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '')
CHAT_ID   = os.getenv('TELEGRAM_CHAT_ID', '')
BASE_URL  = f"https://api.telegram.org/bot{BOT_TOKEN}"


def tg_post(method, data):
    url = f"{BASE_URL}/{method}"
    payload = json.dumps(data).encode()
    req = urllib.request.Request(
        url, data=payload,
        headers={'Content-Type': 'application/json'}, method='POST'
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def send_approval_request(text, arquivo, cliente_slug):
    """Envia o relatório com botões de ação."""
    # Telegram tem limite de 4096 chars por mensagem
    preview = text[:3000] + ("\n\n[... texto truncado ...]" if len(text) > 3000 else "")

    msg = f"📊 *Relatório para aprovação*\n\n{preview}"
    keyboard = {
        'inline_keyboard': [[
            {'text': '✅ Aprovar e enviar', 'callback_data': f'aprovar|{arquivo}|{cliente_slug}'},
            {'text': '❌ Cancelar',         'callback_data': f'cancelar|{arquivo}|{cliente_slug}'},
        ]]
    }
    return tg_post('sendMessage', {
        'chat_id': CHAT_ID,
        'text': msg,
        'parse_mode': 'Markdown',
        'reply_markup': keyboard
    })


def wait_for_callback(timeout=300):
    """Poll por callback do botão. Timeout em segundos."""
    last_update = 0
    deadline = time.time() + timeout

    while time.time() < deadline:
        try:
            url = f"{BASE_URL}/getUpdates?offset={last_update + 1}&timeout=10&allowed_updates=[\"callback_query\"]"
            with urllib.request.urlopen(url, timeout=15) as r:
                data = json.loads(r.read())

            for update in data.get('result', []):
                last_update = update['update_id']
                cb = update.get('callback_query')
                if cb and str(cb['message']['chat']['id']) == str(CHAT_ID):
                    # Responder ao callback para remover o "loading"
                    tg_post('answerCallbackQuery', {'callback_query_id': cb['id']})
                    return cb['data']
        except Exception:
            time.sleep(2)

    return None


def load_client_whatsapp(slug):
    conta_path = ROOT / 'clientes' / slug / 'conta.md'
    if not conta_path.exists():
        return None
    for line in conta_path.read_text().splitlines():
        if 'whatsapp' in line.lower() and '|' in line:
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 3:
                val = parts[2].strip()
                if val and val != '—':
                    return val
    return None


def main():
    if not BOT_TOKEN or not CHAT_ID:
        print("  ⚠️  TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não configurados no .env")
        sys.exit(1)

    parser = argparse.ArgumentParser()
    parser.add_argument('--arquivo', required=True, help='Caminho do relatório .md')
    parser.add_argument('--cliente', required=True, help='Slug do cliente')
    args = parser.parse_args()

    arquivo = Path(args.arquivo)
    if not arquivo.exists():
        print(f"  ❌ Arquivo não encontrado: {arquivo}")
        sys.exit(1)

    texto = arquivo.read_text()
    print(f"  📤 Enviando para aprovação no Telegram...")
    send_approval_request(texto, str(arquivo), args.cliente)

    print(f"  ⏳ Aguardando sua aprovação no Telegram (5 min)...")
    callback = wait_for_callback(timeout=300)

    if not callback:
        print("  ⏱️  Timeout — sem resposta no Telegram. Relatório salvo localmente.")
        sys.exit(0)

    action, arq, slug = callback.split('|', 2)

    if action == 'cancelar':
        tg_post('sendMessage', {'chat_id': CHAT_ID, 'text': '❌ Relatório cancelado.'})
        print("  ❌ Relatório cancelado.")
        sys.exit(0)

    if action == 'aprovar':
        whatsapp = load_client_whatsapp(slug)
        if not whatsapp:
            tg_post('sendMessage', {'chat_id': CHAT_ID, 'text': '⚠️ WhatsApp do cliente não encontrado no conta.md'})
            print("  ⚠️  WhatsApp não encontrado. Edite clientes/{slug}/conta.md")
            sys.exit(1)

        # Envia via Evolution Go
        import subprocess
        result = subprocess.run(
            ['python', str(ROOT / 'scripts' / 'evo_api.py'), '--phone', whatsapp, '--msg', texto[:4000]],
            capture_output=True, text=True, cwd=str(ROOT)
        )

        if result.returncode == 0:
            tg_post('sendMessage', {'chat_id': CHAT_ID, 'text': f'✅ Relatório enviado para {whatsapp} via WhatsApp!'})
            print(f"  ✅ Enviado para {whatsapp}")
        else:
            tg_post('sendMessage', {'chat_id': CHAT_ID, 'text': f'❌ Erro ao enviar: {result.stderr[:200]}'})
            print(f"  ❌ Erro: {result.stderr}")


if __name__ == '__main__':
    main()

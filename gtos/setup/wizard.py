"""
Setup wizard do GTOS.
Executado automaticamente pelo CLAUDE.md quando .setup-complete não existe.
Compatível com macOS e Windows.
"""
import os
import sys
import json
import platform
from pathlib import Path

_venv_py = Path(__file__).resolve().parent.parent / '.venv' / (
    'Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
if _venv_py.exists() and os.path.normcase(sys.executable) != os.path.normcase(str(_venv_py)):
    os.execv(str(_venv_py), [str(_venv_py)] + sys.argv)

ROOT       = Path(__file__).parent.parent
IS_WINDOWS = platform.system() == 'Windows'

def print_header():
    try:
        print(open(ROOT / 'welcome.txt').read())
    except FileNotFoundError:
        pass
    print("  CONFIGURAÇÃO INICIAL")
    print("  ════════════════════════════════════════\n")

def ask(prompt, default=None, required=True):
    suffix = f" [{default}]" if default else ""
    while True:
        val = input(f"  {prompt}{suffix}: ").strip()
        if not val and default:
            return default
        if val:
            return val
        if not required:
            return ""
        print("  ⚠️  Campo obrigatório.")

def ask_yn(prompt, default="s"):
    val = input(f"  {prompt} [{'S/n' if default=='s' else 's/N'}]: ").strip().lower()
    if not val:
        return default == "s"
    return val in ("s", "sim", "y", "yes")

def create_env(config):
    lines = [
        f"OPERADOR_NOME={config['nome']}",
        f"META_ADS_ACCESS_TOKEN={config['meta_token']}",
        f"META_ADS_ACCOUNT_ID={config['meta_account']}",
        f"EVO_URL={config.get('evo_url', '')}",
        f"EVO_API_KEY={config.get('evo_api_key', '')}",
        f"EVO_INSTANCE={config.get('evo_instance', '')}",
        f"TELEGRAM_BOT_TOKEN={config.get('telegram_token', '')}",
        f"TELEGRAM_CHAT_ID={config.get('telegram_chat_id', '')}",
        f"OPENAI_API_KEY={config.get('openai_key', '')}",
    ]
    (ROOT / '.env').write_text('\n'.join(lines) + '\n')

def create_client_index():
    path = ROOT / 'clientes' / '_index.md'
    if path.exists():
        return
    path.write_text("""# Índice de Clientes

> Mantido automaticamente pelo GTOS. Não edite manualmente.

| Cliente | Nicho | Conta Meta | Último Relatório | Status |
|---|---|---|---|---|

_Nenhum cliente cadastrado. Use "adicionar cliente" para começar._
""")

def create_competitor_index():
    path = ROOT / 'concorrentes' / '_index.md'
    if path.exists():
        return
    path.write_text("""# Índice de Concorrentes

> Mantido automaticamente pelo GTOS.

| Concorrente | Page ID | Anúncios Catalogados | Última Verificação |
|---|---|---|---|

_Nenhum concorrente cadastrado. Use "espionar concorrente" para começar._
""")

def main():
    print_header()
    print("  Vamos configurar seu GTOS. Leva menos de 2 minutos.\n")

    # Verifica e instala dependências primeiro
    from deps import run_all
    if not run_all():
        print("  ⚠️  Corrija as dependências acima antes de continuar.")
        sys.exit(1)

    config = {}

    # Operador
    print("  ── VOCÊ ─────────────────────────────────")
    config['nome'] = ask("Seu nome (como o sistema vai te chamar)")

    # Meta Ads
    print("\n  ── META ADS ─────────────────────────────")
    print("  Acesse: business.facebook.com → Configurações → Token de acesso")
    config['meta_token'] = ask("Access Token")
    config['meta_account'] = ask("ID da conta de anúncios (só números)")

    # Evolution Go
    print("\n  ── EVOLUTION GO (WhatsApp) ──────────────")
    if ask_yn("Você já tem o Evolution Go rodando?"):
        config['evo_url'] = ask("URL do Evolution Go (ex: http://localhost:8080)")
        config['evo_instance'] = ask("Nome da instância")
        config['evo_api_key'] = ask("API Key")
    else:
        print("  ℹ️  Sem problema — configure depois editando o .env")
        config['evo_url'] = ''
        config['evo_instance'] = ''
        config['evo_api_key'] = ''

    # Telegram
    print("\n  ── TELEGRAM (aprovação de relatórios) ───")
    if ask_yn("Quer configurar aprovação de relatórios via Telegram?"):
        print("  Crie um bot em @BotFather e cole o token abaixo.")
        config['telegram_token'] = ask("Token do bot Telegram")
        config['telegram_chat_id'] = ask("Seu Chat ID (use @userinfobot para descobrir)")
    else:
        config['telegram_token'] = ''
        config['telegram_chat_id'] = ''

    # OpenAI (para voz)
    print("\n  ── OPENAI (voz via Jarvis) ──────────────")
    if ask_yn("Quer usar o Jarvis com reconhecimento de voz?", default="s"):
        config['openai_key'] = ask("OpenAI API Key (para Whisper)", required=False)
    else:
        config['openai_key'] = ''

    # Criar arquivos
    print("\n  Salvando configurações...")
    create_env(config)
    create_client_index()
    create_competitor_index()

    # Primeiro cliente
    print("\n  ── PRIMEIRO CLIENTE ─────────────────────")
    if ask_yn("Quer cadastrar um cliente agora?"):
        os.system(f"python {ROOT / 'scripts' / 'adicionar_cliente.py'}")

    # Marcar setup como completo
    (ROOT / '.setup-complete').write_text('ok')

    # Jarvis — instala como serviço
    print("\n  ── JARVIS (detecção de palmas) ───────────")
    print("  O Jarvis fica rodando em background e abre o GTOS quando")
    print("  você bater 2 palmas.")
    if ask_yn("Ativar o Jarvis agora?"):
        import subprocess
        result = subprocess.run(
            [sys.executable, str(ROOT / 'scripts' / 'jarvis.py'), '--instalar'],
            cwd=str(ROOT)
        )
        if result.returncode != 0:
            print("  ⚠️  Não foi possível instalar o Jarvis automaticamente.")
            print(f"  Execute manualmente: python scripts/jarvis.py --instalar")

    print("\n  ✅ GTOS configurado com sucesso!")
    print(f"  Bem-vindo, {config['nome']}. Seu sistema operacional está pronto.\n")

if __name__ == '__main__':
    main()

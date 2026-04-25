"""
Adiciona um novo cliente ao GTOS.
Uso interativo: python scripts/adicionar_cliente.py
Uso direto:     python scripts/adicionar_cliente.py --nome "Acme" --conta "123456789"
"""
import os
import re
import sys
import argparse
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).parent.parent


def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    return re.sub(r'[\s-]+', '-', text)


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


def create_client(nome, conta_meta, whatsapp='', nicho='', objetivo='', observacoes=''):
    slug = slugify(nome)
    client_dir = ROOT / 'clientes' / slug

    if client_dir.exists():
        print(f"  ⚠️  Cliente '{nome}' já existe em clientes/{slug}/")
        return False

    client_dir.mkdir(parents=True, exist_ok=True)
    (client_dir / 'relatorios').mkdir(exist_ok=True)

    conta_md = f"""# {nome}

## Dados da Conta

| Campo | Valor |
|---|---|
| Meta Ads Account ID | `{conta_meta}` |
| WhatsApp | {whatsapp or '—'} |
| Nicho | {nicho or '—'} |
| Objetivo principal | {objetivo or '—'} |
| Cadastrado em | {datetime.now().strftime('%d/%m/%Y')} |

## Contexto / Observações

{observacoes or '_Nenhuma observação ainda._'}

## Histórico de Relatórios

_Os relatórios são salvos automaticamente em `relatorios/` ao rodar /relatorio-cliente._

## Notas do Operador

_Adicione aqui contexto importante: sazonalidades, produtos em destaque, restrições de copy, etc._
"""
    (client_dir / 'conta.md').write_text(conta_md)

    update_client_index(nome, slug, nicho, conta_meta)

    print(f"\n  ✅ Cliente '{nome}' criado em clientes/{slug}/")
    return True


def update_client_index(nome, slug, nicho, conta_meta):
    index_path = ROOT / 'clientes' / '_index.md'
    if not index_path.exists():
        index_path.write_text("""# Índice de Clientes

> Mantido automaticamente pelo GTOS.

| Cliente | Nicho | Conta Meta | Último Relatório | Status |
|---|---|---|---|---|
""")

    content = index_path.read_text()
    new_row = f"| [{nome}](/{slug}/conta.md) | {nicho or '—'} | `{conta_meta}` | — | ativo |"

    # Remove linha vazia de "nenhum cliente" se existir
    content = content.replace('_Nenhum cliente cadastrado. Use "adicionar cliente" para começar._\n', '')

    # Adiciona linha na tabela
    if '| --- |' in content or '|---|' in content:
        lines = content.splitlines()
        insert_after = next(
            (i for i, l in enumerate(lines) if '|---|' in l or '| --- |' in l),
            len(lines) - 1
        )
        lines.insert(insert_after + 1, new_row)
        content = '\n'.join(lines) + '\n'
    else:
        content += new_row + '\n'

    index_path.write_text(content)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--nome', help='Nome do cliente')
    parser.add_argument('--conta', help='ID da conta Meta Ads')
    parser.add_argument('--whatsapp', default='')
    parser.add_argument('--nicho', default='')
    args = parser.parse_args()

    print("\n  ── ADICIONAR CLIENTE ────────────────────\n")

    nome      = args.nome    or ask("Nome do cliente")
    conta     = args.conta   or ask("ID da conta Meta Ads (só números)")
    whatsapp  = args.whatsapp or ask("WhatsApp do cliente (com DDI, ex: 5511999999999)", required=False)
    nicho     = args.nicho   or ask("Nicho/segmento (ex: e-commerce moda)", required=False)
    objetivo  = ask("Objetivo principal (ex: vendas, leads, tráfego)", required=False)
    obs       = ask("Observações importantes sobre o cliente", required=False)

    create_client(nome, conta, whatsapp, nicho, objetivo, obs)


if __name__ == '__main__':
    main()

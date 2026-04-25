"""
Cataloga e monitora a biblioteca de anúncios de concorrentes no Facebook.

Uso:
  python scripts/espionar.py --adicionar "Nome Marca" --page-id "123456789"
  python scripts/espionar.py --atualizar "nome-marca"
  python scripts/espionar.py --atualizar-todos
  python scripts/espionar.py --listar

Na primeira execução, cataloga todos os anúncios ativos.
Nas execuções seguintes, detecta e baixa somente os anúncios novos.
"""
import os
import re
import sys
import json
import time
import argparse
import hashlib
import urllib.request
from pathlib import Path
from datetime import datetime

_venv_py = Path(__file__).resolve().parent.parent / '.venv' / (
    'Scripts/python.exe' if sys.platform == 'win32' else 'bin/python')
if _venv_py.exists() and os.path.normcase(sys.executable) != os.path.normcase(str(_venv_py)):
    os.execv(str(_venv_py), [str(_venv_py)] + sys.argv)

ROOT = Path(__file__).parent.parent


def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    return re.sub(r'[\s-]+', '-', text)


def load_catalog(slug):
    path = ROOT / 'concorrentes' / slug / 'catalog.json'
    if path.exists():
        return json.loads(path.read_text())
    return {}


def save_catalog(slug, catalog):
    path = ROOT / 'concorrentes' / slug / 'catalog.json'
    path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False))


def load_config(slug):
    path = ROOT / 'concorrentes' / slug / 'config.json'
    if not path.exists():
        return None
    return json.loads(path.read_text())


def save_config(slug, config):
    path = ROOT / 'concorrentes' / slug / 'config.json'
    path.write_text(json.dumps(config, indent=2, ensure_ascii=False))


def download_thumbnail(url, dest_path):
    try:
        urllib.request.urlretrieve(url, dest_path)
        return True
    except Exception:
        return False


def scrape_ads_library(page_id, country='BR'):
    """
    Scrapa a Biblioteca de Anúncios usando Playwright.
    Retorna lista de dicts com dados dos anúncios.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("  ⚠️  Playwright não instalado. Execute: pip install playwright && playwright install chromium")
        sys.exit(1)

    ads = []
    url = (
        f"https://www.facebook.com/ads/library/"
        f"?active_status=active&ad_type=all&country={country}"
        f"&view_all_page_id={page_id}&sort_data[direction]=desc&sort_data[mode]=relevancy_monthly_grouped"
    )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # headless=False para ver o progresso
        page = browser.new_page()
        page.set_extra_http_headers({'Accept-Language': 'pt-BR,pt;q=0.9'})

        print(f"  🌐 Abrindo biblioteca de anúncios...")
        page.goto(url, wait_until='networkidle', timeout=30000)
        time.sleep(3)

        # Scroll para carregar todos os anúncios
        last_count = 0
        consecutive_same = 0
        print("  📜 Carregando anúncios (scroll)...")

        while consecutive_same < 3:
            page.keyboard.press('End')
            time.sleep(2)

            cards = page.query_selector_all('[data-testid="ad-archive-renderer"]')
            current_count = len(cards)

            if current_count == last_count:
                consecutive_same += 1
            else:
                consecutive_same = 0
                print(f"     {current_count} anúncios encontrados...", end='\r')

            last_count = current_count

        print(f"\n  ✅ Total: {last_count} anúncios na página")

        # Extrai dados de cada card
        cards = page.query_selector_all('[data-testid="ad-archive-renderer"]')
        for card in cards:
            try:
                ad = {}

                # ID do anúncio (extraído da URL ou atributo)
                ad_id_el = card.query_selector('[data-ad-id]')
                ad['id'] = ad_id_el.get_attribute('data-ad-id') if ad_id_el else hashlib.md5(
                    card.inner_text()[:100].encode()
                ).hexdigest()[:12]

                # Texto principal
                body_el = card.query_selector('._7jyg, ._4ik4, .x1iorvi4')
                ad['body'] = body_el.inner_text()[:500] if body_el else ''

                # Título / headline
                title_el = card.query_selector('._7jyh, .x1lliihq')
                ad['title'] = title_el.inner_text()[:200] if title_el else ''

                # Thumbnail
                img_el = card.query_selector('img[src*="fbcdn"]')
                ad['thumbnail_url'] = img_el.get_attribute('src') if img_el else ''

                # Data de início
                date_el = card.query_selector('._7jyf')
                ad['started'] = date_el.inner_text() if date_el else ''

                # CTA / Link
                cta_el = card.query_selector('a[href*="l.facebook.com"]')
                ad['cta_url'] = cta_el.get_attribute('href') if cta_el else ''

                ad['scraped_at'] = datetime.now().isoformat()
                ads.append(ad)

            except Exception:
                continue

        browser.close()

    return ads


def update_competitor_index():
    index_path = ROOT / 'concorrentes' / '_index.md'
    rows = []
    for competitor_dir in sorted((ROOT / 'concorrentes').iterdir()):
        if not competitor_dir.is_dir() or competitor_dir.name.startswith('_'):
            continue
        config = load_config(competitor_dir.name)
        catalog = load_catalog(competitor_dir.name)
        if not config:
            continue
        last_check = config.get('last_checked', '—')
        if last_check != '—':
            last_check = last_check[:10]
        rows.append(
            f"| {config.get('nome', competitor_dir.name)} "
            f"| `{config.get('page_id', '—')}` "
            f"| {len(catalog)} "
            f"| {last_check} |"
        )

    header = """# Índice de Concorrentes

> Mantido automaticamente pelo GTOS.

| Concorrente | Page ID | Anúncios Catalogados | Última Verificação |
|---|---|---|---|
"""
    index_path.write_text(header + '\n'.join(rows) + '\n')


def update_client_summary(slug, nome, total_ads, new_ads):
    summary_path = ROOT / 'concorrentes' / slug / '_index.md'
    catalog = load_catalog(slug)
    ads_list = list(catalog.values())[-20:]  # últimos 20

    lines = [
        f"# {nome} — Biblioteca de Anúncios",
        f"",
        f"**Total catalogado:** {total_ads} anúncios  ",
        f"**Novos na última verificação:** {new_ads}  ",
        f"**Última atualização:** {datetime.now().strftime('%d/%m/%Y %H:%M')}",
        f"",
        f"## Anúncios Recentes",
        f"",
    ]
    for ad in reversed(ads_list):
        title = ad.get('title') or ad.get('body', '')[:60]
        lines.append(f"- **{title}** — iniciado {ad.get('started', '?')} — `{ad['id']}`")

    summary_path.write_text('\n'.join(lines) + '\n')


def cmd_adicionar(nome, page_id, country='BR'):
    slug = slugify(nome)
    comp_dir = ROOT / 'concorrentes' / slug
    comp_dir.mkdir(parents=True, exist_ok=True)
    (comp_dir / 'ads').mkdir(exist_ok=True)

    config = {
        'nome': nome,
        'page_id': page_id,
        'country': country,
        'added_at': datetime.now().isoformat(),
        'last_checked': None,
    }
    save_config(slug, config)

    print(f"\n  ✅ Concorrente '{nome}' adicionado (page_id: {page_id})")
    print(f"  Execute: python scripts/espionar.py --atualizar {slug}")


def cmd_atualizar(slug, country=None):
    config = load_config(slug)
    if not config:
        print(f"  ❌ Concorrente '{slug}' não encontrado. Use --adicionar primeiro.")
        sys.exit(1)

    nome    = config['nome']
    page_id = config['page_id']
    country = country or config.get('country', 'BR')

    print(f"\n  🔍 Espionando: {nome} (page_id: {page_id})\n")

    catalog = load_catalog(slug)
    known_ids = set(catalog.keys())

    # Scrapa
    scraped = scrape_ads_library(page_id, country)

    new_ads = []
    for ad in scraped:
        ad_id = str(ad['id'])
        if ad_id not in known_ids:
            new_ads.append(ad)
            catalog[ad_id] = ad

            # Baixa thumbnail
            if ad.get('thumbnail_url'):
                thumb_dir = ROOT / 'concorrentes' / slug / 'ads' / ad_id
                thumb_dir.mkdir(parents=True, exist_ok=True)
                dest = thumb_dir / 'thumbnail.jpg'
                ok = download_thumbnail(ad['thumbnail_url'], str(dest))
                catalog[ad_id]['thumbnail_local'] = str(dest.relative_to(ROOT)) if ok else None

    save_catalog(slug, catalog)

    config['last_checked'] = datetime.now().isoformat()
    save_config(slug, config)

    update_client_summary(slug, nome, len(catalog), len(new_ads))
    update_competitor_index()

    print(f"\n  📊 Resultado:")
    print(f"     Total catalogado: {len(catalog)}")
    print(f"     Novos anúncios:   {len(new_ads)}")

    if new_ads:
        print(f"\n  🆕 Novos anúncios:")
        for ad in new_ads[:5]:
            title = ad.get('title') or ad.get('body', '')[:60]
            print(f"     • {title}")
        if len(new_ads) > 5:
            print(f"     ... e mais {len(new_ads) - 5}")


def cmd_listar():
    comp_dir = ROOT / 'concorrentes'
    competitors = [d for d in comp_dir.iterdir() if d.is_dir() and not d.name.startswith('_')]
    if not competitors:
        print("  Nenhum concorrente cadastrado ainda.")
        return
    print("\n  Concorrentes cadastrados:\n")
    for d in sorted(competitors):
        config = load_config(d.name)
        if config:
            catalog = load_catalog(d.name)
            print(f"  • {config['nome']} ({d.name}) — {len(catalog)} anúncios")


def main():
    parser = argparse.ArgumentParser(description='Espiona biblioteca de anúncios de concorrentes')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--adicionar', metavar='NOME', help='Adiciona novo concorrente')
    group.add_argument('--atualizar', metavar='SLUG', help='Atualiza concorrente existente')
    group.add_argument('--atualizar-todos', action='store_true', help='Atualiza todos os concorrentes')
    group.add_argument('--listar', action='store_true', help='Lista concorrentes cadastrados')
    parser.add_argument('--page-id', help='Page ID do Facebook (obrigatório com --adicionar)')
    parser.add_argument('--country', default='BR', help='País (padrão: BR)')
    args = parser.parse_args()

    if args.adicionar:
        if not args.page_id:
            print("  ❌ --page-id é obrigatório ao adicionar um concorrente")
            sys.exit(1)
        cmd_adicionar(args.adicionar, args.page_id, args.country)

    elif args.atualizar:
        cmd_atualizar(args.atualizar, args.country)

    elif args.atualizar_todos:
        comp_dir = ROOT / 'concorrentes'
        for d in sorted(comp_dir.iterdir()):
            if d.is_dir() and not d.name.startswith('_'):
                cmd_atualizar(d.name)

    elif args.listar:
        cmd_listar()


if __name__ == '__main__':
    main()

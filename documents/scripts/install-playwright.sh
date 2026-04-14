#!/usr/bin/env bash
# install-playwright.sh — instala Playwright + Chromium pra skill /espionar-concorrente.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Instalando Playwright..."
if [[ ! -f package.json ]]; then
  cat > package.json <<EOF
{
  "name": "gestor-trafego-runtime",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Runtime local das skills (Playwright, fetch, etc)",
  "dependencies": {}
}
EOF
fi

npm install --save playwright

echo ""
echo "Baixando Chromium (~150MB)..."
npx playwright install chromium

echo ""
echo "Pronto. Pra testar:"
echo "  npx playwright --version"

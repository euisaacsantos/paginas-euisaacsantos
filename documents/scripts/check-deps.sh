#!/usr/bin/env bash
# check-deps.sh — diagnóstico rápido. Não instala nada.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'; N='\033[0m'

if [[ -f .env ]]; then
  set -a; source <(grep -E '^[A-Z_]+=' .env || true); set +a
fi

OK=0; FAIL=0

check() {
  local label="$1" cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo -e "${G}[OK]${N}    $label"
    OK=$((OK+1))
  else
    echo -e "${R}[FALTA]${N} $label"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "Diagnóstico de dependências — $(date '+%Y-%m-%d %H:%M')"
echo "----------------------------------------------------------------"

check "Docker"                "docker --version"
check "Docker rodando"        "docker info"
check "Node 20+"              "node --version | grep -E 'v(2[0-9]|[3-9][0-9])'"
check "npm"                   "npm --version"
check ".env existe"           "test -f .env"
check "Vault Obsidian"        "test -d ${OBSIDIAN_VAULT_PATH:-./obsidian-vault}"
check "META_ACCESS_TOKEN"     "test -n '${META_ACCESS_TOKEN:-}'"
check "META_AD_ACCOUNT_ID"    "test -n '${META_AD_ACCOUNT_ID:-}'"
check "Token Meta válido"     "curl -fsS https://graph.facebook.com/${META_API_VERSION:-v19.0}/me?access_token=${META_ACCESS_TOKEN:-x}"
check "Conta Meta acessível"  "curl -fsS https://graph.facebook.com/${META_API_VERSION:-v19.0}/${META_AD_ACCOUNT_ID:-x}?access_token=${META_ACCESS_TOKEN:-x}"
check "Evolution rodando"     "curl -fsS ${EVOLUTION_API_URL:-http://localhost:8080}/"
check "WhatsApp pareado"      "curl -fsS -H 'apikey: ${EVOLUTION_API_KEY:-}' ${EVOLUTION_API_URL:-http://localhost:8080}/instance/connectionState/${EVOLUTION_INSTANCE_NAME:-gestor} | grep -q '\"state\":\"open\"'"
check "Drive MCP"             "claude mcp list 2>/dev/null | grep -q gdrive"
check "Playwright"            "npx --no-install playwright --version"
check "Cron acessível"        "crontab -l 2>/dev/null || [[ \$? -eq 1 ]]"

echo "----------------------------------------------------------------"
TOTAL=$((OK+FAIL))
if [[ $FAIL -eq 0 ]]; then
  echo -e "${G}Tudo OK${N} ($OK/$TOTAL)"
else
  echo -e "${Y}$OK/$TOTAL OK — $FAIL pendência(s)${N}"
  echo "Roda ./scripts/setup.sh pra resolver."
fi
echo ""

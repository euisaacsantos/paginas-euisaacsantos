#!/usr/bin/env bash
# setup.sh — orquestra detecção e instalação de dependências.
# Roda na primeira vez. Pode rodar de novo a qualquer momento.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# cores
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[0;34m'; N='\033[0m'
ok()    { echo -e "${G}[OK]${N} $1"; }
warn()  { echo -e "${Y}[!]${N}  $1"; }
err()   { echo -e "${R}[X]${N}  $1"; }
info()  { echo -e "${B}[i]${N}  $1"; }
ask()   { read -r -p "$1 [s/N]: " resp; [[ "$resp" =~ ^[sSyY]$ ]]; }

echo ""
echo "================================================================"
echo "  Claude para Gestores de Tráfego — setup"
echo "================================================================"
echo ""

# ---------- 0. Move skills/ -> .claude/skills/ ----------
if [[ -d skills && ! -d .claude/skills ]]; then
  info "Movendo skills/ pra .claude/skills/ (local que o Claude Code lê)..."
  mkdir -p .claude
  mv skills .claude/skills
  ok ".claude/skills/ pronto"
elif [[ -d .claude/skills ]]; then
  ok ".claude/skills/ presente ($(ls .claude/skills/*.md 2>/dev/null | wc -l | tr -d ' ') skills)"
fi

# ---------- 1. .env ----------
if [[ ! -f .env ]]; then
  warn ".env não existe. Copiando de .env.example..."
  cp .env.example .env
  ok ".env criado. Edita ele depois pra preencher tokens."
else
  ok ".env presente"
fi

# carrega .env (ignora linhas que não são KEY=VALUE)
set -a
# shellcheck disable=SC1091
source <(grep -E '^[A-Z_]+=' .env || true)
set +a

# ---------- 2. Docker ----------
if command -v docker >/dev/null 2>&1; then
  ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
else
  err "Docker não instalado."
  echo "    Baixa o Docker Desktop em https://www.docker.com/products/docker-desktop"
  echo "    Depois roda esse setup de novo."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  err "Docker está instalado mas não está rodando. Abre o Docker Desktop e tenta de novo."
  exit 1
fi

# ---------- 3. Node ----------
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
  if [[ "$NODE_VER" -ge 20 ]]; then
    ok "Node $(node --version)"
  else
    warn "Node $(node --version) — recomendado >= 20. Pode dar problema com MCPs."
  fi
else
  err "Node não instalado. Instala via https://nodejs.org ou nvm."
  exit 1
fi

# ---------- 4. Vault Obsidian ----------
VAULT="${OBSIDIAN_VAULT_PATH:-./obsidian-vault}"
if [[ -d "$VAULT" ]]; then
  CLIENTES=$(find "$VAULT/clientes" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
  ok "Vault Obsidian em $VAULT ($CLIENTES clientes)"
else
  warn "Vault não encontrado em $VAULT"
  if ask "Criar agora usando o template embutido?"; then
    mkdir -p "$VAULT"/{_templates,clientes,criativos,diagnosticos,decisoes,concorrentes,relatorios}
    ok "Vault criado. Mexe nos templates em $VAULT/_templates/"
  fi
fi

# ---------- 5. Token Meta ----------
if [[ -z "${META_ACCESS_TOKEN:-}" ]]; then
  warn "META_ACCESS_TOKEN vazio no .env"
  echo "    Gera token em: https://developers.facebook.com/tools/explorer/"
  echo "    Permissões: ads_read, ads_management, business_management"
  echo "    Cola no .env e roda esse setup de novo."
else
  if curl -fsS "https://graph.facebook.com/${META_API_VERSION:-v19.0}/me?access_token=${META_ACCESS_TOKEN}" >/dev/null 2>&1; then
    ok "Token Meta válido"
  else
    err "Token Meta inválido ou expirado. Gera novo."
  fi
fi

# ---------- 6. Conta de anúncios ----------
if [[ -n "${META_AD_ACCOUNT_ID:-}" && -n "${META_ACCESS_TOKEN:-}" ]]; then
  if curl -fsS "https://graph.facebook.com/${META_API_VERSION:-v19.0}/${META_AD_ACCOUNT_ID}?access_token=${META_ACCESS_TOKEN}" >/dev/null 2>&1; then
    ok "Conta $META_AD_ACCOUNT_ID acessível"
  else
    warn "Não consegui acessar $META_AD_ACCOUNT_ID. Confirma ID + permissão."
  fi
fi

# ---------- 7. Evolution Go ----------
EVO_URL="${EVOLUTION_API_URL:-http://localhost:8080}"
if curl -fsS "$EVO_URL/" >/dev/null 2>&1; then
  ok "Evolution rodando em $EVO_URL"

  # checa pareamento
  INST="${EVOLUTION_INSTANCE_NAME:-gestor}"
  STATE=$(curl -fsS -H "apikey: ${EVOLUTION_API_KEY:-}" "$EVO_URL/instance/connectionState/$INST" 2>/dev/null | grep -oE '"state":"[^"]+"' | cut -d'"' -f4 || echo "unknown")
  if [[ "$STATE" == "open" ]]; then
    ok "Instância '$INST' pareada"
  else
    warn "Instância '$INST' não pareada (state: $STATE). Roda: ./scripts/start-evolution.sh pair"
  fi
else
  warn "Evolution não está rodando."
  if ask "Subir agora via docker-compose?"; then
    bash scripts/start-evolution.sh
  fi
fi

# ---------- 8. Drive MCP ----------
if command -v claude >/dev/null 2>&1; then
  if claude mcp list 2>/dev/null | grep -q gdrive; then
    ok "Drive MCP configurado"
  else
    warn "Drive MCP não configurado."
    if ask "Instalar agora?"; then
      claude mcp add gdrive -- npx -y @modelcontextprotocol/server-gdrive
      info "Roda 'npx @modelcontextprotocol/server-gdrive auth' pra fazer OAuth."
    fi
  fi
else
  warn "Comando 'claude' não está no PATH. Instala Claude Code antes."
fi

# ---------- 9. Playwright ----------
if npx --no-install playwright --version >/dev/null 2>&1; then
  ok "Playwright instalado"
else
  warn "Playwright não instalado."
  if ask "Instalar agora? (~150MB, baixa Chromium)"; then
    bash scripts/install-playwright.sh
  fi
fi

# ---------- 10. Cron ----------
if crontab -l >/dev/null 2>&1 || [[ $? -eq 1 ]]; then
  ok "Cron acessível"
else
  warn "Cron pode não estar acessível. No macOS, dá Full Disk Access pro Terminal em System Settings > Privacy."
fi

# ---------- final ----------
echo ""
echo "================================================================"
ok "Setup concluído. Agora abre o Claude na pasta:"
echo "    cd $ROOT"
echo "    claude"
echo ""
info "Na primeira mensagem, manda 'bom dia' e a Skill Master te guia."
echo "================================================================"

mkdir -p .claude
touch .claude/.first-run-done

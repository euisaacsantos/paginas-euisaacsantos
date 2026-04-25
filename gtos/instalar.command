#!/bin/bash
set -e

# ── Header ────────────────────────────────────────────────────────────────────
cat << 'EOF'

 ██████╗ ████████╗ ██████╗ ███████╗
██╔════╝    ██╔══╝██╔═══██╗██╔════╝
██║  ███╗   ██║   ██║   ██║███████╗
██║   ██║   ██║   ██║   ██║╚════██║
╚██████╔╝   ██║   ╚██████╔╝███████║
 ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝

 Gestor de Tráfego · Sistema Operacional
 ──────────────────────────────────────────
 Instalação automática

EOF

ROOT="$(cd "$(dirname "$0")" && pwd)"
OS="$(uname -s)"

# ── Helpers ───────────────────────────────────────────────────────────────────
ok()   { echo "  ✅ $1"; }
info() { echo "  📦 $1"; }
err()  { echo "  ❌ $1"; exit 1; }
warn() { echo "  ⚠️  $1"; }

# ── 1. Python ─────────────────────────────────────────────────────────────────
echo "[1/4] Verificando Python..."

PYTHON=""
for cmd in python3.12 python3.11 python3.10 python3.9 python3 python; do
    if command -v "$cmd" &>/dev/null; then
        VER=$("$cmd" -c "import sys; print(sys.version_info[:2] >= (3,9))")
        if [ "$VER" = "True" ]; then
            PYTHON="$cmd"
            break
        fi
    fi
done

if [ -z "$PYTHON" ]; then
    info "Python 3.9+ não encontrado. Instalando..."

    if [ "$OS" = "Darwin" ]; then
        # macOS — tenta Homebrew, senão instala o próprio Homebrew
        if ! command -v brew &>/dev/null; then
            info "Instalando Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            # Adiciona brew ao PATH desta sessão
            eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null)"
        fi
        brew install python@3.12
        PYTHON=$(brew --prefix python@3.12)/bin/python3.12

    else
        # Linux (Ubuntu/Debian/Fedora)
        if command -v apt-get &>/dev/null; then
            sudo apt-get update -qq
            sudo apt-get install -y python3.12 python3.12-venv python3-pip
            PYTHON=python3.12
        elif command -v dnf &>/dev/null; then
            sudo dnf install -y python3.12
            PYTHON=python3.12
        else
            err "Não foi possível instalar Python automaticamente. Acesse https://python.org/downloads"
        fi
    fi

    command -v "$PYTHON" &>/dev/null || err "Python instalado mas não encontrado. Reinicie o terminal e execute novamente."
fi

PYVER=$("$PYTHON" --version 2>&1)
ok "$PYVER"

# ── 2. pip ────────────────────────────────────────────────────────────────────
echo ""
echo "[2/4] Atualizando pip..."
"$PYTHON" -m pip install --upgrade pip --quiet
ok "pip atualizado"

# ── 3. Node.js / Claude Code ──────────────────────────────────────────────────
echo ""
echo "[3/4] Verificando Claude Code..."

if ! command -v claude &>/dev/null; then
    info "Claude Code não encontrado. Verificando Node.js..."

    if ! command -v node &>/dev/null; then
        info "Instalando Node.js via nvm..."
        curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        # shellcheck disable=SC1091
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install --lts
        nvm use --lts
    fi

    info "Instalando Claude Code..."
    npm install -g @anthropic-ai/claude-code

    # Atualiza PATH desta sessão
    export PATH="$PATH:$(npm root -g)/../.bin"

    if ! command -v claude &>/dev/null; then
        warn "Claude Code instalado. Feche e abra um novo terminal,"
        warn "depois execute ./instalar.sh novamente para continuar."
        exit 1
    fi
fi

ok "Claude Code $(claude --version 2>&1 | head -1)"

# ── 4. Setup GTOS ─────────────────────────────────────────────────────────────
echo ""
echo "[4/4] Configurando GTOS..."
cd "$ROOT"
"$PYTHON" setup/wizard.py

echo ""
echo "  ✅ Instalação concluída!"
echo ""
echo "  Para iniciar o Jarvis em background:"
echo "    python scripts/jarvis.py --instalar"
echo ""

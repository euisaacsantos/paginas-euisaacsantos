# Claude para Gestores de Tráfego — Template Operacional

Sistema completo pra rodar suas contas de Meta Ads com Claude Code, Obsidian como cérebro de contexto, WhatsApp via Evolution Go pra alertas e relatórios, Google Drive pra criativos e Playwright pra espionar concorrentes.

Esse repositório é o ponto de partida da imersão de 25/04/2026. Você clona, roda o setup, abre o `claude` dentro da pasta e começa a operar.

## O que vem pronto

- **5 skills operacionais:** subir campanha, vigia 24h, relatório de cliente, diagnóstico de conta, espionagem de concorrente.
- **Skill Master (routing):** entende linguagem natural e chama a skill certa. Não precisa decorar slash command.
- **Vault Obsidian pré-montado:** templates de cliente, diagnóstico e criativo + cliente exemplo preenchido.
- **Docker Compose do Evolution Go V3:** sobe WhatsApp API self-hosted com Postgres e Redis em 1 comando.
- **Scripts de setup:** detectam o que falta e instalam.

## Pré-requisitos

| Ferramenta | Por quê | Como instalar |
|---|---|---|
| Claude Code | Motor que roda as skills | https://docs.claude.com/en/docs/claude-code |
| Docker Desktop | Sobe Evolution Go (WhatsApp) | https://www.docker.com/products/docker-desktop |
| Node 20+ | MCPs e Playwright | https://nodejs.org |
| Obsidian | Cérebro de contexto (opcional pra UI, vault funciona sem) | https://obsidian.md |
| Conta Meta Business | Acesso à Marketing API | https://business.facebook.com |

## Setup em 3 passos

```bash
# 1. Clone (ou baixe o zip)
git clone <url-do-template> minha-operacao
cd minha-operacao/documents

# 2. Move as skills pro local que o Claude Code lê
#    (vêm em ./skills/ no template; o Claude Code procura em ./.claude/skills/)
mkdir -p .claude
mv skills .claude/skills

# 3. Roda o setup — detecta deps, pergunta o que falta, instala o que dá
chmod +x scripts/*.sh
./scripts/setup.sh

# 4. Abre o Claude dentro da pasta
claude
```

Na primeira execução do `claude`, a Skill Master vai rodar `/check-deps` automaticamente e te dizer o que ainda falta configurar (ex: token da Meta, link do vault, API key do Evolution).

## Como usar

Não precisa decorar comando. Fala em português normal. A Skill Master roteia.

Exemplos reais:

- **"Sobe a campanha do Acme com esse drive: https://drive.google.com/..."** → `/subir-campanha`
- **"Liga o vigia da Padaria do Zé a cada 30min, CPA máximo R$25"** → `/vigia-24h`
- **"Manda o relatório semanal do Dr. Marcos pro WhatsApp dele"** → `/relatorio-cliente`
- **"Faz um diagnóstico da conta do Pet Shop Bicho Bom dos últimos 30 dias"** → `/diagnostico-conta`
- **"Começa a espionar a Smart Fit todo dia 8h"** → `/espionar-concorrente`

Se preferir disparar direto, use os slashes:

```
/subir-campanha
/vigia-24h
/relatorio-cliente
/diagnostico-conta
/espionar-concorrente
/setup
/check-deps
/install-missing
```

## Estrutura do repositório

```
documents/
├── CLAUDE.md                  # System prompt mestre (routing + regras)
├── .claude/skills/            # 6 skills (depois do setup; vêm em ./skills/ no template)
├── obsidian-vault/            # Vault que vira o cérebro do sistema
│   ├── _templates/            # Templates de cliente, diagnóstico, criativo
│   ├── clientes/              # 1 ficha por cliente
│   ├── criativos/             # Banco de criativos catalogados
│   ├── diagnosticos/          # Histórico de diagnósticos
│   ├── decisoes/              # Decisões tomadas (escalou, pausou, testou)
│   └── concorrentes/          # Snapshots da Biblioteca Meta
├── docker/                    # docker-compose do Evolution Go
├── scripts/                   # setup, check-deps, start-evolution, etc
├── .env.example               # Variáveis de ambiente
└── .gitignore
```

## Configuração mínima do `.env`

Copie `.env.example` pra `.env` e preencha:

- `OBSIDIAN_VAULT_PATH` — path absoluto do vault. Pode usar o `obsidian-vault/` que vem no template.
- `META_ACCESS_TOKEN` — token de longa duração da Marketing API.
- `META_AD_ACCOUNT_ID` — ID da conta de anúncios principal (formato `act_123...`).
- `EVOLUTION_API_URL` — `http://localhost:8080` se rodando local.
- `EVOLUTION_API_KEY` — gerada quando você sobe o Evolution.
- `EVOLUTION_INSTANCE_NAME` — nome da instância WhatsApp (padrão `gestor`).
- `GDRIVE_CREDENTIALS_PATH` — caminho do JSON do OAuth do Google Drive.

## Subindo o WhatsApp (Evolution Go V3)

```bash
./scripts/start-evolution.sh
# Sobe Postgres + Redis + Evolution na porta 8080
# Cria instância padrão "gestor" e gera QR code pra parear
```

A primeira vez você escaneia o QR no celular. Depois disso o pareamento persiste no volume Postgres.

## Troubleshooting

**`claude` não acha as skills.** Confirma que abriu o terminal dentro da pasta `documents/`. As skills vivem em `.claude/skills/` e só são carregadas se o cwd for esse.

**Evolution não sobe.** Verifica se a porta 8080 está livre (`lsof -i :8080`). Se não, edita `docker/docker-compose.yml` e troca a porta.

**Erro de credencial Meta.** Token expirou. Gera novo em https://developers.facebook.com/tools/explorer/ com permissões `ads_read`, `ads_management`, `business_management`.

**Drive MCP não autentica.** Roda `npx @modelcontextprotocol/server-gdrive auth` e segue o fluxo OAuth.

**Playwright não roda.** Falta instalar os browsers. `npx playwright install chromium`.

## Suporte

Comunidade da imersão. Canal `#suporte-tecnico` no Discord da turma 25/04/2026.

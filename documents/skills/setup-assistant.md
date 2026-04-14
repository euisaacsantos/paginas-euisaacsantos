---
name: setup-assistant
description: Skill auxiliar de setup e diagnóstico de dependências. Detecta o que está faltando (Docker, MCPs, Playwright, Evolution, credenciais Meta), orienta instalação e instala automaticamente onde possível. Disparada por /setup, /check-deps e /install-missing.
---

# /setup-assistant

## Quando usar

Sempre que:
- For a primeira execução da pasta (sem `.claude/.first-run-done`)
- Gestor digitar `/setup`, `/check-deps` ou `/install-missing`
- Outra skill falhar por dependência ausente
- Gestor perguntar "tá tudo configurado?", "o que falta?", "por que não funciona?"

## Como usar

Comandos:

- `/setup` — fluxo guiado completo, instala o que falta, configura `.env`
- `/check-deps` — só diagnostica, não instala. Mostra tabela
- `/install-missing` — pega o resultado do check e instala automaticamente

## Dependências verificadas (em ordem)

| # | Dep | Como verifica | Como instala |
|---|---|---|---|
| 1 | Docker | `docker --version` retorna 20+ | Orienta baixar Docker Desktop (manual) |
| 2 | Node | `node --version` retorna 20+ | Orienta `nvm install 20` ou homebrew |
| 3 | npm | `npm --version` | Vem com Node |
| 4 | `.env` existe | `test -f .env` | Copia de `.env.example` |
| 5 | Path Obsidian | `OBSIDIAN_VAULT_PATH` válido | Pergunta path ou usa `./obsidian-vault` |
| 6 | Token Meta | curl test endpoint `/me` com token | Orienta gerar em developers.facebook.com |
| 7 | Conta Meta acessível | curl `act_X/insights` | Confirma ID + permissões do token |
| 8 | Drive MCP | `claude mcp list` contém `gdrive` | `claude mcp add gdrive npx @modelcontextprotocol/server-gdrive` |
| 9 | Drive credenciais | `test -f $GDRIVE_CREDENTIALS_PATH` | Orienta criar OAuth no GCP Console |
| 10 | Evolution rodando | `curl localhost:8080/` | `./scripts/start-evolution.sh` |
| 11 | Instância WhatsApp pareada | `connectionState/$INSTANCE` = `open` | `./scripts/start-evolution.sh pair` |
| 12 | Playwright | `npx playwright --version` | `./scripts/install-playwright.sh` |
| 13 | Cron acessível | `crontab -l` não dá erro | macOS: dá Full Disk Access ao Terminal |

## Fluxo do `/check-deps`

Roda 13 verificações em paralelo onde possível. Mostra:

```
Diagnóstico de dependências — 14/04/2026 09:32

[OK] Docker 27.1.0
[OK] Node v20.10.0
[OK] npm 10.2.3
[OK] .env presente
[OK] Vault Obsidian: ./obsidian-vault (3 clientes)
[OK] Token Meta válido (expira em 47 dias)
[OK] Conta act_1234 acessível
[FALTA] Drive MCP não instalado
[FALTA] Credenciais Drive não configuradas
[OK] Evolution rodando (porta 8080)
[OK] Instância 'gestor' pareada
[FALTA] Playwright não instalado
[OK] Cron acessível

Resumo: 10/13 OK. 3 pendências.
Roda /install-missing pra resolver tudo de uma vez (vai pedir confirmação por etapa).
```

## Fluxo do `/install-missing`

Pra cada item `[FALTA]`:

1. Mostra o que vai fazer
2. Pede `[s/n]`
3. Executa
4. Re-checa

Não tenta instalar Docker (manual). Não tenta gerar token Meta (manual, mas abre a URL).

## Fluxo do `/setup` (primeira execução)

Mais conversacional que o `/check-deps`.

```
Bem-vindo ao Claude para Gestores de Tráfego.
Vou te configurar em ~5 minutos. Posso começar? [s/n]

[s]

1/6 — Onde fica seu vault Obsidian?
Default: ./obsidian-vault (vem montado no template)
Caminho: [enter pra default]

2/6 — Token de longa duração da Meta Marketing API:
Cola aqui (vai pro .env, não loga em lugar nenhum):
[token]

OK, validei. Conta principal: Acme Comércio (act_1234567890)

3/6 — Subir Evolution Go agora? Precisa de Docker rodando. [s/n]
[s]

Subindo containers... pronto.
QR code aberto no navegador. Pareia com seu WhatsApp.
[Pareado!]

4/6 — Número que vai receber alertas (com DDI, ex 5511999998888):
[5511999998888]

5/6 — Configurar Google Drive MCP agora? [s/n]
[s]

Instalando @modelcontextprotocol/server-gdrive...
Abrindo fluxo OAuth no navegador. Autoriza com a conta que tem acesso aos criativos.
[Autorizado!]

6/6 — Instalar Playwright (pra espionar concorrentes)? [s/n]
[s]

npx playwright install chromium...
Pronto.

Setup completo. Cria a primeira ficha de cliente:
- Vou copiar `_templates/cliente.md` pra `clientes/`
- Te ajudo a preencher
- Ou pula e fala "começa pelo Acme" mais tarde

Quer criar agora? [s/n]
```

## Configuração

Lê `.env`. Se não existe, copia de `.env.example` antes de continuar.
Salva flag `.claude/.first-run-done` ao final do `/setup`.

## Erros comuns

- **`docker ps` pede senha:** orienta adicionar usuário ao grupo `docker` (Linux) ou abrir Docker Desktop (macOS).
- **Token Meta sem permissão:** lista permissões necessárias e link pro Graph Explorer com `?permissions=ads_read,ads_management,business_management`.
- **OAuth Drive falha em headless:** orienta rodar setup em terminal com display gráfico.

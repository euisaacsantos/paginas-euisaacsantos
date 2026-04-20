# CLAUDE.md

Regras operacionais do repo. Contexto estratégico (avatar, narrativa, concorrentes, funil) fica no sistema de memória — não duplicar aqui.

## Projeto ativo

- **Produto:** "Claude para Gestores de Tráfego" (imersão low-ticket → **Mentoria Gestor de Tráfego Automático** premium)
- **Data:** sábado 02/05/2026 · 9h às 12h · **1 dia só, 3 horas** (nunca dizer "2 dias" ou "2 horas")

### Rotas ativas

| Rota | Arquivo | Função |
|---|---|---|
| `/` | `src/App.jsx` | Cura na Raiz legado — **NÃO MEXER** salvo pedido explícito |
| `/v1` | `src/AppV1.jsx` | LP principal (hero "Pare de subir campanha. Comece a COMANDAR.") |
| `/v2` | `src/AppV2.jsx` | Variação (hero "Claude Code operando suas contas. Como um gestor sênior. Enquanto você dorme.") |
| `/obrigado` | `src/AppObrigado.jsx` | Upsell Mesa de Comando — VSL + botão SIM/NÃO, CTAs com delay 30s |
| `/confirmado` | `src/AppConfirmado.jsx` | Boas-vindas pós-upsell (aceite ou recusa da Mesa caem aqui) |

## Stack

- Vite 8 + React 19 + Tailwind 3
- Sem React Router — roteamento manual via `window.location.pathname` em `src/main.jsx`
- Deploy: Vercel, auto-deploy a cada push em `main`
- Redis Cloud (config dinâmica de lotes + contadores de vendas)
- Vercel Functions em `/api/*` (dev local usa plugin `vercelApiDev` no `vite.config.js`)

## Arquitetura da config dinâmica

**Redis (keys):**
- `imersao:config` — JSON com 6 lotes (id, nome, preço, vagas_max, checkout, offer_code)
- `mesa:config` — JSON da Mesa (total, preco, checkout, offer_code)
- `imersao:vendas` — INT contador total
- `mesa:vendas` — INT contador Mesa

**Endpoints:**
- `GET /api/config` — config completa (cache 30s, stale 60s)
- `GET /api/vendas-live` — contadores rápidos pra polling (cache 5s, stale 10s)
- `POST /api/ticto-webhook?token=X` — postback Ticto incrementa vendas via `offer_code`
- `GET/POST /api/admin?token=X&action=get|incr|set` — manipulação manual

**Hook frontend:** `src/hooks/useConfig.js` — fetch `/api/config` + fallback hardcoded **sempre Lote 0** (segurança se API cair).

**Seed:** `npm run seed` popula `imersao:config` e `mesa:config` no Redis (preserva contadores existentes).

**Edição sem deploy:** Redis Desktop → edita `imersao:config` (JSON string) pra ajustar vagas/preço/link; cache expira em 30s.

## Ofertas Ticto configuradas

| Lote | Preço | Vagas | Offer code |
|---|---|---|---|
| 0 | R$ 9 | 100 | `OF2C85B97` |
| 1 | R$ 15 | 75 | `OE6189E11` |
| 2 | R$ 19 | 60 | `O7C22AADF` |
| 3 | R$ 27 | 50 | `OAC031B04` |
| 4 | R$ 37 | 50 | `O0B9F3ECB` |
| 5 | R$ 47 | 50 | `O7CE6EC04` |
| Mesa de Comando (upsell /obrigado) | R$ 497 | 15 | `OE7DEE344` |

**Ticto oneClickBuy:** script no `<head>` do `index.html`. Botões Mesa na `/obrigado` têm `data-fallback-offer={mesa.offer_code}` (vem do Redis). Redirect pós-upsell (aceite + recusa) deve ir pra `/confirmado` (configurar no painel Ticto).

## Env vars (Vercel + `.env` local)

- `REDIS_URL` — conexão Redis Cloud
- `TICTO_WEBHOOK_SECRET` — valida postback Ticto
- `ADMIN_SECRET` — protege `/api/admin`

`.env` está no `.gitignore` — NÃO commitar.

## Regras de edição

1. **Nunca tocar `src/App.jsx`** salvo pedido explícito (legado Cura na Raiz)
2. Novas features/copy da imersão vão em `src/AppV1.jsx`; espelhar em `src/AppV2.jsx` quando a mudança aplicar às duas
3. Estilos custom ficam no FINAL de `src/index.css` em blocos comentados (`/* ===== Nome ===== */`)
4. Componentes de uma página ficam dentro do próprio `AppV*.jsx`; componentes reutilizados em múltiplas páginas ficam em `src/components/`
5. **Zero CLS no hero V1:** `HeroTitle` usa ghost text `visibility: hidden` pra reservar espaço — não trocar por `min-height` calculado
6. **CTAs da `/obrigado` têm delay de 30s:** classe `.cta-delayed` + `body.ctas-visible` adicionado após setTimeout 30000ms (força pessoa ver vídeo antes de clicar)
7. Variações V3-V6 **foram deletadas** (Isaac não curtiu) — não recriar

## Regras de copy (afinadas em abr/2026)

**Manter nomes (familiares/posicionais):**
Claude Code · Obsidian · Evolution Go · Google Drive · Skill · Skill Master · Jarvis (só como nome da abertura da imersão)

**Esconder nomes técnicos:**
- Playwright → **"navegador autônomo"**
- MCP → omitir
- "Meta Ads" / "Google Ads" explícitos → apenas "suas contas" ou "conta de Ads"
- "demo" / "demonstração" → "exemplo" ou "seu caso real" (gringuismo no nicho)

**Comunicação com o lead:**
100% via WhatsApp (Evolution Go V3 self-hosted). **NÃO** email. **NÃO** grupo. Lembretes automáticos: 1 dia antes + véspera + 15 min antes.

**Big ideas ativas:**
- V1: "Pare de subir campanha. Comece a COMANDAR."
- V2: "Claude Code operando suas contas. Como um gestor sênior. Enquanto você dorme."

**Fecho padrão:** "Sem n8n. Sem workflow." (sem "Sem código" — foi cortado)

**Posicionamento da oferta (core):**
5 Skills (`/subir-campanha`, `/vigia-24h`, `/relatorio-cliente`, `/diagnostico-conta`, `/espionar-concorrente`) + Skill Master (system prompt que roteia linguagem natural pra skill certa) + Obsidian como memória. Substitui o framing antigo de "3 agentes". A Skill Master NÃO é slash — é o cérebro invisível.

**Voz/Jarvis não é pilar.** É feature e abertura viral da imersão. Menção curta na LP, sem dobra dedicada.

## Pasta `/documents/` (template do evento)

Repositório que o aluno baixa pra rodar `claude` dentro. Contém:
- `CLAUDE.md` mestre (routing por intenção)
- `skills/` com 6 SKILL.md (5 skills + setup-assistant)
- `obsidian-vault/` pré-montado com templates e cliente-exemplo
- `docker/docker-compose.yml` pra subir Evolution Go V3
- `scripts/` (`setup.sh`, `check-deps.sh`, `start-evolution.sh`, `install-playwright.sh`)

**Notas do setup:**
- Skills saíram em `documents/skills/` (não `.claude/skills/`) — sandbox bloqueou. O `setup.sh` move automaticamente na 1ª execução
- Aluno roda `chmod +x scripts/*.sh` antes do 1º setup (sandbox bloqueou o chmod inicial)

## Pitfalls de build (resolvidos — não reintroduzir)

- `@import` de fonte vem antes de `@tailwind` em `src/index.css` (PostCSS)
- Seletores Tailwind com `!` precisam escape: `.tech-card.\!p-8` (lightningcss)
- `vercel.json` rewrite não captura `/api/*`: `"source": "/((?!api/).*)"`

## Convenções de Git

- Commits em português, formato `tipo: descrição` (`feat:`, `fix:`, `chore:`)
- Co-Author trailer no final:
  ```
  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```
- Push direto em `main` (sem PR — projeto solo do Isaac)

## Comandos

```bash
npm run dev      # dev local :5173 (plugin serve /api/* em dev)
npm run build    # produção
npm run seed     # popula config no Redis (preserva contadores)
```

## Estilo de comunicação

- Direto, sem preamble. Tabela quando houver comparação.
- Isaac pede recomendação → UMA resposta clara, não menu.
- Implementação técnica: ir direto, mostrar resultado, evitar over-engineering.
- Quando Isaac corta sugestão inflada, copywriter sênior **encaixa a crítica** e reduz — não rebate com mais volume.

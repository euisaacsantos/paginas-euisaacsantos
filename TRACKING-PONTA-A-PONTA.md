# Tracking ponta-a-ponta — Imersão Claude Code

## Objetivo

Rastrear cada visitante do momento em que a LP carrega até a confirmação de compra no Ticto, amarrando PageView, AddToCart, Contact e Purchase sob o **mesmo `external_id`** (UUID persistente por visitante) e enriquecendo o evento server-side Purchase com `fbp`, `fbc`, IP, UA, geo e UTMs capturados no exato momento do clique no CTA. Resultado: deduplicação client/server perfeita, attribution robusto mesmo com adblocker, e match quality máximo pra Meta CAPI.

## Arquitetura

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Navegador (LP /v1)                                                           │
│                                                                              │
│ 1. Page load                                                                 │
│    main.jsx → cctGetExternalId() cria UUID em localStorage['cct_ext_id']     │
│    trackPageView() → Pixel fbq('track','PageView') + POST /api/meta-capi    │
│                     com external_id + fbp + fbc  (mesmo event_id → dedup)    │
│                                                                              │
│ 2. Click em <a href="checkout.ticto.app/...">                                │
│    main.jsx interceptor:                                                     │
│      - gera session_id (UUID novo)                                           │
│      - lê external_id (mesmo do PageView), fbp cookie, fbc cookie/fbclid    │
│      - lê UTMs da URL atual                                                  │
│      - POST /api/session-start { session_id, external_id, fbp, fbc,          │
│                                  utms, fbclid, landing_url } (keepalive)    │
│      - abre checkout com ?src=sess_<session_id> (preserva demais UTMs)       │
└──────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Vercel Functions                                                             │
│                                                                              │
│ /api/session-start       → INSERT cct_sessoes_checkout                       │
│                            (incluindo IP/UA/geo dos headers Vercel)          │
│                                                                              │
│ /api/meta-capi           → POST Meta Graph API (server-side)                 │
│                            user_data: external_id + fbp + fbc + ip + ua      │
│                            + geo (header Vercel)                             │
└──────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Ticto Checkout (browser) → pagamento → webhook v2                            │
└──────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ /api/ticto-webhook                                                           │
│   1. valida token + grava cct_webhook_raw (sempre)                           │
│   2. extrai tracking.src → sess_<uuid> → SELECT cct_sessoes_checkout         │
│   3. INSERT cct_vendas com session_id + external_id (se sessão achada)       │
│   4. INCR Redis imersao:vendas (ou mesa:vendas)                              │
│   5. Purchase CAPI → Meta Graph API                                          │
│      user_data: email/phone/nome/cpf (do payload) +                          │
│                 fbp/fbc/ip/ua/geo/external_id (da sessão — prioridade)       │
│      event_id = purchase_<transaction_id> (dedup Pixel browser se existir)   │
└──────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                     Meta Events Manager
```

## Componentes

| Arquivo | Papel |
|---|---|
| `src/main.jsx` | Roteador manual + interceptor de click no CTA Ticto (cria session_id, POST /api/session-start, propaga `?src=sess_<uuid>`). Inicializa `external_id` no load |
| `src/lib/meta-tracking.js` | `sendCAPI()` dispara Pixel + CAPI server com `event_id` compartilhado. Inclui `external_id` (UUID). Exporta `trackPageView/AddToCart/Contact` e `getExternalId` |
| `api/session-start.js` | Endpoint POST público. Recebe click snapshot (fbp/fbc/utms), captura IP/UA/geo dos headers Vercel, grava em `cct_sessoes_checkout` |
| `api/meta-capi.js` | Endpoint POST (recebe do browser). Repassa evento pra Meta Graph via `sendCapiEvent`, enriquecendo com IP/UA/geo dos headers |
| `api/ticto-webhook.js` | Recebe webhook Ticto v2, resolve sessão via `?src=sess_<uuid>`, grava venda, incrementa Redis, dispara Purchase CAPI enriquecido |
| `api/_meta-capi.js` | Helper `sendCapiEvent`: hasha PII (email/phone/fn/ln/cpf/external_id/city/region/country), deixa raw os técnicos (fbp/fbc/ip/ua) e posta pro Graph |
| `api/_supabase.js` | Singleton Supabase service role |
| `api/_redis.js` | Singleton ioredis |

## Schemas Supabase

### `cct_sessoes_checkout`

```sql
create table cct_sessoes_checkout (
  session_id uuid primary key,
  external_id text,
  fbp text,
  fbc text,
  client_ip_address text,
  client_user_agent text,
  city text,
  region text,
  country text,
  zip text,                           -- added: postal code dos headers Vercel
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  landing_url text,
  content_name text,
  value numeric,
  created_at timestamptz default now()
);
```

Cada linha é um **clique em CTA que levou ao checkout** (não é visita — é intenção de compra). `session_id` é o primary key propagado pra Ticto via `?src=sess_<uuid>`.

**⚠️ Geo vem URI-encoded dos headers Vercel** (ex: `S%C3%A3o%20Jos%C3%A9`). Os endpoints fazem `decodeURIComponent` antes de gravar, pra que SHA-256 bata com lado Meta.

### `cct_vendas`

Colunas de tracking acrescidas:
- `session_id uuid` (FK lógica pra `cct_sessoes_checkout`)
- `external_id text` (UUID do visitante — mesmo dos eventos browser)
- `meta_capi_sent boolean` — resultado do Purchase CAPI (true se Meta aceitou)
- `meta_capi_fbtrace_id text` — trace ID Meta, usado pra abrir ticket de suporte
- `meta_capi_error jsonb` — `{reason, status, error}` quando CAPI falha

Demais colunas pré-existentes: `ticto_transaction_id`, `status`, `offer_code`, `produto_tipo`, `lote_id`, `valor`, `email/telefone/nome`, UTMs, `fbclid`, `raw_payload`, `created_at`.

**SQL das adições (já rodadas):**
```sql
alter table cct_vendas
  add column session_id uuid,
  add column external_id text,
  add column meta_capi_sent boolean,
  add column meta_capi_fbtrace_id text,
  add column meta_capi_error jsonb;

create index on cct_vendas (session_id);
create index on cct_vendas (external_id);
create index on cct_vendas (meta_capi_sent);

alter table cct_sessoes_checkout add column zip text;
```

### `cct_webhook_raw`

Log imutável de todo POST recebido em `/api/ticto-webhook`: `endpoint`, `method`, `query` (token mascarado), `headers` (sanitizados), `body`, `response_status`, `response_body`, `processing_error`, `created_at`. Usado pra depurar payloads Ticto.

## Endpoints

### `POST /api/session-start`

Público (sem auth).

**Body:**
```json
{
  "session_id": "UUID",
  "external_id": "UUID",
  "fbp": "fb.1.<ts>.<id>",
  "fbc": "fb.1.<ts>.<fbclid>",
  "utm_source": "...", "utm_medium": "...", "utm_campaign": "...",
  "utm_content": "...", "utm_term": "...", "fbclid": "...",
  "landing_url": "https://..."
}
```

**Behavior:**
- Valida `session_id` obrigatório + pelo menos um de `fbp`/`external_id`
- Captura IP, UA, city, region, country dos headers Vercel
- INSERT `cct_sessoes_checkout`. Se `session_id` já existe, retorna `{ok:true, duplicate:true}` (retry-safe)
- Retorno: `200 {ok:true, session_id}` | `400 {ok:false, error}` | `500 {ok:false, error}`

### `POST /api/meta-capi`

Público. Chamado pelo browser pra cada evento (PageView/AddToCart/Contact).

**Body:**
```json
{
  "event_name": "PageView",
  "event_id": "eid_...",
  "event_source_url": "https://...",
  "user_data_client": { "fbp":"...", "fbc":"...", "external_id":"UUID" },
  "custom_data": { "currency":"BRL", "value":9 }
}
```

**Behavior:** monta `user_data` com fbp/fbc/external_id do browser + ip/ua/geo dos headers Vercel, posta pra Meta Graph. Retorna `{ok:true, events_received:1}`.

### `POST /api/ticto-webhook`

Protegido via `?token=<TICTO_WEBHOOK_SECRET>`.

**Behavior (ordem importa — CAPI roda ANTES do INSERT):**
1. Valida token → `401` se inválido
2. Filtra status (`approved/paid/authorized/aprovado/pago`)
3. Extrai `offer_code` + `transaction_id` → `200 ignored` se faltar
4. Se `tracking.src === "sess_<uuid>"` → SELECT `cct_sessoes_checkout`
5. Checa duplicata por `ticto_transaction_id` → `200 duplicate` se já existe
6. **Dispara Purchase CAPI** (com sessão + payload mesclados) → guarda `capiResult`
7. INSERT `cct_vendas` com `session_id`, `external_id` da sessão **+** `meta_capi_sent/fbtrace_id/error` do capiResult
8. INCR Redis `imersao:vendas` ou `mesa:vendas` conforme `offer_code`
9. Sempre grava `cct_webhook_raw` (inclusive em erro)

**Falha de CAPI não bloqueia venda** — INSERT acontece mesmo com `meta_capi_sent=false`. Erro detalhado fica em `meta_capi_error` pra reenvio manual posterior.

## Event IDs

| Evento | event_id | Origem dedup |
|---|---|---|
| PageView | `eid_<ts>_<rand>` | Mesmo ID no Pixel browser + /api/meta-capi server |
| AddToCart | `eid_<ts>_<rand>` | idem |
| Contact | `eid_<ts>_<rand>` | idem |
| Purchase (server) | `purchase_<ticto_transaction_id>` | Único por transação; caso o checkout Ticto dispare Pixel client com o mesmo ID, Meta dedup. Caso contrário, fica só server-side |

## user_data enviado pra Meta

| Campo | PageView / AddToCart / Contact | Purchase |
|---|---|---|
| `em` (email hash) | — (não temos no browser) | payload Ticto |
| `ph` (phone hash) | — | payload Ticto |
| `fn` / `ln` | — | payload Ticto (`customer.name` → split) |
| `external_id` | UUID localStorage (hash SHA256) | **sessão.external_id** (UUID) OU CPF como fallback |
| `fbp` | cookie `_fbp` (raw) | **sessão.fbp** (capturado no click) |
| `fbc` | cookie `_fbc` ou `fb.1.<ts>.<fbclid>` | **sessão.fbc** |
| `client_ip_address` | header Vercel | **sessão.client_ip_address** → fallback payload |
| `client_user_agent` | header Vercel | **sessão.client_user_agent** → fallback payload |
| `ct/st/country` (hash) | header Vercel (geo) | **sessão.city/region/country** → fallback payload |
| `zp` (zip hash) | — | payload Ticto (`customer.address.zip_code`) |

**Por que sessão > payload no Purchase:** o payload Ticto só tem dados do **checkout** (ip/ua do Ticto, geo do endereço de cobrança, UTMs que a Ticto preservou). A sessão tem os dados do **momento do clique na LP** — que é o que Meta precisa pra atribuir o lead à campanha certa.

## Fluxo em 3 cenários

### Cenário A — usuário com fbclid (melhor caso)

1. Chega na LP com `?fbclid=XYZ`
2. Pixel cria cookie `_fbp` automaticamente; não existe `_fbc` ainda
3. `main.jsx` → cria `external_id` UUID no localStorage
4. `trackPageView()` → Pixel + CAPI com fbp + fbc (gerado de fbclid) + external_id
5. Click no CTA: POST /api/session-start grava tudo. Meta match quality alto.
6. Compra → webhook resolve sessão → Purchase CAPI vai com fbp + fbc + external_id + email + phone + IP da LP + geo Vercel. **Match quality máximo.**

### Cenário B — usuário orgânico (sem fbclid)

1. Chega na LP direto (link, bio, compartilhamento)
2. Pixel cria cookie `_fbp`; sem `_fbc`
3. PageView vai com fbp + external_id (sem fbc)
4. Click → session-start grava fbp + external_id + UTMs (se houver)
5. Compra → Purchase CAPI sai com fbp + external_id + email + phone + IP/UA/geo. Meta atribui ao último touchpoint com fbp, ou atribui orgânico.

### Cenário C — adblocker (Pixel bloqueado)

1. Chega na LP; Pixel NÃO executa; cookie `_fbp` NÃO é criado
2. `external_id` ainda é criado (localStorage funciona sem Pixel)
3. trackPageView: `fbq` não existe (skip); CAPI server ainda sai com `external_id` + IP + UA + geo (mas sem fbp/fbc)
4. Click → session-start grava só external_id + UTMs + IP/UA/geo
5. Compra → Purchase CAPI sai server-side com email + phone + external_id + IP + UA + geo. **Meta ainda consegue fazer match via email/phone hash.** Sem adblocker no pixel do checkout Ticto (se houver), dedup via event_id.

## Como testar

Teste local requer `vercel dev` (o `npm run dev` do Vite puro não executa `/api/*`). Alternativamente, invoque handlers direto com Node — como foi feito na validação deste PR.

Smoke test manual contra produção:

```bash
# 1. session-start
SID=$(uuidgen | tr '[:upper:]' '[:lower:]')
EID=$(uuidgen | tr '[:upper:]' '[:lower:]')
curl -sX POST https://workshop.growthtap.com.br/api/session-start \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SID\",\"external_id\":\"$EID\",\"fbp\":\"fb.1.$(date +%s)000.1234567890\",\"utm_source\":\"teste\",\"landing_url\":\"https://workshop.growthtap.com.br/v1\"}"
# → {"ok":true,"session_id":"..."}

# 2. webhook Ticto mock (só em staging — cuidado com produção)
curl -sX POST "https://workshop.growthtap.com.br/api/ticto-webhook?token=$TICTO_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"status\":\"approved\",\"item\":{\"offer_code\":\"OFFER_MOCK\"},\"order\":{\"paid_amount\":900,\"transaction_hash\":\"TEST_$(date +%s)\"},\"customer\":{\"email\":\"t@t.com\",\"name\":\"Fulano\",\"phone\":{\"number\":\"11999998888\"},\"cpf\":\"12345678901\"},\"tracking\":{\"src\":\"sess_$SID\"}}"
# → {"ok":true,"supabase_saved":true,"capi_purchase":{"sent":true,"events_received":1}}
```

## Como debugar

| Onde olhar | O que verificar |
|---|---|
| Supabase → `cct_sessoes_checkout` | Sessão gravou? tem fbp/fbc/ip/ua/geo/zip sem URL-encoding? |
| Supabase → `cct_vendas` | Venda tem `session_id`/`external_id` + `meta_capi_sent=true`? |
| Supabase → `cct_webhook_raw` | Payload cru da Ticto (pra ver se `tracking.src` chegou como `sess_<uuid>`) |
| Vercel dashboard → Functions logs | Erros de `[session-start]`, `[ticto-webhook]`, `[meta-capi]` |
| Meta Events Manager → Test Events | Ver eventos chegando, match quality, dedup |
| Meta Events Manager → Diagnostics | Warnings de `event_id` duplicado, campos faltando |

### Queries úteis de auditoria

**Status Purchase CAPI por venda:**

```sql
select
  created_at, produto_tipo, lote_id, valor, email,
  meta_capi_sent, meta_capi_fbtrace_id, meta_capi_error,
  session_id, external_id
from cct_vendas
order by created_at desc
limit 20;
```

**Taxa de envio CAPI:**

```sql
select
  count(*) total,
  count(*) filter (where meta_capi_sent) as ok,
  count(*) filter (where meta_capi_sent = false) as erro,
  round(
    count(*) filter (where meta_capi_sent) * 100.0 / nullif(count(*), 0), 2
  ) as pct_sucesso
from cct_vendas;
```

**Vendas com erro CAPI pra reenvio manual:**

```sql
select
  ticto_transaction_id, email, valor, meta_capi_error, created_at
from cct_vendas
where meta_capi_sent = false
order by created_at desc;
```

**Cruzar venda com sessão (rastreio completo):**

```sql
select
  v.ticto_transaction_id, v.email, v.valor,
  v.meta_capi_sent, v.meta_capi_fbtrace_id,
  s.fbp, s.fbc, s.client_ip_address, s.city, s.region, s.country, s.zip,
  s.utm_source, s.utm_campaign, s.fbclid
from cct_vendas v
left join cct_sessoes_checkout s on s.session_id = v.session_id
order by v.created_at desc
limit 10;
```

## Edge cases

- **Sessão não chegou ao webhook** (race — webhook chega antes do INSERT completar, ou usuário cliclou antes do keepalive mandar): Purchase CAPI ainda dispara, mas sem fbp/fbc/external_id da sessão. Fallback usa dados do payload Ticto (ip/ua/geo do checkout, UTMs que Ticto preservou). `session_id/external_id` em `cct_vendas` ficam `null`.
- **Usuário clica em múltiplos CTAs**: cada click gera um `session_id` novo. O último click antes da compra é o que vence (porque o Ticto sobrescreve `src`). Ok — é o comportamento esperado.
- **src com prefixo diferente** (ex: Isaac configurou `src=abc123` manualmente no Ticto): handler só resolve sessão se começar com `sess_`. Caso contrário, `sessaoData=null` e fluxo segue com fallback payload.
- **localStorage bloqueado** (modo anônimo estrito): `getExternalId()` retorna `null`; eventos saem sem external_id. Dedup entre Pixel/CAPI continua via event_id.
- **Ticto v1 legacy**: `tracking.src` pode não vir. Handler trata como sessão não encontrada.

## Env vars necessárias

Server (Vercel):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`
- `REDIS_URL`
- `META_PIXEL_ID`, `META_ACCESS_TOKEN`
- `TICTO_WEBHOOK_SECRET`
- `ADMIN_SECRET` (usado por `/api/admin`, não pelo tracking)

Browser: Meta Pixel ID já está inline em `index.html`.

## Próximos passos conhecidos

1. **Domain Verification** no Business Manager (Meta → Brand Safety → Domains) → adiciona `growthtap.com.br` pra habilitar Aggregated Event Measurement (iOS 14.5+)
2. **Priorização de eventos** no Events Manager (Aggregated Event Measurement): configurar Purchase > AddToCart > PageView
3. **Conversion API Gateway** (futuro): roda container próprio pra bypass total de adblocker no client-side — considerar quando tráfego pago ultrapassar R$ 10k/mês
4. **Deduplicação do Pixel do checkout Ticto**: se o Ticto disparar seu próprio Pixel Purchase client-side, incluir mesmo `event_id = purchase_<transaction_hash>` na integração (hoje não há — só server-side sai)
5. **`content_ids` consistente**: hoje passa `offer_code`; considerar usar ID canônico de produto Ticto quando disponível

-- Rodar no SQL Editor do Supabase (uma vez)

CREATE TABLE IF NOT EXISTS cct_leads (
  id                   bigserial PRIMARY KEY,
  email                text NOT NULL,
  offer_code           text NOT NULL,
  status               text NOT NULL DEFAULT 'abandoned_cart',
  produto_tipo         text,
  lote_id              int,
  nome                 text,
  telefone             text,
  cpf                  text,
  valor                numeric,
  ticto_transaction_id text,
  utm_source           text,
  utm_medium           text,
  utm_campaign         text,
  utm_content          text,
  utm_term             text,
  fbclid               text,
  session_id           text,
  raw_payload          jsonb,
  abandoned_at         timestamptz,
  pix_generated_at     timestamptz,
  purchased_at         timestamptz,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  UNIQUE (email, offer_code)
);

CREATE TABLE IF NOT EXISTS cct_lead_eventos (
  id         bigserial PRIMARY KEY,
  lead_id    bigint REFERENCES cct_leads(id) ON DELETE CASCADE,
  email      text NOT NULL,
  offer_code text NOT NULL,
  tipo       text NOT NULL,
  dados      jsonb,
  criado_em  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_eventos_lead_id ON cct_lead_eventos(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_eventos_email   ON cct_lead_eventos(email);
CREATE INDEX IF NOT EXISTS idx_cct_leads_status     ON cct_leads(status);
CREATE INDEX IF NOT EXISTS idx_cct_leads_email      ON cct_leads(email);

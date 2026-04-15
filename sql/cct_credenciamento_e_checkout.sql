-- Tabelas para /credenciamento (gate de acesso ao Zoom) e /checkout (pré-checkout Mentoria)
-- Rodar no Supabase SQL Editor

-- ── /credenciamento: cada acesso ao evento ao vivo ─────────────────────────────
create table if not exists cct_credenciamento (
  id            bigserial primary key,
  email         text         not null,
  phone         text,
  source        text         not null default 'form',  -- 'form' | 'localStorage'
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  fbclid        text,
  gclid         text,
  ip            text,
  user_agent    text,
  city          text,
  region        text,
  country       text,
  created_at    timestamptz  not null default now()
);

create index if not exists idx_cct_credenciamento_email      on cct_credenciamento (email);
create index if not exists idx_cct_credenciamento_created_at on cct_credenciamento (created_at desc);

-- ── /checkout: pré-checkout da Mentoria (durante o evento) ─────────────────────
create table if not exists cct_checkout (
  id            bigserial primary key,
  email         text         not null,
  phone         text,
  name          text,
  source        text         not null default 'form',  -- 'form' | 'localStorage'
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  fbclid        text,
  gclid         text,
  ip            text,
  user_agent    text,
  city          text,
  region        text,
  country       text,
  created_at    timestamptz  not null default now()
);

create index if not exists idx_cct_checkout_email      on cct_checkout (email);
create index if not exists idx_cct_checkout_created_at on cct_checkout (created_at desc);

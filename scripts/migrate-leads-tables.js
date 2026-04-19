/**
 * Migra cct_leads_pendentes para o novo modelo:
 * - cct_leads: uma linha por lead por oferta, status progressivo
 * - cct_lead_eventos: histórico append-only de todos os eventos
 *
 * Rodar uma vez: node --env-file=.env scripts/migrate-leads-tables.js
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const STATUS_RANK = { abandoned_cart: 1, pix_generated: 2, purchased: 3 }

async function createTables() {
  console.log('Criando tabelas...')

  // cct_leads: estado atual de cada lead por oferta
  await supabase.rpc('exec_sql', { sql: `
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
  ` })

  // cct_lead_eventos: histórico append-only
  await supabase.rpc('exec_sql', { sql: `
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
  ` })

  console.log('Tabelas criadas.')
}

async function migrateData() {
  console.log('\nMigrando dados de cct_leads_pendentes...')

  const { data: rows, error } = await supabase
    .from('cct_leads_pendentes')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw new Error('Erro lendo cct_leads_pendentes: ' + error.message)
  console.log(`${rows.length} registros encontrados`)

  let inseridos = 0
  let atualizados = 0
  let eventos = 0

  for (const row of rows) {
    const status = row.kind === 'pix_generated' ? 'pix_generated' : 'abandoned_cart'
    const statusRank = STATUS_RANK[status]

    // Verifica se já existe lead para esse email+offer_code
    const { data: existente } = await supabase
      .from('cct_leads')
      .select('id, status')
      .eq('email', row.email)
      .eq('offer_code', row.offer_code)
      .maybeSingle()

    const tsField = status === 'pix_generated' ? 'pix_generated_at' : 'abandoned_at'
    const leadData = {
      email:                row.email,
      offer_code:           row.offer_code,
      produto_tipo:         row.produto_tipo,
      lote_id:              row.lote_id,
      nome:                 row.nome,
      telefone:             row.telefone,
      cpf:                  row.cpf,
      valor:                row.valor,
      ticto_transaction_id: row.ticto_transaction_id,
      utm_source:           row.utm_source,
      utm_medium:           row.utm_medium,
      utm_campaign:         row.utm_campaign,
      utm_content:          row.utm_content,
      utm_term:             row.utm_term,
      fbclid:               row.fbclid,
      session_id:           row.session_id,
      raw_payload:          row.raw_payload,
      [tsField]:            row.created_at,
      updated_at:           row.created_at,
    }

    let leadId
    if (!existente) {
      const { data: inserted, error: ie } = await supabase
        .from('cct_leads')
        .insert({ ...leadData, status, created_at: row.created_at })
        .select('id')
        .single()
      if (ie) { console.error('Erro insert:', row.email, ie.message); continue }
      leadId = inserted.id
      inseridos++
    } else {
      // Avança status se necessário
      const currentRank = STATUS_RANK[existente.status] || 0
      const patch = { ...leadData, updated_at: row.created_at }
      if (statusRank > currentRank) patch.status = status
      const { error: ue } = await supabase.from('cct_leads').update(patch).eq('id', existente.id)
      if (ue) { console.error('Erro update:', row.email, ue.message); continue }
      leadId = existente.id
      atualizados++
    }

    // Registra evento
    const { error: ee } = await supabase.from('cct_lead_eventos').insert({
      lead_id:   leadId,
      email:     row.email,
      offer_code: row.offer_code,
      tipo:      status,
      dados:     { transaction_id: row.ticto_transaction_id, valor: row.valor, expires_at: row.expires_at },
      criado_em: row.created_at,
    })
    if (ee) console.error('Erro evento:', row.email, ee.message)
    else eventos++
  }

  console.log(`\nMigração: ${inseridos} inseridos, ${atualizados} atualizados, ${eventos} eventos`)
}

async function migratePurchases() {
  console.log('\nMarcando compradores em cct_leads...')

  const { data: vendas, error } = await supabase
    .from('cct_vendas')
    .select('email, offer_code, ticto_transaction_id, valor, created_at')
    .in('produto_tipo', ['imersao', 'mesa'])
    .order('created_at', { ascending: true })

  if (error) throw new Error('Erro lendo cct_vendas: ' + error.message)

  let atualizados = 0
  let novos = 0

  for (const venda of vendas) {
    const { data: existente } = await supabase
      .from('cct_leads')
      .select('id')
      .eq('email', venda.email)
      .eq('offer_code', venda.offer_code)
      .maybeSingle()

    if (existente) {
      await supabase.from('cct_leads').update({
        status: 'purchased',
        purchased_at: venda.created_at,
        updated_at: venda.created_at,
      }).eq('id', existente.id)

      await supabase.from('cct_lead_eventos').insert({
        lead_id: existente.id,
        email: venda.email,
        offer_code: venda.offer_code,
        tipo: 'purchased',
        dados: { transaction_id: venda.ticto_transaction_id, valor: venda.valor },
        criado_em: venda.created_at,
      })
      atualizados++
    } else {
      // Comprou direto sem abandonar nem gerar PIX
      const { data: inserted } = await supabase
        .from('cct_leads')
        .insert({
          email: venda.email,
          offer_code: venda.offer_code,
          status: 'purchased',
          purchased_at: venda.created_at,
          ticto_transaction_id: venda.ticto_transaction_id,
          valor: venda.valor,
          created_at: venda.created_at,
          updated_at: venda.created_at,
        })
        .select('id')
        .single()

      if (inserted) {
        await supabase.from('cct_lead_eventos').insert({
          lead_id: inserted.id,
          email: venda.email,
          offer_code: venda.offer_code,
          tipo: 'purchased',
          dados: { transaction_id: venda.ticto_transaction_id, valor: venda.valor },
          criado_em: venda.created_at,
        })
      }
      novos++
    }
  }

  console.log(`Compradores: ${atualizados} atualizados, ${novos} novos`)
}

async function main() {
  await createTables()
  await migrateData()
  await migratePurchases()
  console.log('\nMigração concluída.')
}

main().catch((e) => { console.error(e); process.exit(1) })

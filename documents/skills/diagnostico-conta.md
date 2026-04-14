---
name: diagnostico-conta
description: Faz raio-X completo de uma conta de Meta Ads dos últimos 30 dias e gera diagnóstico estratégico (escalar, pausar, testar). Usa contexto do Obsidian se existir; se não, pergunta interativamente os dados básicos do negócio. Salva diagnóstico de volta no vault.
---

# /diagnostico-conta

## Quando usar

Use quando o gestor pedir pra:
- "Analisa a conta do Acme"
- "Por que o CPA do Dr. Marcos disparou?"
- "Vale escalar a Padaria do Zé?"
- "Faz um raio-X dos últimos 30 dias"
- "Diagnóstico geral, tô perdendo dinheiro?"

NÃO use quando:
- Quer só relatório periódico (use `/relatorio-cliente`)
- Quer monitoramento contínuo (use `/vigia-24h`)

## Como usar

Frases que disparam:

- "Diagnóstico do Acme"
- "Faz uma análise da conta do Pet Shop Bicho Bom dos últimos 30 dias"
- "Por que a Padaria do Zé piorou esse mês?"
- "Vale escalar o Dr. Marcos?"

## Dependências

- `META_ACCESS_TOKEN` e `META_AD_ACCOUNT_ID` no `.env`
- Vault Obsidian acessível
- Opcional: Evolution Go (se gestor quiser receber via WhatsApp)

## Fluxo

1. **Verifica contexto.**
   - Se `obsidian-vault/clientes/<slug>.md` existe e está completo → usa direto.
   - Se não existe → entra em modo onboarding interativo:
     ```
     Não tenho ficha do Pet Shop Bicho Bom ainda. Me responde rápido:
     1. Tipo de negócio: e-commerce, negócio local, prestador de serviço, infoproduto?
     2. Ticket médio (R$):
     3. CPA aceitável (R$):
     4. ROAS mínimo (se e-commerce):
     5. ID da conta de anúncios (act_...):
     ```
     Cria a ficha conforme `_templates/cliente.md` ao final.

2. **Puxa dados Meta API (últimos 30 dias).**
   - Por campanha: gasto, conversões, CPA, ROAS, frequência, CTR, CPM
   - Por adset: mesmo + público, posicionamento
   - Por anúncio: mesmo + criativo, hook (se nomenclatura permite)
   - Saldo da conta + método de pagamento ativo
   - Status do pixel (eventos disparados nos últimos 7d)

3. **Analisa em 5 dimensões:**

   **a. Eficiência por campanha**
   - CPA médio vs alvo
   - Outliers (campanhas com CPA 2x acima da média)
   - Concentração (1 campanha responde por X% do gasto?)

   **b. Saúde de público**
   - Frequência > 3 = audience fatigue
   - Sobreposição entre adsets (compara públicos)
   - Lookalikes vs interesse: qual entrega melhor

   **c. Performance de criativo**
   - Top 3 e bottom 3 por CPA
   - CTR < 0.8% = criativo fraco
   - Padrões: vídeo vs imagem vs carrossel

   **d. Funil completo (se Pixel disponível)**
   - Impressão → Clique (CTR)
   - Clique → Visita (% de bounce)
   - Visita → Add to cart
   - Add to cart → Compra
   - Identifica gargalo

   **e. Tendência temporal**
   - CPA dos últimos 7d vs 8-14d vs 15-30d (degradação?)
   - Variação intra-semana (final de semana cai?)

4. **Gera diagnóstico estruturado:**
   ```
   Diagnóstico Pet Shop Bicho Bom — 14/03 a 13/04/2026

   Veredito: ESCALAR COM AJUSTES

   Pontos fortes
   - Lookalike 1% compradores entrega CPA R$ 18 (alvo R$ 25)
   - Criativo VideoDoresPet vira top com CTR 2.1%

   Pontos fracos
   - Adset Interesse_AmantesAnimais com frequência 4.8 (saturação)
   - 60% do gasto concentrado em 1 campanha (risco)

   Ações recomendadas (ordem de prioridade)
   1. ESCALAR: aumentar Lookalike1% +50% (R$ 80/dia → R$ 120/dia)
   2. PAUSAR: Interesse_AmantesAnimais (frequência alta, CPA R$ 42)
   3. TESTAR: 3 novas variações de VideoDoresPet (mudar gancho de abertura)
   4. DIVERSIFICAR: subir 2ª campanha lookalike de adicionados ao carrinho

   Risco se não agir
   Frequência subindo no único adset performando = degradação em 7-14d.
   ```

5. **Salva no vault.** `obsidian-vault/diagnosticos/2026-04-13-pet-shop-bicho-bom.md` com frontmatter:
   ```yaml
   ---
   cliente: pet-shop-bicho-bom
   data: 2026-04-13
   periodo: 30d
   veredito: escalar-com-ajustes
   acoes_recomendadas: 4
   ---
   ```

6. **Pergunta se quer aplicar.**
   ```
   Quer que eu execute as ações 1 e 2 agora? (3 e 4 precisam de criativo novo)
   [s/n]
   ```
   Se sim, dispara `/subir-campanha` (ação 4) ou edição via Marketing API (1, 2).

7. **Notifica.** Se o gestor pediu via WhatsApp, manda resumo. Senão, responde no terminal.

## Configuração

Espera no Obsidian (cliente). Se faltar, pergunta:
```yaml
slug: pet-shop-bicho-bom
nome: Pet Shop Bicho Bom
nicho: e-commerce pet
ticket_medio: 95
cpa_alvo: 25
roas_alvo: 3.5
ad_account_id: act_111
pixel_id: 222
funil_esperado: impressao -> clique -> visita -> ATC -> compra
```

## Critérios de veredito

| Cenário | Veredito |
|---|---|
| CPA < alvo + ROAS > alvo + frequência < 3 | ESCALAR |
| CPA na faixa do alvo + sinais mistos | ESCALAR COM AJUSTES |
| CPA > alvo + criativos saturados | PAUSAR E REFAZER |
| Sem dados suficientes (< 50 conversões/mês) | TESTAR MAIS |

## Erros comuns

- **Pixel sem eventos:** "Pixel `222` não disparou nenhum evento nos últimos 7d. Diagnóstico vai ficar capenga sem isso. Confere no Events Manager."
- **Conta sem gasto recente:** "Conta `act_X` gastou R$ 0 nos últimos 30d. Quer diagnosticar período mais antigo?"
- **Sem ficha de cliente:** entra em modo onboarding (vide passo 1).

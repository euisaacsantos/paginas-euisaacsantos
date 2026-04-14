---
name: relatorio-cliente
description: Gera relatório narrativo de performance de Meta Ads pra um cliente em determinado período. Lê contexto no Obsidian, analisa nomenclatura das campanhas e envia o relatório via WhatsApp. Foco em narrativa (não planilhão) — o que aconteceu, por que, o que fazer.
---

# /relatorio-cliente

## Quando usar

Use quando o gestor pedir pra:
- "Manda o relatório semanal do Acme"
- "Fecha o mês do Dr. Marcos"
- "Como tá a Padaria do Zé essa semana?"
- "Envia performance dos últimos 7 dias pro WhatsApp do cliente"

NÃO use quando:
- Quer recomendação acionável profunda (use `/diagnostico-conta`)
- Só conferir CPA agora (responde direto sem gerar relatório formal)

## Como usar

Frases que disparam:

- "Relatório do Acme dos últimos 7 dias"
- "Fecha abril do Dr. Marcos e manda pro WhatsApp dele"
- "Manda o report semanal de todos os clientes ativos"
- "Performance da Padaria do Zé desde ontem"

Mínimo necessário: **cliente + período**. Período aceita: "ontem", "últimos 7 dias", "essa semana", "mês passado", "01/04 a 13/04", "abril", "últimos 30d".

## Dependências

- `META_ACCESS_TOKEN` e `META_AD_ACCOUNT_ID` no `.env`
- Evolution Go pareado (se for enviar via WhatsApp)
- Vault Obsidian com ficha do cliente

## Fluxo

1. **Lê contexto.** `obsidian-vault/clientes/<slug>.md`. Pega `nome`, `nicho`, `cpa_alvo`, `roas_alvo`, `ticket_medio`, `whatsapp_cliente` (se existir).

2. **Puxa dados Meta API.** Insights por campanha no período: gasto, impressões, cliques, CPM, CTR, CPC, conversões, custo/conversão, ROAS, valor de conversão.

3. **Analisa nomenclatura.** Lê nomes das campanhas. Tenta inferir objetivo / público / criativo pelo padrão. Se a nomenclatura for óbvia (`Acme_Conversao_Lookalike1_VideoDor_2026-04-15`), usa direto. Se for caótica (`teste 1`, `final-final-2`), pergunta:
   ```
   Encontrei essas campanhas:
   - cmp_001 (gasto R$ 1.200, 24 conversões)
   - teste-novo-pub (gasto R$ 800, 18 conversões)
   - final-final-2 (gasto R$ 600, 9 conversões)

   Me ajuda a entender: o que cada uma testa? (responde em 1 linha cada ou pula com 's')
   ```

4. **Compara com período anterior.** Se relatório dos últimos 7d, compara com 7d anteriores. Calcula delta % de cada métrica.

5. **Escreve narrativa.** Estrutura:
   ```
   Relatório Acme — 07/04 a 13/04

   Resumo
   Investimento: R$ 4.820 (+12% vs semana anterior)
   Conversões: 142 (+18%)
   CPA: R$ 33,94 (-5%, abaixo do alvo R$ 35)
   ROAS: 4,2 (estável)

   O que funcionou
   Lookalike 1% baseado em compradores 180d performou 28% melhor que interesse direto.
   Criativo VideoDorTesteB virou top 1: CPA R$ 27 vs média R$ 33.

   O que não funcionou
   Adset Interesse_ModaPremium gastou R$ 600 com CPA R$ 58. Recomendo pausar.

   Próximos passos sugeridos
   1. Pausar Interesse_ModaPremium
   2. Escalar VideoDorTesteB +30% no orçamento
   3. Testar lookalike 2% como expansão
   ```

6. **Envia.**
   - Por padrão envia pro WhatsApp do gestor (`WHATSAPP_DESTINO`).
   - Se gestor pediu "manda pro WhatsApp dele/dela" e a ficha tem `whatsapp_cliente`, envia pro número do cliente em vez disso (com tom adaptado, sem "recomendo pausar" — vira "vou pausar amanhã").
   - Salva PDF/MD em `obsidian-vault/relatorios/YYYY-MM-DD-<cliente>.md`.

7. **Confirma envio.** "Relatório enviado pro 5511999998888. Salvo em `obsidian-vault/relatorios/2026-04-13-acme.md`."

## Configuração

Espera no Obsidian (cliente):
```yaml
nome: Acme Comércio
cpa_alvo: 35
roas_alvo: 4
ticket_medio: 180
whatsapp_cliente: 5511988887777   # opcional, só se gestor envia direto pro cliente
tom_relatorio_cliente: leve, sem jargão técnico
```

## Tom do relatório

- **Pra gestor:** técnico, recomendação direta, número exato.
- **Pra cliente final:** narrativa simples, evita siglas (CPA → "custo por venda"), enfatiza o ganho.

A skill detecta o destino e adapta o tom.

## Erros comuns

- **Sem dados no período:** "Conta `act_X` não teve gasto entre 07/04 e 13/04. Quer escolher outro período?"
- **WhatsApp do cliente não cadastrado:** pergunta uma vez, salva no vault.
- **Período ambíguo ("essa semana"):** assume segunda-feira até hoje. Confirma com o gestor.

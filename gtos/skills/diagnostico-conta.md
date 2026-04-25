# Skill: /diagnostico-conta

## Objetivo
Análise estruturada da conta com olho de gestor sênior: o que escalar, o que pausar, o que testar.

## Fluxo de execução

### 1. Selecionar conta e período
Pergunte qual cliente. Período padrão: últimos 30 dias.

### 2. Puxar dados completos
```bash
# Visão geral da conta
python scripts/meta_api.py --account [ACCOUNT_ID] --action health

# Campanhas
python scripts/meta_api.py --account [ACCOUNT_ID] --action campaigns
```

Para cada campanha ativa, busque insights por conjunto de anúncios.

### 3. Classificar cada campanha/conjunto

Para cada item, classifique em uma das categorias:

| Categoria | Critério | Ação |
|---|---|---|
| 🚀 ESCALAR | ROAS > meta, CPA < meta, sem limitação de frequência | Aumentar orçamento 20-30% |
| ✅ MANTER | Dentro das metas, estável | Não mexer |
| 🧪 TESTAR | Novo, sem dados suficientes (<R$50 de gasto) | Aguardar mais dados |
| ⚠️ OTIMIZAR | Próximo das metas mas com problema específico | Ajuste pontual |
| ⏸️ PAUSAR | Abaixo das metas consistentemente por 7+ dias | Pausar e analisar |

### 4. Gerar diagnóstico estruturado
```
🔍 DIAGNÓSTICO — [Cliente]
Período: últimos 30 dias
Analisado em: [data/hora]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VISÃO GERAL DA CONTA
Gasto total: R$X
Resultado (objetivo): X
CPA médio: R$X (meta: R$X)
ROAS: X (meta: X)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POR CAMPANHA

🚀 ESCALAR (X campanhas)
• [Nome] — ROAS X, CPA R$X — sugestão: aumentar orçamento para R$X/dia

✅ MANTER (X campanhas)
• [Nome] — estável, dentro das metas

⏸️ PAUSAR (X campanhas)
• [Nome] — X dias acima do CPA meta, R$X gasto sem resultado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLANO DE AÇÃO PRIORITÁRIO

1. [Ação mais urgente — impacto maior]
2. [Segunda ação]
3. [Terceira ação]

Quer que eu execute alguma dessas ações agora?
```

### 5. Executar ações (somente com confirmação)
Se o usuário confirmar pausas ou ajustes de orçamento, execute via `scripts/meta_api.py`:
- Pausar: `pause_object(campaign_id)`
- Reativar: `resume_object(campaign_id)`
- Ajustar orçamento: use a API diretamente

### 6. Salvar diagnóstico
Salve em `clientes/[slug]/relatorios/diagnostico-[data].md`.

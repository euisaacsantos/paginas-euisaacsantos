# Skill: /vigia-24h

## Objetivo
Monitorar a saúde de uma conta de Ads e enviar alerta via WhatsApp antes do cliente perceber o problema.

## Fluxo de execução

### 1. Selecionar conta
Pergunte qual cliente monitorar, ou "todos" para varrer todos os clientes ativos.
Leia `clientes/_index.md` para listar opções.

### 2. Buscar dados da conta
Para cada cliente selecionado:
```bash
python scripts/meta_api.py --account [ACCOUNT_ID] --action health
```

O resultado inclui: spend hoje, spend últimos 7 dias, impressões, cliques, CTR, CPM, compras.

### 3. Analisar saúde da conta
Avalie com olho de gestor sênior:

**Sinais de alerta (enviar mensagem):**
- CTR abaixo de 0.8% em campanhas de tráfego
- CPM aumentou >30% vs média dos últimos 7 dias
- Gasto hoje < 50% do orçamento diário (conta pausada ou com problema de entrega)
- Zero compras com gasto > R$100 no dia
- Frequência > 3.5 em públicos pequenos

**Situação normal:**
- CTR > 1%, CPM estável, gasto dentro do esperado, ROAS positivo

### 4. Gerar diagnóstico
Para cada conta, produza:
```
[CLIENTE: Nome]
Status: ⚠️ ATENÇÃO / ✅ NORMAL

Hoje:
- Gasto: R$X
- Impressões: X
- Cliques: X (CTR: X%)
- Compras: X

Alertas:
- [lista de problemas detectados]

Recomendação:
- [ação sugerida]
```

### 5. Perguntar antes de enviar
Exiba o diagnóstico completo e pergunte:
```
Enviar este alerta via WhatsApp para [número do cliente]? [S/n]
```

Somente após confirmação, use `scripts/evo_api.py` para enviar.

### 6. Registrar monitoramento
Salve o resultado em `clientes/[slug]/relatorios/vigia-[data].md`.

## Modo automático (cron)
Para rodar sem interação (alertas automáticos), o usuário pode configurar:
```bash
# crontab -e
0 */3 * * * cd /path/to/gtos && claude -p "rode /vigia-24h em todos os clientes e envie alertas automaticamente se houver problemas críticos"
```
Neste modo: envie alerta automaticamente apenas para problemas críticos (CTR zero, conta pausada inesperadamente, gasto zerado).

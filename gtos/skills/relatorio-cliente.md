# Skill: /relatorio-cliente

## Objetivo
Gerar relatório narrativo com contexto do negócio do cliente e enviar via WhatsApp após aprovação.

## Fluxo de execução

### 1. Selecionar cliente e período
Pergunte qual cliente e período (padrão: últimos 7 dias).
Leia `clientes/[slug]/conta.md` para contexto do negócio.

### 2. Puxar dados da conta
```bash
python scripts/meta_api.py --account [ACCOUNT_ID] --action insights --preset last_7d
```
Também busque por campanha para ter detalhes:
```bash
python scripts/meta_api.py --account [ACCOUNT_ID] --action insights --preset last_7d
```

### 3. Redigir relatório narrativo
Escreva como um gestor sênior explicando para o dono do negócio.
Use o contexto de `clientes/[slug]/conta.md` para personalizar (nicho, objetivo, histórico).

**Estrutura do relatório:**
```markdown
📊 Relatório de Performance — [Cliente]
Período: [data início] a [data fim]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 RESULTADOS DO PERÍODO
• Investimento: R$X
• Alcance: X pessoas
• Cliques: X (CTR: X%)
• [Conversões/Leads/Vendas]: X
• Custo por [objetivo]: R$X

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ O QUE FUNCIONOU
[2-3 pontos positivos com contexto do negócio]

⚠️ PONTOS DE ATENÇÃO
[1-2 pontos que precisam de ajuste — nunca dizer "ruim", sempre propositivo]

🎯 PRÓXIMOS PASSOS
[2-3 ações concretas que serão tomadas]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Qualquer dúvida, só chamar! 🙌
```

**Tom:** profissional mas acessível. Sem jargão técnico (não diga "CTR", diga "taxa de cliques"). Contextualize os números com o negócio do cliente.

### 4. Salvar rascunho
```bash
# Salva em clientes/[slug]/relatorios/relatorio-[data].md
```

### 5. Aprovação obrigatória
Exiba o relatório completo e pergunte:
```
Relatório gerado. O que quer fazer?
[1] Enviar via WhatsApp agora
[2] Editar antes de enviar
[3] Enviar para aprovação no Telegram
[4] Salvar só localmente
```

Se Telegram configurado (opção 3):
```bash
python scripts/telegram_aprovacao.py --arquivo clientes/[slug]/relatorios/relatorio-[data].md --cliente [slug]
```
O bot envia o rascunho para você no Telegram com botões ✅ Aprovar / ✏️ Editar / ❌ Cancelar.

### 6. Envio via WhatsApp (somente após aprovação)
```bash
python scripts/evo_api.py --phone [WHATSAPP_CLIENTE] --msg "[texto_do_relatorio]"
```

### 7. Registrar envio
Atualize `clientes/[slug]/conta.md` com a data do último relatório enviado.

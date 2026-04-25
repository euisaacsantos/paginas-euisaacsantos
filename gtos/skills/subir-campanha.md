# Skill: /subir-campanha

## Objetivo
Criar uma nova campanha clonando a estrutura de uma que já funciona, com briefing do operador e criativos do Google Drive.

## Fluxo de execução

### 1. Identificar o cliente
Pergunte (ou identifique pelo contexto): para qual cliente é esta campanha?
Leia `clientes/[slug]/conta.md` para obter o account_id.

### 2. Buscar campanhas existentes
```bash
python scripts/meta_api.py --account [ACCOUNT_ID] --action campaigns
```
Liste as campanhas ativas. Pergunte qual será clonada como base (ou deixe o usuário descrever o objetivo da nova).

### 3. Briefing da nova campanha
Pergunte:
- Objetivo da campanha (tráfego, conversão, leads?)
- Público-alvo (descrição informal está ok — traduza para parâmetros de segmentação)
- Orçamento diário
- Período: data de início e fim (ou sem fim)
- Nome interno da campanha

### 4. Criativos do Google Drive
Pergunte o link da pasta do Google Drive com os criativos (imagens/vídeos).
Liste os arquivos disponíveis com:
```bash
# Se gdrive CLI estiver instalado:
gdrive files list --query "parents in '[FOLDER_ID]'"
# Alternativa: peça ao usuário que cole os links diretos
```
Confirme quais criativos serão usados.

### 5. Montar estrutura da campanha
Com base no briefing e nos criativos, construa o payload da campanha.
Apresente um resumo para aprovação antes de criar:

```
📋 RESUMO DA CAMPANHA
─────────────────────
Cliente:     [nome]
Nome:        [nome_campanha]
Objetivo:    [objective]
Orçamento:   R$[budget]/dia
Público:     [descrição]
Criativos:   [N arquivos]
─────────────────────
Confirma? [S/n]
```

### 6. Criar via API (somente após confirmação)
Use os endpoints da Meta Graph API via `scripts/meta_api.py`.
Para criações complexas, gere o código Python e execute via shell.

### 7. Registrar no contexto do cliente
Após criar, adicione uma entrada em `clientes/[slug]/conta.md`:
```markdown
## Campanhas Criadas
| Data | Nome | ID | Objetivo |
|---|---|---|---|
| [data] | [nome] | [id] | [objetivo] |
```

## Observações
- Sempre clonar targeting e bid strategy de campanhas que já têm histórico positivo
- Novos criativos em novos conjuntos, nunca substituir criativos em conjuntos com histórico
- Confirmar antes de qualquer criação — campanhas criadas erradas geram gasto

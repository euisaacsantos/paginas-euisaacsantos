# Skill: /espionar-concorrente

## Objetivo
Catalogar e monitorar a biblioteca de anúncios de concorrentes. Detectar anúncios novos a cada verificação.

## Fluxo de execução

### Opção A — Adicionar novo concorrente
Se o usuário quer espionar alguém novo:

1. Pergunte o nome da marca/empresa
2. Pergunte o Page ID do Facebook (encontrado na URL da página: facebook.com/[slug] → veja o ID nas configurações, ou use a URL da Ads Library)
3. Execute:
```bash
python scripts/espionar.py --adicionar "[Nome]" --page-id "[PAGE_ID]"
```
4. Após adicionar, pergunte se quer fazer a primeira varredura agora:
```bash
python scripts/espionar.py --atualizar "[slug]"
```

### Opção B — Atualizar concorrente existente
Se o usuário quer ver o que é novo:

1. Liste concorrentes disponíveis:
```bash
python scripts/espionar.py --listar
```
2. Pergunte qual atualizar (ou "todos")
3. Execute:
```bash
python scripts/espionar.py --atualizar "[slug]"
# ou
python scripts/espionar.py --atualizar-todos
```

### O que o script faz
- **Primeira execução:** abre o navegador, carrega a biblioteca de anúncios, cataloga todos os anúncios ativos com título, copy, thumbnail e data de início
- **Execuções seguintes:** compara com o catálogo salvo, baixa e registra somente os anúncios novos
- Thumbnails salvos em `concorrentes/[slug]/ads/[id]/thumbnail.jpg`
- Catálogo completo em `concorrentes/[slug]/catalog.json`
- Resumo legível em `concorrentes/[slug]/_index.md`

### Após a varredura
Leia `concorrentes/[slug]/_index.md` e apresente um resumo:
- Quantos anúncios no total
- Quantos são novos desde a última verificação
- Quais são os anúncios novos (título + copy curto)
- Algum padrão notável (ex: "estão testando vídeos", "mesma copy há 30 dias = tá funcionando")

### Análise estratégica (opcional)
Se o usuário pedir, analise os anúncios catalogados e identifique:
- Ângulos de copy mais usados
- Formatos predominantes (imagem, vídeo, carrossel)
- CTAs frequentes
- Promoções ou ofertas recorrentes
- Duração média dos anúncios (anúncio que roda há muito tempo = está lucrativo)

Use os dados de `concorrentes/[slug]/catalog.json` para esta análise.

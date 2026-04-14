---
name: espionar-concorrente
description: Cria cronjob com Playwright que varre a Biblioteca de Anúncios da Meta procurando criativos novos de concorrentes. Compara com snapshot anterior salvo no Obsidian. Quando detecta criativo novo, baixa, classifica o hook e notifica via WhatsApp.
---

# /espionar-concorrente

## Quando usar

Use quando o gestor pedir pra:
- "Espia a Smart Fit todo dia"
- "Monitora os criativos novos do concorrente X"
- "Me avisa quando a Bio Mundo lançar anúncio novo"
- "Quero saber o que a concorrência tá testando essa semana"

NÃO use quando:
- Quer só ver criativos uma vez (responde direto sem cronjob)
- Quer copiar criativo (skill só baixa e cataloga, ética e copyright são responsabilidade do gestor)

## Como usar

Frases que disparam:

- "Começa a espionar Smart Fit, Bio Ritmo e Bluefit todo dia 8h"
- "Adiciona o concorrente X na espionagem do cliente Y"
- "Lista as espionagens ativas"
- "Para de espionar a Smart Fit"

Mínimo: **lista de concorrentes (nome ou URL da Biblioteca Meta) + frequência**.

## Dependências

- Playwright instalado (`./scripts/install-playwright.sh`)
- Evolution Go pareado (alertas)
- Vault Obsidian (snapshots)
- `cron` (cronjob agendado)

## Fluxo

1. **Recebe lista de concorrentes.** Aceita:
   - Nome da página: "Smart Fit" → resolve via busca na Biblioteca Meta
   - URL completa da Biblioteca: `https://www.facebook.com/ads/library/?...`
   - ID da Page: `123456789`

2. **Confirma alvo + frequência.**
   ```
   Vou espionar:
   - Smart Fit (page_id 100123) — diário, 8h
   - Bio Ritmo (page_id 100456) — diário, 8h
   - Bluefit (page_id 100789) — 2x/semana, seg/qui, 8h

   Notifica em: 5511999998888
   Confirma? [s/n]
   ```

3. **Cria cronjob.** Adiciona em `~/.gestor-trafego/cron.d/espiao-<concorrente>.cron`:
   ```
   0 8 * * * /usr/local/bin/node /path/to/.cache/espiao/<slug>/scan.js
   ```
   Skill gera `scan.js` que:

   - Abre Playwright headless
   - Acessa Biblioteca Meta filtrada por essa Page
   - Captura todos os anúncios ativos: imagem/thumbnail, texto, CTA, data de início, formato
   - Calcula hash de cada criativo (perceptual hash da imagem + hash do texto)

4. **Compara com snapshot.** Lê `obsidian-vault/concorrentes/<slug>.md` que tem lista de hashes vistos. Identifica:
   - **Novos:** hash não existe no snapshot
   - **Removidos:** estavam no snapshot, sumiram da Biblioteca
   - **Persistentes:** continuam ativos (sinal de que performa bem)

5. **Classifica hook do criativo novo.** Lê o texto + analisa imagem. Categoriza em:
   - **Curiosidade:** "Você sabia que...", "O que ninguém te conta sobre..."
   - **Medo/Dor:** "Pare de perder...", "O erro que..."
   - **Ganho/Promessa:** "Como conseguir X em Y dias", "Resultado garantido"
   - **Prova social:** "+10mil clientes", depoimento, antes/depois
   - **Autoridade:** especialista, mídia, certificação
   - **Urgência/Escassez:** "Última semana", "Só hoje"
   - **Provocação/Polêmica:** afirmação contraintuitiva
   - **Storytelling:** narrativa pessoal

6. **Atualiza snapshot.** Adiciona novos hashes em `obsidian-vault/concorrentes/<slug>.md`. Cria entrada por criativo:
   ```yaml
   ---
   concorrente: smart-fit
   ultimo_scan: 2026-04-14T08:00
   ativos: 23
   novos_hoje: 3
   ---

   ## Criativos novos (2026-04-14)

   ### #f3a2b1
   - Hook: prova-social
   - Formato: vídeo 30s
   - CTA: Cadastre-se
   - Texto: "Mais de 1 milhão de alunos já transformaram o corpo na Smart Fit..."
   - Iniciado: 2026-04-13
   - Thumbnail: ![[criativos/concorrentes/smart-fit/f3a2b1.jpg]]
   ```

7. **Notifica WhatsApp.**
   ```
   Smart Fit lançou 3 criativos novos hoje.
   - 2x prova social (vídeo)
   - 1x ganho/promessa (carrossel)

   Detalhes em obsidian-vault/concorrentes/smart-fit.md
   ```

8. **Baixa assets.** Imagens/vídeos vão pra `obsidian-vault/criativos/concorrentes/<slug>/` com hash como nome. Permite consulta visual no Obsidian depois.

## Configuração

Espera no `.env`:
```
WHATSAPP_DESTINO=5511999998888
```

Cria `obsidian-vault/concorrentes/<slug>.md` automaticamente na primeira espionagem.

## Comandos auxiliares

- `/espionar-concorrente listar` — espionagens ativas
- `/espionar-concorrente parar <slug>` — remove cronjob
- `/espionar-concorrente scan <slug>` — força scan agora (sem esperar cron)
- `/espionar-concorrente relatorio <slug> --periodo 30d` — gera resumo do que rodou no mês

## Limites éticos

- Skill **só catalogá** criativos públicos da Biblioteca Meta — informação aberta.
- **Nunca copia 1:1.** Quando o gestor pede inspiração, a skill mostra padrão (hook + estrutura), não o asset exato.

## Erros comuns

- **Page não encontrada:** "Não achei 'Smart Fit Premium' na Biblioteca. Tenta passar URL direta da Biblioteca filtrada."
- **Playwright trava em login:** Biblioteca Meta às vezes exige login. Skill suporta `META_LIBRARY_COOKIE` no `.env` pra contornar.
- **Hash colide:** se 2 criativos diferentes geram mesmo hash, ajustar tolerância no `scan.js` (perceptual hash bits).

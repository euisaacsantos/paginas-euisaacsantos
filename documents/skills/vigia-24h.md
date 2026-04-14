---
name: vigia-24h
description: Monitora contas de Meta Ads em background com checagens periódicas (30min/1h/2h/4h). Dispara alertas no WhatsApp via Evolution Go quando CPA estoura threshold, saldo cai abaixo do mínimo ou ROAS desaba. Roda como cronjob silencioso.
---

# /vigia-24h

## Quando usar

Use quando o gestor pedir pra:
- "Liga o vigia do cliente X"
- "Fica de olho na conta da Padaria, me avisa se CPA passar de R$25"
- "Monitora a conta do Acme e me alerta se o saldo cair de R$200"
- "Coloca alerta de ROAS no Dr. Marcos abaixo de 3"

NÃO use quando:
- Gestor quer relatório pontual (use `/relatorio-cliente`)
- Análise profunda da conta (use `/diagnostico-conta`)

## Como usar

Frases que disparam:

- "Liga o vigia do Acme a cada 30min, CPA máx R$25, saldo mín R$300, ROAS mín 3"
- "Para de monitorar a Padaria do Zé"
- "Lista os vigias ativos"
- "Aumenta o intervalo do vigia do Acme pra 2h"

Mínimo necessário pra ligar: **cliente + intervalo + pelo menos 1 threshold**. Se faltar, pergunta UMA coisa.

## Dependências

- `META_ACCESS_TOKEN` e `META_AD_ACCOUNT_ID` no `.env`
- Evolution Go rodando e instância pareada (verifica com `curl $EVOLUTION_API_URL/instance/connectionState/$EVOLUTION_INSTANCE_NAME`)
- `WHATSAPP_DESTINO` no `.env` (número com DDI, ex: `5511999998888`)
- `cron` (macOS/Linux) ou Task Scheduler (Windows). Skill instala entrada automaticamente.

## Fluxo

1. **Lê contexto do cliente.** `obsidian-vault/clientes/<slug>.md`. Pega `cpa_alvo`, `roas_alvo`, `ad_account_id` como defaults caso o gestor não passe thresholds.

2. **Confirma parâmetros.** Mostra preview:
   ```
   Vigia: Acme
   Intervalo: 30min
   Thresholds:
     - CPA máximo: R$ 25,00
     - Saldo mínimo: R$ 300,00
     - ROAS mínimo: 3,0
   Notifica em: 5511999998888 (WhatsApp)
   Ligar? [s/n]
   ```

3. **Cria entrada cron.** Adiciona linha em `~/.gestor-trafego/cron.d/<slug>.cron`:
   ```
   */30 * * * * /usr/local/bin/node /path/to/.cache/vigia/<slug>/check.js
   ```
   Skill gera o script `check.js` que:
   - Puxa insights das últimas 4h via Marketing API
   - Calcula CPA atual, ROAS atual, saldo da conta
   - Compara com thresholds
   - Se algum estoura, manda mensagem WhatsApp

4. **Persiste estado.** Salva `~/.gestor-trafego/vigias.json` com lista de vigias ativos. Permite `/vigia-24h listar`, `/vigia-24h parar <cliente>`, `/vigia-24h editar <cliente>`.

5. **Formato do alerta WhatsApp:**
   ```
   ALERTA Acme — 14:32
   CPA estourou: R$ 31,40 (alvo R$ 25,00)
   Campanha responsável: Acme_Conversao_Lookalike2_VideoDorB
   Gasto últimas 4h: R$ 122,00
   Conversões: 4
   Sugestão: pausar adset Lookalike2 e investigar criativo
   ```

6. **Anti-spam.** Se já alertou sobre o mesmo problema na última hora, não alerta de novo. Salva último alerta em `~/.gestor-trafego/last-alerts/<slug>.json`.

7. **Salva incidente no vault.** Cada alerta vira nota em `obsidian-vault/diagnosticos/YYYY-MM-DD-<cliente>-alerta.md` pra histórico.

## Configuração

Espera no `.env`:
```
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=...
EVOLUTION_INSTANCE_NAME=gestor
WHATSAPP_DESTINO=5511999998888
```

Espera no Obsidian (cliente):
```yaml
cpa_alvo: 25
roas_alvo: 3
saldo_minimo: 300
ad_account_id: act_123
```

## Comandos auxiliares

- `/vigia-24h listar` — mostra tabela de vigias ativos
- `/vigia-24h parar <slug>` — remove cron
- `/vigia-24h editar <slug>` — interativo pra mudar threshold/intervalo
- `/vigia-24h log <slug>` — últimos 10 alertas

## Erros comuns

- **Evolution offline:** "Evolution não respondeu. Roda `./scripts/start-evolution.sh` e tenta de novo."
- **WhatsApp não pareado:** "Instância `gestor` está `close`. Roda `./scripts/start-evolution.sh pair` pra reconectar."
- **Cron não escreve:** No macOS, dá permissão de Full Disk Access pro Terminal em System Preferences > Privacy.

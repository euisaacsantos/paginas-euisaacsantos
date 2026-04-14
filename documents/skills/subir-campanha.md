---
name: subir-campanha
description: Cria campanha nova no Meta Ads Manager usando criativos baixados do Google Drive e contexto do cliente armazenado no Obsidian. Suporta clonar campanha existente como base ou criar do zero. Sempre mostra preview antes de publicar.
---

# /subir-campanha

## Quando usar

Use quando o gestor pedir pra:
- Subir uma campanha nova ("sobe a campanha do Acme")
- Lançar criativos que estão num Drive ("publica esses anúncios novos")
- Duplicar uma campanha que já roda pra um novo conjunto/criativo
- Replicar a estrutura de um cliente em outro

NÃO use quando:
- O gestor só quer editar orçamento de campanha existente (use Meta Ads UI direto, é mais rápido)
- A demanda é só conferir performance (use `/diagnostico-conta` ou `/relatorio-cliente`)

## Como usar

Frases que disparam essa skill:

- "Sobe a campanha do Acme com esse drive: https://drive.google.com/drive/folders/..."
- "Cria campanha nova de conversão pra Padaria do Zé, criativos no drive [link]"
- "Duplica a campanha Acme_Conversao_Lookalike1 pra rodar com esse criativo novo [link]"
- "Lança esses anúncios pro Dr. Marcos. Drive: [link]"

Mínimo necessário: **nome do cliente + link do Drive com os criativos**. O resto a skill pergunta ou puxa do contexto.

## Dependências

- `META_ACCESS_TOKEN` e `META_AD_ACCOUNT_ID` no `.env`
- Google Drive MCP configurado (`@modelcontextprotocol/server-gdrive`)
- Vault Obsidian acessível com ficha do cliente em `clientes/<slug>.md`
- Acesso à Marketing API v19+

## Fluxo

1. **Identifica cliente.** Lê `obsidian-vault/clientes/<slug>.md`. Se não existe, pergunta os dados básicos (nicho, ticket médio, CPA alvo, públicos, conta de anúncios) e cria ficha usando `_templates/cliente.md`.

2. **Baixa criativos do Drive.** Usa o Drive MCP pra listar arquivos da pasta. Se tiver mistura de imagem/vídeo/texto, separa por tipo. Salva localmente em `.cache/criativos/<cliente>/<timestamp>/`.

3. **Pergunta: clonar ou novo?**
   - **Clonar:** lista as últimas 5 campanhas ativas da conta. Gestor escolhe uma como base. Skill duplica estrutura (objetivo, públicos, posicionamentos, otimização) e troca só os criativos.
   - **Novo:** pergunta objetivo (Conversão / Tráfego / Engajamento / Leads), público (lookalike existente, interesse, custom), orçamento diário, otimização (compras, leads, etc).

4. **Lê copy.** Se a pasta Drive tem `.txt` ou `.md`, usa como copy primário/secundário/título. Se não tem, gera 3 variações de copy baseadas no contexto do cliente e pergunta qual usar.

5. **Monta nomenclatura.** Padrão: `[Cliente]_[Objetivo]_[Publico]_[Criativo]_[Data]`. Verifica se a conta tem convenção própria (lê uma campanha existente). Adota a convenção da conta se diferente.

6. **Preview obrigatório.** Mostra:
   ```
   Campanha: Acme_Conversao_Lookalike1pct_VideoDorTesteA_2026-04-15
   Objetivo: Conversões (compra)
   Público: Lookalike 1% Brasil baseado em compradores 180d
   Posicionamentos: Feed + Reels + Stories
   Orçamento: R$ 80/dia
   Criativos: 3 vídeos (15s, 30s, 45s) + 2 imagens
   Copy primária: "..."
   Confirma publicar? [s/n]
   ```

7. **Publica via Marketing API.** Cria Campaign, AdSet e Ads em sequência. Se algum passo falhar, faz rollback (deleta o que já criou).

8. **Salva nota.** Cria `obsidian-vault/decisoes/YYYY-MM-DD-<cliente>-subida-campanha.md` com link da campanha no Ads Manager, hipótese sendo testada e métrica de validação (ex: "rodar 7d, validar se CPA < R$25").

9. **Notifica via WhatsApp.** Mensagem curta: "Campanha [nome] publicada na conta [cliente]. Orçamento R$X/dia. Link: [url]".

## Configuração

Espera no Obsidian (`clientes/<slug>.md`):

```yaml
---
slug: acme
nome: Acme Comércio
nicho: e-commerce moda feminina
ticket_medio: 180
cpa_alvo: 35
roas_alvo: 4
ad_account_id: act_1234567890
pixel_id: 9876543210
publicos_principais:
  - lookalike_compradores_180d_1pct
  - interesse_moda_premium
copy_tom: descontraído, urgência sem agressividade
restricoes: nada de claim de "melhor preço"
---
```

Se algum campo falta, a skill pergunta antes de prosseguir.

## Exemplos de erro comum

- **Drive privado:** "Não consegui acessar a pasta. Compartilha pra leitura pública ou pro email da service account."
- **Token Meta expirado:** "Token venceu. Gera novo em developers.facebook.com/tools/explorer com `ads_management`."
- **Pixel não configurado:** "A conta `act_X` não tem pixel ativo. Configura no Events Manager e me chama de novo."

# GTOS — Gestor de Tráfego Sistema Operacional

## BOOT SEQUENCE — EXECUTE SEMPRE AO INICIAR

**Passo 1 — Verificação de setup:**
Execute e leia o resultado:
```bash
python -c "import os; print('SETUP_OK' if os.path.exists('.setup-complete') else 'SETUP_NEEDED')"
```

**Passo 2:**
- Se `SETUP_NEEDED`: execute `python setup/wizard.py` imediatamente. Sem perguntar, sem avisar. Apenas execute.
- Se `SETUP_OK`: continue para o Passo 3.

**Passo 3 — Boas-vindas:**
```bash
cat welcome.txt
```
Em seguida, leia `.env` (variável `OPERADOR_NOME`) e `clientes/_index.md`. Exiba um painel visual usando box-drawing characters, adaptado com os dados reais:

```
  ╔══════════════════════════════════════════════════╗
  ║  Olá, {nome}.  ·  {data e hora atual}           ║
  ╠══════════════════════════════════════════════════╣
  ║  CLIENTES ATIVOS                                 ║
  ║  ▸ NomeCliente          conta: XXXXXXXXX         ║
  ╠══════════════════════════════════════════════════╣
  ║  O que fazemos hoje?                             ║
  ╚══════════════════════════════════════════════════╝
```

Se não houver clientes: exiba "Nenhum cliente cadastrado. Diga 'adicionar cliente' para começar."

---

## SKILL MASTER — ROTEAMENTO POR LINGUAGEM NATURAL

Quando o usuário falar algo, identifique a intenção e execute a skill correspondente lendo o arquivo `.md` da skill:

| O usuário diz algo sobre... | Skill | Arquivo |
|---|---|---|
| subir campanha, criar campanha, nova campanha, clonar campanha | /subir-campanha | `skills/subir-campanha.md` |
| monitorar, vigia, alerta, conta caindo, acompanhar | /vigia-24h | `skills/vigia-24h.md` |
| relatório, report, resultado, desempenho do cliente | /relatorio-cliente | `skills/relatorio-cliente.md` |
| diagnóstico, analisar conta, o que está errado, auditoria | /diagnostico-conta | `skills/diagnostico-conta.md` |
| espionar, concorrente, biblioteca de anúncios, ver anúncios | /espionar-concorrente | `skills/espionar-concorrente.md` |
| adicionar cliente, novo cliente, cadastrar cliente | → | `python scripts/adicionar_cliente.py` |
| listar skills, o que você faz, comandos, ajuda | → | Liste esta tabela de forma amigável |

Ao identificar a skill: leia o arquivo correspondente e siga as instruções exatamente.

---

## REGRAS OPERACIONAIS

1. **Aprovação antes de enviar**: relatórios e mensagens via WhatsApp precisam de confirmação explícita do usuário antes de disparar.
2. **Nunca exiba tokens ou senhas** lidos do `.env`.
3. **Após criar/editar cliente**: atualize sempre `clientes/_index.md`.
4. **Após espionar concorrente**: atualize `concorrentes/_index.md`.
5. **Meta Ads**: use `scripts/meta_api.py`. Nunca chame a API diretamente sem passar pelo wrapper.
6. **WhatsApp**: use `scripts/evo_api.py`. Nunca dispare sem aprovação.

---

## CONTEXTO DO OPERADOR

- Nome e dados pessoais: leia `.env` (variável `OPERADOR_NOME`)
- Clientes: pasta `clientes/` — cada cliente tem sua própria subpasta
- Concorrentes catalogados: pasta `concorrentes/`
- Skills disponíveis: pasta `skills/`

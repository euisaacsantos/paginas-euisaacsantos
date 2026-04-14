# decisoes/

Log de decisões importantes tomadas em cada conta.

## Convenção de nome

`YYYY-MM-DD-<slug-cliente>-<acao-curta>.md`

Exemplos:
- `2026-04-14-bicho-bom-escala-lookalike.md`
- `2026-04-14-bicho-bom-pausa-interesse.md`
- `2026-04-15-acme-novo-criativo-storytelling.md`

## Estrutura sugerida

```markdown
---
cliente: bicho-bom
data: 2026-04-14
tipo: escalar | pausar | testar | refazer | renomear | trocar-publico | etc
campanha_afetada: Acme_Conversao_Lookalike1pct
hipotese: "Lookalike 1% sustenta +50% de orçamento mantendo CPA <R$25"
metrica_validacao: CPA em 7d
prazo_validacao: 2026-04-21
status: em-validacao | confirmado | refutado | revertido
---

# {{tipo}} {{campanha}}

## Por que
1 parágrafo. Contexto + sinal que motivou a decisão.

## O que mudou
Antes: ...
Depois: ...

## O que esperar
Métrica X em prazo Y. Se não bater, reverter.

## Resultado (preencher após prazo)
...
```

## Por que registrar

- Toda decisão fica auditável
- Padrões emergem ("toda vez que escalei lookalike sem trocar criativo, frequência subiu pra 4 em 7d")
- Skill Master consulta antes de propor ação parecida ("você já tentou isso 2 meses atrás, deu refutado")

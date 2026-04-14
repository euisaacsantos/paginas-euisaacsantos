# diagnosticos/

Histórico de diagnósticos gerados via `/diagnostico-conta`.

## Convenção de nome

`YYYY-MM-DD-<slug-cliente>.md`

Ex: `2026-04-14-bicho-bom.md`

Se rodar mais de 1 diagnóstico no mesmo dia (raro), adiciona sufixo:
`2026-04-14-bicho-bom-2.md`

## Estrutura

Toda nota nasce do template `_templates/diagnostico.md`. Frontmatter padronizado permite query Dataview tipo:

```dataview
TABLE veredito, cpa, roas
FROM "diagnosticos"
WHERE cliente = "bicho-bom"
SORT data DESC
```

## Quando consultar

- Antes de subir campanha nova: lê os 2 últimos diagnósticos pra contexto
- Antes de gerar relatório: pega tendência de veredito (se virou "pausar 3x seguidas", o relatório precisa enfatizar isso)
- Quando vigia 24h alerta: cruza com diagnóstico mais recente pra dar contexto

## Retenção

Sem limite. Diagnóstico antigo é ouro pra entender porque uma conta hoje está como está.

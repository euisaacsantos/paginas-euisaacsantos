# concorrentes/

Snapshots de criativos de concorrentes capturados via `/espionar-concorrente`.

## Estrutura

1 arquivo por concorrente: `<slug-concorrente>.md`

Ex: `smart-fit.md`, `bio-mundo.md`, `dr-jayme-pet.md`

## Frontmatter padrão

```yaml
---
concorrente: smart-fit
nome_completo: Smart Fit Academia
page_id: 100123456789
url_biblioteca: https://www.facebook.com/ads/library/?id=100123456789
clientes_relacionados:
  - bicho-bom    # caso seja concorrente indireto de algum cliente
frequencia_scan: diaria   # diaria | 2x-semana | semanal
ultimo_scan: 2026-04-14T08:00
ativos_total: 23
novos_ultimo_scan: 3
---
```

## Conteúdo do arquivo

Cada scan adiciona seção `## Scan YYYY-MM-DD` no fim do arquivo. Dentro:

- Lista de criativos novos (com hash, hook, formato, thumbnail embed)
- Lista de criativos que sumiram desde último scan
- Total de ativos no período

Hashes vistos ficam em bloco de código no topo pra deduplicação rápida:

```
<!-- HASHES_VISTOS -->
f3a2b1c4d5e6f789
1a2b3c4d5e6f7890
9876543210abcdef
<!-- /HASHES_VISTOS -->
```

A skill `/espionar-concorrente` lê e atualiza esse bloco automaticamente.

## Assets visuais

Vão pra `criativos/concorrentes/<slug>/<hash>.{jpg,mp4}` (referenciados via embed `![[]]`).

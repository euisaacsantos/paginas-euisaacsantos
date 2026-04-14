# criativos/

Banco de criativos catalogados, separados por cliente e por concorrente.

## Estrutura

```
criativos/
├── <slug-cliente>/             # criativos próprios do cliente
│   ├── <hash>.md               # ficha do criativo (usar _templates/criativo.md)
│   ├── <hash>.jpg              # asset visual
│   └── <hash>.mp4              # se vídeo
└── concorrentes/               # criativos espionados via /espionar-concorrente
    └── <slug-concorrente>/
        ├── <hash>.jpg
        └── <hash>.mp4
```

## Convenção de hash

Hash perceptual (pHash 64-bit) da imagem/primeiro frame do vídeo, em hex.
Ex: `f3a2b1c4d5e6f789.jpg`

Mantém estável quando criativo é o mesmo com diferença visual mínima (compressão, resize).

## Como popular

- **Próprios:** automaticamente via `/subir-campanha` (puxa do Drive, cataloga)
- **Concorrentes:** automaticamente via `/espionar-concorrente`
- **Manual:** copia o asset pra cá, gera hash com `node scripts/hash.js arquivo.jpg`, cria ficha usando `_templates/criativo.md`

## Por que catalogar

- Quando subir campanha nova, Skill Master consulta o que já performou bem pro cliente
- Quando espionar concorrente, evita "novo criativo" detectado falso (já estava ativo, hash igual)
- Histórico de hooks que funcionam vira input pra próximos briefings

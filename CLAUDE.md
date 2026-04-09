# CLAUDE.md

Regras operacionais do repo. Contexto estratégico (avatar, narrativa, concorrentes, funil) fica no sistema de memória — não duplicar aqui.

## Projeto ativo

- **Produto em desenvolvimento:** "Claude para Gestores de Tráfego" (imersão low-ticket → comunidade premium)
- **Página ativa:** rota `/v1` → `src/AppV1.jsx`
- **Página legada:** rota `/` → `src/App.jsx` (template Cura na Raiz, NÃO mexer salvo pedido explícito)

## Stack

- Vite 8 + React 19 + Tailwind 3
- Sem React Router. Roteamento manual em `src/main.jsx` via `window.location.pathname`
- Deploy: Vercel, auto-deploy a cada push em `main`. SPA rewrite via `vercel.json`

## Comandos

```bash
npm run dev      # dev local (porta 5173 ou 5174)
npm run build    # produção
```

## Regras de edição

1. **Nunca tocar `src/App.jsx`** salvo pedido explícito do Isaac. É a página legada.
2. **Toda nova feature/copy da imersão Claude vai em `src/AppV1.jsx`.**
3. **Estilos custom da V1** (terminal, brain, hero V1) ficam no fim de `src/index.css` em blocos comentados (`/* ===== Nome ===== */`).
4. **Componentes custom da V1** (ClaudeTerminal, ObsidianBrain, HeroTitle) ficam dentro do próprio `AppV1.jsx`, antes da função `AppV1`.
5. **Zero CLS no hero:** `HeroTitle` usa texto fantasma `visibility: hidden` pra reservar espaço — não trocar por `min-height` calculado.

## Pitfalls do build (já resolvidos — não reintroduzir)

- `@import` de fonte tem que vir **antes** de `@tailwind` em `src/index.css` (PostCSS)
- Seletores Tailwind com `!` precisam escape: `.tech-card.\!p-8` (lightningcss)

## Convenções de Git

- Commits em português, formato `tipo: descrição` (`feat:`, `fix:`, `chore:`)
- Co-Author trailer no final de cada commit:
  ```
  Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
  ```
- Push direto em `main` (sem PR — projeto solo do Isaac)

## Estilo de comunicação

- Direto, sem preamble. Tabela quando houver comparação.
- Quando o Isaac pede recomendação, dar UMA resposta clara — não menu de opções.
- Implementação técnica: ir direto, mostrar resultado, evitar over-engineering.

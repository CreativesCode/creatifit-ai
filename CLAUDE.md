@AGENTS.md

<!-- titan-factory-claude:start -->
# Titan Factory (Claude Code) — Creatifit AI

`AGENTS.md` (importado arriba) contiene las reglas comunes a Claude Code y Codex. Este
bloque agrega lo propio de Claude Code. Si algo choca, gana la instruccion explicita del
usuario, luego `AGENTS.md`, luego este bloque.

## Coexistencia con Titan Factory Codex

| Claude Code | Codex |
|-------------|-------|
| `CLAUDE.md` (+ `@AGENTS.md`) | `AGENTS.md` |
| `.claude/skills/tf-*` | `.agents/skills/tf-*` (entradas) → `.agents/skills/titan-factory-codex/skills/tf-*` |
| `.claude/agents/tf-*.md` | `.codex/agents/tf-*.toml` |
| `.claude/skills/{supabase,supabase-postgres-best-practices,logo-design}` (puentes) | `.agents/skills/` (fuente real, `skills-lock.json`) |
| `.claude/design-systems/` | `.agents/skills/titan-factory-codex/design-systems/` |

Los skills y agentes tienen el mismo nombre en ambos lados: un cambio de catalogo en uno
se replica en el otro. No edites `.codex/` ni `.agents/` salvo que la tarea sea sobre Codex
o los skills compartidos. Para actualizar la fabrica de Claude usa `tf-update-tf` (nunca
copies el template encima).

## Memoria compartida

La memoria del proyecto es una sola y esta versionada: `.titan/memory/` (indice
`MEMORY.md`), planes en `.titan/plans/` y evidencia de QA en `.titan/qa/`. Puede haber
entradas escritas por Codex: tratalas igual. Nunca crees `.claude/memory/` ni guardes
credenciales.

## Subagentes: solo con permiso

`.claude/agents/` tiene 7 subagentes `tf-*` (backend, frontend, supabase-admin,
codebase-analyst, vercel-deployer, gestor-documentacion, validacion-calidad). Se usan solo
cuando el usuario lo pide o lo autoriza.

## Este proyecto no es la plantilla

Creatifit es una app existente: Next.js 15 con export estatico, Capacitor, Supabase Edge
Functions y RevenueCat. Los skills `tf-*` asumen por defecto Server Actions, Vercel, Polar
o PWA; adapta sus recetas a este stack en vez de reemplazarlo. Los estilos de
`.claude/design-systems/` solo aplican si el usuario los pide explicitamente.
<!-- titan-factory-claude:end -->

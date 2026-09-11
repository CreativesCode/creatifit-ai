# Creatifit AI

Read `instructions.md` for product requirements and project conventions. Verify its architectural examples against the current code: this app uses Next.js 15, React 19, Tailwind 4, Supabase and Capacitor, with static export in `next.config.ts`. Do not scaffold the toolkit starter over this application or assume its dependency versions apply here.

The complete local toolkit is in `.agents/skills/titan-factory-codex/`; its 29 skills are under the nested `skills/` directory. Resolve shared scripts and references relative to each skill file. Native role profiles live in `.codex/agents/`. Consult `.titan/INSTALLATION.md` for maintenance and verification.

<!-- titan-factory-codex:start -->
## Titan Factory Codex

- At the start of a relevant project task, read `.titan/memory/MEMORY.md` if present and only its relevant linked entries.
- Use available `tf-` skills for matching work. Skills do not imply connected services or permission for unrelated actions.
- For new compatible apps prefer Next.js + Supabase + Vercel. EasyPanel remains an alternative. Preserve this project's existing stack and the user's explicit choices.
- Keep project decisions in `.titan/memory/`, feature plans in `.titan/plans/` and useful QA evidence in `.titan/qa/`. Read-only tasks must not write state.
- Reuse authorization already given for the task. Delegate only when the user requests or authorizes delegation; do not launch agents merely because role files exist.
- Preserve local code and project knowledge during toolkit updates. Never store credentials in shared memory.
<!-- titan-factory-codex:end -->

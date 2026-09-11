# Creatifit context — 2026-09-10

Evidence: root `package.json`, `next.config.ts`, `instructions.md` and repository directories.

- Existing application: Next.js 15.4.10, React 19.1.0, TypeScript, Tailwind 4, Supabase, TanStack Query and Capacitor 7. RevenueCat dependencies support mobile purchases.
- `next.config.ts` sets static export, `distDir: "out"`, trailing slashes and unoptimized images. Preserve this deployment/mobile model unless an explicit task changes it.
- `src/` contains app, components, hooks, lib, locales and types. `supabase/functions/` contains server functions.
- The older README/instructions mention Prisma and API route designs; package.json has no Prisma dependency. Treat those examples as intent to verify, not proof of implemented architecture.
- User preference for new projects is Next.js + Supabase + Vercel, retaining EasyPanel as an optional future deployment target. No hosting connection was verified during toolkit installation.
- Titan installed locally on request, with all 29 skills and seven native role profiles. No automatic delegation, service provisioning or deployment is implied.
- Toolkit templates are excluded from application TypeScript and ESLint scanning. Do not install their dependencies into Creatifit.
- No application source, dependency versions or credentials were changed for this installation.

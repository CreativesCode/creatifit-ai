# Creatifit: contexto técnico — 2026-09-10

Reconstrucción retrospectiva sobre commit `2cb14df`. Titan se instaló el 10 de septiembre; no se utilizó desde el inicio. Estado de código local, no certificación de producción.

Evidence: root `package.json`, `next.config.ts`, `instructions.md` and repository directories.

- Existing application: Next.js 15.4.10, React 19.1.0, TypeScript, Tailwind 4, Supabase, TanStack Query and Capacitor 7. RevenueCat dependencies support mobile purchases.
- `next.config.ts` sets static export, `distDir: "out"`, trailing slashes and unoptimized images. Preserve this deployment/mobile model unless an explicit task changes it.
- `src/` contains app, components, hooks, lib, locales and types. `supabase/functions/` contains server functions.
- Prisma se eliminó explícitamente en `1176b08` (2026-06-10); no existen `prisma/` ni `src/app/api/`. README/instructions conservan ejemplos superados. Lógica privilegiada actual: generate-plan, revenuecat-webhook, admin-api y delete-account en Supabase Edge Functions.
- User preference for new projects is Next.js + Supabase + Vercel, retaining EasyPanel as an optional future deployment target. No hosting connection was verified during toolkit installation.
- Titan installed locally on request, with all 29 skills and seven native role profiles. No automatic delegation, service provisioning or deployment is implied.
- Toolkit templates are excluded from application TypeScript and ESLint scanning. Do not install their dependencies into Creatifit.
- No application source, dependency versions or credentials were changed for this installation.

Android declara versión 1.0.4 / versionCode 4; package.json mantiene 0.1.0. No demuestra versión publicada. No existe carpeta nativa ios. TanStack Query está montado, pero búsqueda en src no encontró useQuery/useMutation; fetching continúa mayormente con efectos/estado local.

Leer [producto](producto-flujos.md), [IA](generacion-planes.md), [datos](datos-seguridad.md), [pagos](suscripciones.md), [diseño/móvil](diseno-movil.md), [operación](operacion.md) y [pendientes](pendientes.md) según tarea. Preferencias de nuevos proyectos no autorizan migrar RevenueCat ni Capacitor.

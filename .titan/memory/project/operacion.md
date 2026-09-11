# Operación y comprobaciones

Revisado: 2026-09-10. No se desplegó, no se ejecutaron migraciones ni tests con cuentas reales.

## Entorno

Frontend público: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_STATICS_IMAGES y variables NEXT_PUBLIC_REVENUECAT_* de SDK/productos. Confirmar valores fuera de la memoria. Las keys del SDK no son la credencial secreta del webhook.

Backend: OPENAI_API_KEY, MODEL_NAME, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, REVENUECAT_WEBHOOK_AUTH y opcional ADMIN_BOOTSTRAP_SECRET. Bootstrap debe retirarse cuando ya no se use. No imprimir valores ni promover variables privadas a NEXT_PUBLIC_.

Supabase-config tiene placeholders para permitir prerender sin env; un build que pasa no demuestra conexión correcta. APP_URL determina redirects de auth; NEXT_PUBLIC_STATICS_IMAGES determina GIFs. `upload-storage.mjs` documenta carpeta `exercises ` con espacio final: no normalizarla sin comprobar referencias.

## Comandos y efectos

| Herramienta | Uso / límites |
|---|---|
| npm run dev | Desarrollo Next |
| npm run build / build:static | next build con export estático; lint omitido por next.config |
| npm run lint | Definido como next lint; no se ejecutó aquí, revisar compatibilidad antes de asumir check funcional |
| npm run start | Script next start conservado; no asumir que sirve un export estático correctamente |
| scripts cap:* / mobile:* | Build/sync/apertura/build nativo según package.json; modifican artefactos |
| scripts/run-sql.ps1 | Escribe SQL en Supabase mediante Management API, toma token de Credential Manager y tiene proyecto predeterminado. No es validador offline |
| scripts/test-auth-flow.mjs | Crea usuario remoto, inserta/lee plan y elimina usuario. Test con efectos, no ejecutar por simple inspección |
| scripts/upload-storage.mjs | Sube assets con service role; tiene rutas locales fijas |
| scripts/extract-public.mjs | Extrae esquema public/catalogo desde dump, omite datos personales y execute_sql; produce archivo local |
| scripts/split-restore.mjs | Divide dump con rutas temporales fijas y supuestos sobre COPY; no instalador general |
| scripts/generate-brand-assets.mjs | Escribe iconos/splash/favicon con sharp; no es solo preview |

Las instrucciones Prisma db:generate/db:push/db:seed del README no existen en los scripts actuales. No ejecutarlas ni instalar Prisma para “arreglar” esa discrepancia.

## Infraestructura y QA

- Solo workflow de aplicación encontrado: keep-supabase-alive; cron 06:00 UTC y manual, llama RPC ping con secrets de GitHub. Archivo local no acredita ejecuciones exitosas ni estado del proveedor.
- SQL ping en `schemas/keepalive-ping-function.sql`. Verificar proyecto antes de cualquier uso remoto.
- Vercel es preferencia del usuario; EasyPanel opción futura. Esta revisión no verificó cuenta, dominio, deployment, secrets, tienda móvil ni modelo real.
- No script test de aplicación ni suite automatizada general identificados en package.json. Una prueba auth remota existe, pero no se ejecutó. El lint se omite durante build. No presentar build histórico como prueba de hoy.
- Para cambios futuros: comprobar tipos/lint relevantes, flujo afectado y regresiones auth/planes/sesiones/idiomas/móvil según alcance. Usar entorno de pruebas identificado antes de llamadas con coste, compras o escrituras.
- `.agents/` excluido de TypeScript/ESLint para no compilar plantillas Titan. `.gitattributes` preserva bytes del paquete para sus SHA-256. No tocar esas exclusiones durante refactor incidental.

Fuentes: package.json, next.config.ts, .github/workflows, scripts/, env.example (nombres de variables), configuración cliente/funciones y .titan/INSTALLATION.md.

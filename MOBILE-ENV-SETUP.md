# Variables de entorno de la app (web y APK)

CreatiFit se compila como export estático (`next build` → `out/`) y Capacitor
empaqueta esa carpeta en el APK. Todo lo que lleve el prefijo `NEXT_PUBLIC_`
queda escrito en el JavaScript que se distribuye: cualquiera que tenga el APK o
abra la web puede leerlo.

**Por eso en el cliente solo van valores públicos.** La clave de OpenAI y la
`service_role` de Supabase no se ponen nunca en `.env.local` con `NEXT_PUBLIC_`:
viven como secrets de las Edge Functions.

## Qué va en `.env.local`

Copia `env.example` a `.env.local` (está en `.gitignore`; no se sube) y rellena:

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima; los datos los protege la RLS |
| `NEXT_PUBLIC_APP_URL` | URL pública de la web. Se usa en los enlaces de recuperación de contraseña |
| `NEXT_PUBLIC_STATICS_IMAGES` | Base pública de las imágenes de los ejercicios |
| `NEXT_PUBLIC_REVENUECAT_*` | Claves del SDK de RevenueCat e identificadores de producto (son públicas) |

Las dos primeras son obligatorias: sin ellas la app arranca pero no conecta.

`SUPABASE_SERVICE_ROLE_KEY` (sin prefijo) solo la leen los scripts de
mantenimiento de `scripts/`. Al no llevar `NEXT_PUBLIC_` no entra en el build;
déjala vacía si no vas a ejecutarlos.

## Qué va en el servidor

Las Edge Functions (`supabase/functions/`) leen sus secrets del proyecto Supabase:

| Secret | Lo usa |
|---|---|
| `OPENAI_API_KEY`, `MODEL_NAME` | `generate-plan` |
| `REVENUECAT_WEBHOOK_AUTH` | `revenuecat-webhook` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Los pone Supabase; no hay que crearlos |

Se configuran con el CLI, no en archivos del repo:

```bash
supabase secrets set OPENAI_API_KEY=sk-... MODEL_NAME=gpt-4o-mini --project-ref <ref>
```

## Compilar el APK

Las variables se fijan al compilar: si cambias `.env.local`, hay que repetir el
build.

```bash
npm run build          # genera out/ (falla si hay errores de lint o de tipos)
npx cap sync android   # copia out/ al proyecto Android
npm run cap:open       # abre Android Studio para compilar
```

## Si algo falla

- **La app no conecta o las listas salen vacías:** revisa las dos variables de
  Supabase en `.env.local` y repite el build. En desarrollo, la consola muestra
  el estado con el prefijo `[ENV CONFIG]`.
- **"Generar plan" falla:** el problema está en el servidor. Revisa los secrets
  de la función y sus logs en el panel de Supabase, no el `.env.local`.
- **Una clave privada llegó a un APK o a la web:** dala por expuesta. Revócala y
  crea otra; quitarla del código no basta.

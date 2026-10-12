# Suscripciones y administración

Revisado: 2026-09-10. Valores locales, no precios confirmados de tiendas ni costes actuales de proveedores.

| Tier | Configuración comercial | Enforcement observado |
|---|---|---|
| free | 1 generación de por vida | Cuenta filas actuales de plans; bloquea si ≥1 |
| pro_monthly | 7,99 EUR/mes; 30 generaciones/mes | Pro sin ese cupo en servidor |
| pro_annual | 59,99 EUR/año; 30 generaciones/mes | Pro sin ese cupo en servidor |

Comentario “pasarela futura” de `plans-config.ts` está obsoleto: RevenueCat ya existe. Estimaciones de coste/margen en comentarios no son datos financieros medidos.

- `profiles.tier` lo escriben webhook Y admin manual; comentario del webhook “único sitio” está desactualizado.
- Cliente concede Pro si RevenueCat O tier de BD lo indica. Identidad del SDK se vincula al UUID Supabase; soporta refresh, restauración y Customer Center.
- Entitlement configurado `CreatiFit AI Pro`; productos default `subscription_monthly`/`subscription_yearly`; offering `default`. Confirmar contra servicio al cambiar integración.
- SDK/paywall solo nativos. En web retorna false; tier de BD permite reflejar upgrades manuales. No hay checkout web completo aquí.
- Fallback Test Store si faltan keys de plataforma; verificar entorno de release sin guardar claves en memoria.
- Webhook autentica header con `REVENUECAT_WEBHOOK_AUTH`. Compra/renovación conceden; EXPIRATION retira; CANCELLATION no retira al instante. TRANSFER y otros se ignoran.
- Mapeo anual del webhook busca `yearly`; cliente permite IDs configurables. Falta historial de event_id/control de orden temporal observado: revisar reintentos/eventos fuera de orden.
- Admin normal exige JWT y `profiles.is_admin`; acciones list, setTier, deleteUser. Bloquea borrarse a sí mismo en deleteUser.
- Bootstrap depende de `ADMIN_BOOTSTRAP_SECRET`: retirarlo después, no se consume automáticamente. Nunca reutilizar contraseña del ejemplo ni ejecutarlo como lectura.

## Actualización 2026-10-12

- El enforcement de la tabla de arriba cambió: Free cuenta generaciones reales (borrar un plan ya no devuelve cupo) y **Pro sí tiene tope en servidor: 30 cada 30 días**. El párrafo "Pendiente" de abajo quedó resuelto.
- Un usuario ya no puede cambiar su propio `tier` ni `is_admin` desde el cliente (ver datos-seguridad).
- Admin (detalle): al tocar un usuario se ven su cuestionario, sus planes y sus últimas sesiones (`userDetail`). El único administrador no puede eliminarse.
- Admin: la lista incluye actividad por usuario; se llega desde Ajustes en móvil. La cuenta admin cambió de contraseña y el secret de bootstrap no existe en el proyecto.
- Decisión del usuario: durante el piloto los testers conservan su tier; no se toca la compra. Google Play no cobra en Cuba, así que Pro solo llegaría por asignación manual desde admin.
- El tier de BD se relee al volver a primer plano y al recuperar conexión, y un fallo de lectura conserva el último valor conocido (`src/lib/profile-flags.ts`): un Pro concedido desde admin llega sin reiniciar la app.
- Sigue pendiente: el build local usa la key de Test Store de RevenueCat si falta la de Android. La identidad en RevenueCat se corrigió en código el 2026-10-12 (el efecto espera a `ready`), sin confirmar en dispositivo.
- Admin (2026-10-12): el panel puede dar Pro en bloque (`setTierBulk`) y crear cuentas con tier; no se usó sobre los testers.

Pendiente (resuelto el 2026-10-12, se conserva como contexto): contador de filas no representa generaciones consumidas: borrar plan, generar sin guardar o concurrencia pueden eludirlo. La política Pro y rate limit requieren decisión/implementación servidor. No migrar a Polar/Stripe porque el toolkit incluya una receta distinta.

Fuentes: `src/lib/config/plans-config.ts`, `src/lib/revenuecat/*`, `supabase/functions/{generate-plan,revenuecat-webhook,admin-api}/index.ts`, `schemas/add-subscription-tier.sql`, `schemas/add-admin-role.sql`, `/terms` y `/support`.

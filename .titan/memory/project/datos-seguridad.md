# Datos, seguridad y privacidad

Revisado: 2026-09-10. Evidencia local, sin consultar ni modificar Supabase.

## Modelo persistido

| Entidad | Uso/relación |
|---|---|
| profiles | id de auth.users, nombre/email, tier, is_admin, subscription_updated_at |
| intake | Cuestionario previsto en esquema; formulario guarda también contexto en payload.meta. No asumir escritura de intake sin seguir el flujo |
| plans | user_id, duración y payload completo; compatibilidad cliente con payload string u objeto |
| plan_exercises | Desnormalización por plan/día/índice con ID/nombre, reps/sets/rest/cues; RPC devuelve detalles |
| exercises | Catálogo con equipment, category, kind, músculos y gif_url |
| exercise_categories / exercise_category_relations / exercise_muscles_detail | Estructuras del catálogo documentadas en SQL |
| plan_days / day_exercises | Esquema histórico conservado; no confundir con la ruta activa payload + plan_exercises |
| workout_logs | Series, reps reales, peso, RPE, timestamp, session_id, plan_id |
| exercise_favorites | Relación owner-only usuario/ejercicio |
| body_measurements | Peso, grasa, medidas, notas, fecha, photo_path |

`workout_logs.plan_id` es TEXT nullable y deliberadamente SIN FK: conserva historial al borrar plan; datos antiguos NULL no pueden atribuirse con certeza. Fuentes: `schemas/database-schema.sql`, `schemas/add-workout-log-plan-id.sql`, fachada cliente.

## Acceso y migración

- Cliente único `src/lib/supabase-config.ts`; fachada `supabase-client.ts`. AuthGate es UX, RLS es aislamiento real. Las consultas que omiten user_id dependen de políticas correctas.
- `scripts/auth-rls.sql` define trigger de perfil, backfill, defaults auth.uid() y ownership de plan_exercises por plan. SQL específico añade favoritos, medidas, fotos y permisos update/delete de planes.
- No existe `supabase/migrations/` en esta revisión. Hay SQL versionado en `schemas/` y `scripts/`, pero no cadena única de migraciones reproducibles. No aplicar todos los archivos sin revisar dependencias/duplicaciones.
- `schemas/add-subscription-tier.sql` y `add-admin-role.sql` intentan restringir columnas con REVOKE UPDATE. Falta comprobar privilegios efectivos de tabla/columnas e INSERT con usuarios representativos; la intención del comentario no demuestra que no se pueda elevar tier/is_admin.
- `create-execute-sql-function.sql` contiene SQL dinámico SECURITY DEFINER filtrado por cadenas. `scripts/extract-public.mjs` lo excluye explícitamente como inseguro. No instalarlo/reutilizarlo; su existencia local no prueba exposición en producción.
- `verify-plan-exercise-functions.sql` redefine funciones; `test-plan-exercise-functions.sql` contiene pruebas SQL. El nombre verify/test no implica solo lectura.

## Storage y eliminación

- Fotos: bucket privado `progress-photos`, carpeta por UUID de usuario; URLs firmadas de duración predeterminada 3600 s. No guardar URLs firmadas ni imágenes personales en memorias.
- UI usa upload upsert; SQL revisado contiene políticas SELECT/INSERT/DELETE del bucket, por lo que colisiones/reemplazos necesitan comprobar permisos UPDATE.
- Borrar medición intenta borrar foto best-effort; puede haber huérfanos si falla Storage.
- `delete-account` valida JWT y llama Admin API con el ID del llamante. No contiene limpieza explícita de Storage/RevenueCat. Verificar fotos y dependencias reales antes de prometer borrado completo.
- Admin deleteUser tampoco limpia explícitamente fotos. Borrar cuenta no cancela suscripción, según página pública de baja.

## Documentación pública

Las páginas privacy/terms/account-deletion tienen fecha 11 junio 2026, textos en español, público de 16+ y pagos Google Play/RevenueCat. La baja por correo promete máximo 30 días y soporte indica 48 horas laborables: son compromisos escritos, no operación verificada. Consultar el correo en la fuente; no copiar datos personales innecesarios aquí.

Privacidad enumera cuestionario/planes/logs/suscripción, pero no desarrolla claramente fotos/medidas corporales. IA también recibe restricciones/notas y las notas de mejora incluyen historial resumido. Revisar consistencia documental, sin tratar esta memoria como dictamen legal.

## Regla crítica

**MOBILE-ENV-SETUP.md está obsoleto y no debe usarse para configurar secretos.** Recomienda claves OpenAI/service-role con NEXT_PUBLIC_ y se contradice sobre Git. El cliente actual no necesita esas claves. Mantener claves privadas solo en servidor y `.env.local` ignorado. No copiar valores de entornos, credenciales del CLI, tokens, dumps de usuarios o cuentas de prueba.

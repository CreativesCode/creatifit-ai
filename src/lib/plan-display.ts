// Helpers de presentación de planes.
//
// El nombre de un plan se DERIVA del objetivo elegido en el primer paso del
// onboarding (guardado en `payload.meta.objective` como clave, p. ej. "fat_loss")
// y se traduce al idioma actual. Así el nombre siempre es legible y localizado,
// en vez de la clave cruda o un id.

// Firma mínima de la `t` de react-i18next (evita fricción de tipos).
type TFn = (key: string, options?: Record<string, unknown>) => string;

interface PlanLike {
  id?: string;
  payload?: {
    meta?: { objective?: string; name?: string };
  };
}

/** Etiqueta traducida del objetivo del plan (o null si no se conoce). */
export function planObjectiveLabel(plan: PlanLike, t: TFn): string | null {
  const objective = plan?.payload?.meta?.objective;
  if (!objective) return null;
  return t(`onboarding.objective.${objective}`, { defaultValue: objective });
}

/** Nombre legible del plan, ligado al objetivo. Cae a fallbacks si falta el dato. */
export function planTitle(plan: PlanLike, t: TFn): string {
  const label = planObjectiveLabel(plan, t);
  if (label) return t("plans.objective_name", { objective: label, defaultValue: label });
  // Planes antiguos sin objetivo: usa el nombre guardado o un genérico.
  return plan?.payload?.meta?.name || t("plan.title", { defaultValue: "Plan" });
}

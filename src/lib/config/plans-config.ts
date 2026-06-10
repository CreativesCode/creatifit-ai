// Configuración de planes de suscripción, precios y límites de generación.
//
// CONTEXTO DE COSTO (para justificar los precios):
//   Cada generación de plan = 1 sola llamada a OpenAI (modelo `gpt-4o`).
//   Tokens medidos: ~3.000 de entrada + ~1.500 de salida.
//   Costo gpt-4o ($2.50/1M entrada · $10/1M salida) ≈ $0.022–0.03 por plan
//   (≈ 0,03 € al cambio). Con `gpt-4o-mini` bajaría a ~$0.0013 — ~20× menos.
//
//   => El costo de IA es despreciable; el margen es >95% a cualquier precio
//      razonable. Los cupos de abajo son anti-abuso, no por costo real.
//
// Precios en EUR para coincidir con la tabla del landing (/welcome).
//
// NOTA: aquí SOLO se definen tiers, precios y límites. La pasarela de pago
// (RevenueCat / Stripe) se integra en una fase posterior.

/** Moneda en la que se expresan los precios. */
export const CURRENCY = "EUR" as const;

/** Costo estimado de una generación con el modelo actual (gpt-4o), en USD. */
export const COST_PER_GENERATION_USD = 0.03;

export type PlanTier = "free" | "pro_monthly" | "pro_annual";

export type BillingPeriod = "lifetime" | "month" | "year";

export interface PlanDefinition {
  /** Identificador interno del tier. */
  tier: PlanTier;
  /** Nombre visible (clave i18n recomendada en producción). */
  name: string;
  /** Precio en EUR (ver CURRENCY). 0 = gratis. */
  priceEur: number;
  /** Período de facturación. */
  period: BillingPeriod;
  /**
   * Máximo de generaciones de plan permitidas en el período.
   * `null` = sin límite duro (cupo "ilimitado").
   */
  generationsLimit: number | null;
  /**
   * Ventana sobre la que se cuentan las generaciones.
   * "total" = de por vida (no se reinicia); "month"/"year" = se reinicia.
   */
  resetPeriod: "total" | "month" | "year";
  /** Para mostrar ahorro frente al mensual (solo informativo). */
  highlight?: string;
}

// ---------------------------------------------------------------------------
// DEFINICIÓN DE PLANES
// ---------------------------------------------------------------------------
//
// Free        → 1 generación de por vida (gancho de conversión).
// Pro Mensual → 7,99 €/mes, cupo alto anti-abuso (cuesta máx. ~0,80 €/mes → margen ~90%).
// Pro Anual   → 59,99 €/año (≈ 5 €/mes, 37% de ahorro), mismo cupo mensual.
//
export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    tier: "free",
    name: "Free",
    priceEur: 0,
    period: "lifetime",
    generationsLimit: 1,
    resetPeriod: "total",
  },
  pro_monthly: {
    tier: "pro_monthly",
    name: "Pro",
    priceEur: 7.99,
    period: "month",
    generationsLimit: 30, // efectivamente "ilimitado" para uso normal; tope anti-abuso
    resetPeriod: "month",
  },
  pro_annual: {
    tier: "pro_annual",
    name: "Pro Anual",
    priceEur: 59.99, // ≈ 5 €/mes
    period: "year",
    generationsLimit: 30,
    resetPeriod: "month",
    highlight: "Ahorra 37% vs. mensual",
  },
};

export const DEFAULT_TIER: PlanTier = "free";

/**
 * Indica si un usuario puede generar otro plan dado su tier y cuántas
 * generaciones ya consumió en la ventana actual.
 */
export function canGenerate(tier: PlanTier, usedInPeriod: number): boolean {
  const plan = PLANS[tier] ?? PLANS[DEFAULT_TIER];
  if (plan.generationsLimit === null) return true;
  return usedInPeriod < plan.generationsLimit;
}

/** Generaciones restantes en la ventana actual (Infinity si es ilimitado). */
export function remainingGenerations(tier: PlanTier, usedInPeriod: number): number {
  const plan = PLANS[tier] ?? PLANS[DEFAULT_TIER];
  if (plan.generationsLimit === null) return Infinity;
  return Math.max(0, plan.generationsLimit - usedInPeriod);
}

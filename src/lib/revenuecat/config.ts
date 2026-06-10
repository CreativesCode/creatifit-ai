// Configuración de RevenueCat (compras dentro de la app / IAP).
//
// Las API keys del SDK de RevenueCat son PÚBLICAS por diseño (van en el cliente),
// así que es seguro tenerlas en el bundle. Aun así las leemos de env para poder
// cambiar entre Test Store / producción sin tocar código.
//
// - En desarrollo usamos la **Test Store** de RevenueCat (key `test_...`): permite
//   probar el flujo de compra y los paywalls SIN tener las suscripciones aprobadas
//   en App Store / Google Play.
// - En producción, cada plataforma usa su propia key (`appl_...` para iOS,
//   `goog_...` para Android), que se obtienen en el dashboard de RevenueCat.

import { Capacitor } from "@capacitor/core";
import type { PlanTier } from "@/lib/config/plans-config";

/** Key de la Test Store (sirve para iOS, Android y web en desarrollo). */
const TEST_STORE_KEY = "test_WPKEAaPUgcUEXsEiUtsdHfTgSBp";

const IOS_KEY = process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY || TEST_STORE_KEY;
const ANDROID_KEY = process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY || TEST_STORE_KEY;
const TEST_KEY = process.env.NEXT_PUBLIC_REVENUECAT_TEST_KEY || TEST_STORE_KEY;

/** Devuelve la API key correcta según la plataforma actual. */
export function getRevenueCatApiKey(): string {
  const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
  if (platform === "ios") return IOS_KEY;
  if (platform === "android") return ANDROID_KEY;
  return TEST_KEY; // web / dev
}

/**
 * Identificador del ENTITLEMENT que da acceso "Pro".
 * DEBE coincidir EXACTAMENTE con el identifier del dashboard de RevenueCat
 * (Entitlements). En este proyecto el identifier es "CreatiFit AI Pro".
 */
export const PRO_ENTITLEMENT_ID = "CreatiFit AI Pro";

/**
 * Identificadores de los productos de suscripción tal y como los creaste en
 * App Store Connect / Google Play (y enlazaste en RevenueCat). Se usan solo para
 * distinguir mensual vs anual al mapear el estado del cliente a nuestro PlanTier.
 */
export const PRODUCT_IDS = {
  monthly: process.env.NEXT_PUBLIC_REVENUECAT_PRODUCT_MONTHLY || "subscription_monthly",
  annual: process.env.NEXT_PUBLIC_REVENUECAT_PRODUCT_ANNUAL || "subscription_yearly",
} as const;

/** Identificador del Offering por defecto en RevenueCat (normalmente "default"). */
export const DEFAULT_OFFERING_ID = "default";

/**
 * Mapea el identificador de producto activo de RevenueCat a nuestro PlanTier.
 * Si no reconoce el producto pero el entitlement está activo, asumimos mensual.
 */
export function productIdToTier(productIdentifier?: string | null): PlanTier {
  if (!productIdentifier) return "free";
  if (productIdentifier.includes(PRODUCT_IDS.annual)) return "pro_annual";
  if (productIdentifier.includes(PRODUCT_IDS.monthly)) return "pro_monthly";
  // Producto Pro desconocido (p. ej. en Test Store): trátalo como Pro mensual.
  return "pro_monthly";
}

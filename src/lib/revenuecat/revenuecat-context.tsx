"use client";

// Provider de RevenueCat.
//
// Responsabilidades:
//   1. Configurar el SDK una sola vez, SOLO en plataforma nativa (iOS/Android).
//      En web el SDK de Capacitor no funciona, así que todo queda como no-op y
//      el usuario se considera "free" (las compras se hacen desde la app móvil).
//   2. Identificar al usuario en RevenueCat con su `user.id` de Supabase
//      (logIn / logOut), para que la suscripción siga al usuario entre dispositivos.
//   3. Mantener `customerInfo` actualizado vía listener y derivar `isPro` + `tier`.
//   4. Exponer acciones: presentar paywall, customer center, restaurar y comprar.
//
// El SDK se importa de forma diferida (dynamic import) dentro de cada acción, igual
// que en `lib/ai/openai.ts`, para no arrastrarlo al bundle web ni romper el SSR.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Capacitor } from "@capacitor/core";
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from "@revenuecat/purchases-capacitor";
import { useAuth } from "@/lib/auth/auth-context";
import { supabase } from "@/lib/supabase-config";
import {
  PRO_ENTITLEMENT_ID,
  getRevenueCatApiKey,
  productIdToTier,
} from "./config";
import type { PlanTier } from "@/lib/config/plans-config";

interface RevenueCatContextValue {
  /** El SDK terminó de configurarse (o estamos en web y no aplica). */
  ready: boolean;
  /** true mientras se carga/actualiza el estado del cliente. */
  loading: boolean;
  /** Plataforma nativa donde las compras están disponibles. */
  isNative: boolean;
  /** ¿Tiene el entitlement Pro activo? */
  isPro: boolean;
  /** Tier derivado del estado de RevenueCat. */
  tier: PlanTier;
  /** Info cruda del cliente (por si necesitas más detalle). */
  customerInfo: CustomerInfo | null;
  /** Presenta el paywall de RevenueCat. Devuelve true si compró/restauró. */
  presentPaywall: () => Promise<boolean>;
  /** Presenta el paywall SOLO si el usuario no tiene Pro. Devuelve true si ya es/queda Pro. */
  presentPaywallIfNeeded: () => Promise<boolean>;
  /** Abre el Customer Center (gestionar/cancelar suscripción, soporte). */
  openCustomerCenter: () => Promise<void>;
  /** Restaura compras previas (obligatorio tener un botón para esto en stores). */
  restorePurchases: () => Promise<boolean>;
  /** Obtiene los offerings disponibles (para un paywall propio si lo quisieras). */
  getOfferings: () => Promise<PurchasesOfferings | null>;
  /** Compra un paquete concreto (flujo manual, alternativa al paywall). */
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Vuelve a leer el estado del cliente desde RevenueCat. */
  refresh: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextValue | undefined>(undefined);

/** Deriva isPro + tier a partir del CustomerInfo. */
function deriveStatus(info: CustomerInfo | null): { isPro: boolean; tier: PlanTier } {
  const entitlement = info?.entitlements?.active?.[PRO_ENTITLEMENT_ID];
  if (!entitlement) return { isPro: false, tier: "free" };
  return { isPro: true, tier: productIdToTier(entitlement.productIdentifier) };
}

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();

  const [ready, setReady] = useState(!isNative); // en web está "listo" de inmediato
  const [loading, setLoading] = useState(isNative);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  // Tier persistido en `profiles.tier` (fuente de verdad del backend: lo escribe
  // el webhook de RevenueCat en compras reales y el panel /admin en cambios
  // manuales). Lo leemos también en el cliente para que un upgrade hecho por un
  // admin (sin compra en RevenueCat) desbloquee la generación igual que en el
  // servidor `generate-plan`, que ya se basa en esta columna.
  const [dbTier, setDbTier] = useState<PlanTier | null>(null);

  // Evita reconfigurar el SDK más de una vez por ciclo de vida de la app.
  const configuredRef = useRef(false);
  // Último appUserID con el que hicimos logIn, para no repetir llamadas.
  const loggedInUserRef = useRef<string | null>(null);

  // 1) Configurar el SDK una sola vez (solo nativo).
  useEffect(() => {
    if (!isNative || configuredRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const { Purchases, LOG_LEVEL } = await import("@revenuecat/purchases-capacitor");
        await Purchases.setLogLevel({
          level: process.env.NODE_ENV === "production" ? LOG_LEVEL.ERROR : LOG_LEVEL.DEBUG,
        });
        await Purchases.configure({
          apiKey: getRevenueCatApiKey(),
          // Si ya conocemos el usuario lo pasamos aquí; si no, RevenueCat usa un
          // ID anónimo y luego haremos logIn cuando inicie sesión.
          appUserID: user?.id ?? undefined,
        });
        configuredRef.current = true;
        if (cancelled) return;

        // Listener: RevenueCat avisa cada vez que cambia el estado de compras
        // (renovación, compra en otro dispositivo, expiración…).
        await Purchases.addCustomerInfoUpdateListener((info) => {
          setCustomerInfo(info);
        });

        const { customerInfo: info } = await Purchases.getCustomerInfo();
        if (!cancelled) {
          setCustomerInfo(info);
          loggedInUserRef.current = user?.id ?? null;
        }
      } catch (err) {
        console.error("[RevenueCat] configure error:", err);
      } finally {
        if (!cancelled) {
          setReady(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Configuramos una sola vez; el cambio de usuario se maneja en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative]);

  // 2) Sincronizar identidad: logIn al iniciar sesión, logOut al cerrarla.
  useEffect(() => {
    if (!isNative || !configuredRef.current) return;
    const currentId = user?.id ?? null;
    if (currentId === loggedInUserRef.current) return;

    let cancelled = false;
    (async () => {
      try {
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        if (currentId) {
          const { customerInfo: info } = await Purchases.logIn({ appUserID: currentId });
          if (!cancelled) setCustomerInfo(info);
        } else {
          // Sesión cerrada: volvemos a un usuario anónimo de RevenueCat.
          const { customerInfo: info } = await Purchases.logOut();
          if (!cancelled) setCustomerInfo(info);
        }
        loggedInUserRef.current = currentId;
      } catch (err) {
        console.error("[RevenueCat] logIn/logOut error:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isNative, user?.id]);

  // Relee `profiles.tier` del usuario actual. Best-effort: si falla, se mantiene
  // el estado de RevenueCat como único indicador (no rompe el gating).
  const refreshDbTier = useCallback(async () => {
    const uid = user?.id;
    if (!uid) {
      setDbTier(null);
      return;
    }
    try {
      const { data } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", uid)
        .single();
      setDbTier(((data?.tier as PlanTier) ?? "free"));
    } catch (err) {
      console.error("[RevenueCat] refreshDbTier error:", err);
    }
  }, [user?.id]);

  // Sincroniza el tier del backend al montar y cada vez que cambia el usuario
  // (p. ej. al iniciar sesión con otra cuenta). Cubre el caso de un upgrade
  // hecho por un admin: al volver a entrar, el cliente ya ve el tier Pro.
  useEffect(() => {
    refreshDbTier();
  }, [refreshDbTier]);

  const refresh = useCallback(async () => {
    await refreshDbTier();
    if (!isNative) return;
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      const { customerInfo: info } = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (err) {
      console.error("[RevenueCat] refresh error:", err);
    }
  }, [isNative, refreshDbTier]);

  const presentPaywall = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      console.warn("[RevenueCat] El paywall solo está disponible en la app móvil.");
      return false;
    }
    try {
      const { RevenueCatUI } = await import("@revenuecat/purchases-capacitor-ui");
      const { PAYWALL_RESULT } = await import("@revenuecat/purchases-capacitor");
      const { result } = await RevenueCatUI.presentPaywall();
      await refresh();
      return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
    } catch (err) {
      console.error("[RevenueCat] presentPaywall error:", err);
      return false;
    }
  }, [isNative, refresh]);

  const presentPaywallIfNeeded = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      console.warn("[RevenueCat] El paywall solo está disponible en la app móvil.");
      return false;
    }
    try {
      const { RevenueCatUI } = await import("@revenuecat/purchases-capacitor-ui");
      const { PAYWALL_RESULT } = await import("@revenuecat/purchases-capacitor");
      const { result } = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: PRO_ENTITLEMENT_ID,
      });
      await refresh();
      // NOT_PRESENTED = el usuario ya tenía Pro; cualquiera de estos significa "es Pro".
      return (
        result === PAYWALL_RESULT.NOT_PRESENTED ||
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      );
    } catch (err) {
      console.error("[RevenueCat] presentPaywallIfNeeded error:", err);
      return false;
    }
  }, [isNative, refresh]);

  const openCustomerCenter = useCallback(async () => {
    if (!isNative) {
      console.warn("[RevenueCat] El Customer Center solo está disponible en la app móvil.");
      return;
    }
    try {
      const { RevenueCatUI } = await import("@revenuecat/purchases-capacitor-ui");
      await RevenueCatUI.presentCustomerCenter();
      await refresh();
    } catch (err) {
      console.error("[RevenueCat] presentCustomerCenter error:", err);
    }
  }, [isNative, refresh]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      const { customerInfo: info } = await Purchases.restorePurchases();
      setCustomerInfo(info);
      return !!info?.entitlements?.active?.[PRO_ENTITLEMENT_ID];
    } catch (err) {
      console.error("[RevenueCat] restorePurchases error:", err);
      return false;
    }
  }, [isNative]);

  const getOfferings = useCallback(async (): Promise<PurchasesOfferings | null> => {
    if (!isNative) return null;
    try {
      const { Purchases } = await import("@revenuecat/purchases-capacitor");
      return await Purchases.getOfferings();
    } catch (err) {
      console.error("[RevenueCat] getOfferings error:", err);
      return null;
    }
  }, [isNative]);

  const purchasePackage = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      if (!isNative) return false;
      try {
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        const { customerInfo: info } = await Purchases.purchasePackage({ aPackage: pkg });
        setCustomerInfo(info);
        return !!info?.entitlements?.active?.[PRO_ENTITLEMENT_ID];
      } catch (err) {
        // El usuario puede cancelar la compra: eso NO es un error real.
        const e = err as { code?: string; userCancelled?: boolean };
        if (e?.userCancelled) return false;
        console.error("[RevenueCat] purchasePackage error:", err);
        return false;
      }
    },
    [isNative]
  );

  // Estado efectivo = combinación de RevenueCat (señal viva en el dispositivo,
  // p. ej. justo tras comprar y antes de que llegue el webhook) y `profiles.tier`
  // (fuente de verdad del backend; incluye upgrades manuales del admin). Es Pro
  // si CUALQUIERA de las dos lo indica.
  const rcStatus = deriveStatus(customerInfo);
  const dbIsPro = dbTier === "pro_monthly" || dbTier === "pro_annual";
  const isPro = rcStatus.isPro || dbIsPro;
  const tier: PlanTier = rcStatus.isPro ? rcStatus.tier : dbTier ?? "free";

  return (
    <RevenueCatContext.Provider
      value={{
        ready,
        loading,
        isNative,
        isPro,
        tier,
        customerInfo,
        presentPaywall,
        presentPaywallIfNeeded,
        openCustomerCenter,
        restorePurchases,
        getOfferings,
        purchasePackage,
        refresh,
      }}
    >
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat(): RevenueCatContextValue {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) throw new Error("useRevenueCat debe usarse dentro de <RevenueCatProvider>");
  return ctx;
}

"use client";
import { useServedFromCache } from "@/lib/local-cache";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Aviso discreto cuando no hay conexión o lo que se ve viene de la copia local.
export function ConnectionBanner() {
  const { t } = useTranslation("common");
  const fromCache = useServedFromCache();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline && !fromCache) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 text-[12px] font-semibold cf-txt2 bg-surface-2 border-b border-border"
      style={{ padding: "6px 12px" }}
    >
      <WifiOff size={13} />
      {offline
        ? t("common.offline_banner", "Sin conexión · mostrando datos guardados")
        : t("common.cached_banner", "Conexión inestable · mostrando datos guardados")}
    </div>
  );
}

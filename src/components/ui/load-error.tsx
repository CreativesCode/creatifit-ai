"use client";
import { RefreshCw, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

// Estado de "no se pudo cargar": distinto de "no hay datos". Un fallo de red no
// debe presentarse como una cuenta vacía.
export function LoadError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation("common");
  return (
    <div className="cf-card mb-4" style={{ padding: 22, borderRadius: 24 }}>
      <div className="flex flex-col items-center text-center gap-3">
        <div
          className="cf-icon-tile bg-surface-2 border border-border"
          style={{ width: 52, height: 52 }}
        >
          <WifiOff size={24} />
        </div>
        <div className="cf-h2 text-[18px]">
          {t("common.load_error_title", "No pudimos cargar tus datos")}
        </div>
        <p className="cf-muted text-[13.5px] leading-relaxed max-w-xs">
          {t(
            "common.load_error_body",
            "Parece un problema de conexión. Tus datos siguen guardados; inténtalo de nuevo."
          )}
        </p>
        <button className="cf-btn cf-btn-primary cf-btn-block mt-1" onClick={onRetry}>
          <RefreshCw size={17} />
          {t("common.retry", "Reintentar")}
        </button>
      </div>
    </div>
  );
}

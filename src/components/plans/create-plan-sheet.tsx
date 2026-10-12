"use client";
import { ChevronRight, PencilLine, Sparkles, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBackGuard } from "@/lib/back-guard";

/** Hoja para elegir cómo crear un plan: con IA (cuestionario) o a mano. */
export function CreatePlanSheet({
  hasDraft,
  onClose,
  onAi,
  onManual,
}: {
  /** Hay un plan a mano empezado y sin guardar en este teléfono. */
  hasDraft: boolean;
  onClose: () => void;
  onAi: () => void;
  onManual: () => void;
}) {
  const { t } = useTranslation("common");
  useBackGuard(true, onClose);

  const option = "cf-card-solid flex items-center gap-3.5 text-left w-full";
  const optionStyle = { padding: "14px 15px", borderRadius: 18 };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="cf-card w-full sm:max-w-md"
        style={{
          padding: 18,
          borderRadius: "22px 22px 0 0",
          paddingBottom: "calc(18px + var(--sab))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="cf-h2 text-[17px]">{t("plans.create.title", "Crear un plan")}</div>
          <button
            onClick={onClose}
            className="cf-icon-tile bg-surface-2 border border-border shrink-0"
            style={{ width: 34, height: 34 }}
            aria-label={t("ui.close", "Cerrar")}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <button className={option} style={optionStyle} onClick={onManual}>
            <div
              className="cf-icon-tile bg-surface-2 border border-border shrink-0"
              style={{ width: 44, height: 44 }}
            >
              <PencilLine size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px]">
                {hasDraft
                  ? t("plans.create.manual_resume", "Seguir con mi plan a mano")
                  : t("plans.create.manual", "Crear a mano")}
              </div>
              <div className="cf-muted text-[12.5px] mt-0.5">
                {t(
                  "plans.create.manual_desc",
                  "Elige tú los ejercicios del catálogo. Sin límite de planes."
                )}
              </div>
            </div>
            <ChevronRight size={18} className="text-faint shrink-0" />
          </button>

          <button className={option} style={optionStyle} onClick={onAi}>
            <div
              className="cf-icon-tile bg-grad-brand text-white shrink-0"
              style={{ width: 44, height: 44 }}
            >
              <Sparkles size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[15px]">
                {t("plans.create.ai", "Crear con IA")}
              </div>
              <div className="cf-muted text-[12.5px] mt-0.5">
                {t(
                  "plans.create.ai_desc",
                  "Responde unas preguntas y la IA arma el plan según tu objetivo y tu equipo."
                )}
              </div>
            </div>
            <ChevronRight size={18} className="text-faint shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

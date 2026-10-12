"use client";
import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBackGuard } from "@/lib/back-guard";
import { EQUIPMENT_OPTIONS } from "@/lib/constants/equipment";
import {
  AI_CONSTRAINTS,
  AI_GENDERS,
  AI_LEVELS,
  AI_OBJECTIVES,
  parseAiProfile,
  profileFromMeta,
  type AiProfile,
} from "@/lib/plans/ai-profile";
import { supabaseClient } from "@/lib/supabase-client";

type Draft = {
  objective: string;
  level: string;
  gender: string;
  age: string;
  weightKg: string;
  heightCm: string;
  equipment: Record<string, boolean>;
  constraints: Record<string, boolean>;
};

const toDraft = (p: AiProfile | null): Draft => ({
  objective: p?.objective ?? "general_health",
  level: p?.level ?? "beginner",
  gender: p?.gender ?? "other",
  age: p ? String(p.age) : "",
  weightKg: p ? String(p.weightKg) : "",
  heightCm: p ? String(p.heightCm) : "",
  equipment: p?.equipment ?? {},
  constraints: p?.constraints ?? {},
});

/**
 * Cuestionario corto que la IA necesita para trabajar sobre un plan hecho a
 * mano. Se pide una vez por plan (la primera vez que se usa "Rellenar con IA"
 * o "Mejorar plan") y llega relleno con las respuestas del plan más reciente
 * que las tenga.
 */
export function AiProfileForm({
  initial,
  submitLabel,
  onClose,
  onSubmit,
}: {
  initial?: AiProfile | null;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (profile: AiProfile) => void;
}) {
  const { t } = useTranslation("common");
  const [form, setForm] = useState<Draft>(() => toDraft(initial ?? null));
  const [invalid, setInvalid] = useState(false);
  const touchedRef = useRef(false);

  useBackGuard(true, onClose);

  // Sin perfil de partida: se propone el del plan más reciente que lo tenga.
  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    supabaseClient
      .getPlans()
      .then((plans) => {
        if (cancelled || touchedRef.current || !Array.isArray(plans)) return;
        const sorted = [...plans].sort((a, b) =>
          String(b.created_at).localeCompare(String(a.created_at))
        );
        for (const plan of sorted) {
          const found = profileFromMeta(plan?.payload?.meta);
          if (found) {
            setForm(toDraft(found));
            return;
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const set = (patch: Partial<Draft>) => {
    touchedRef.current = true;
    setInvalid(false);
    setForm((prev) => ({ ...prev, ...patch }));
  };
  const toggle = (group: "equipment" | "constraints", key: string) =>
    set({ [group]: { ...form[group], [key]: !form[group][key] } });

  const submit = () => {
    const profile = parseAiProfile({
      objective: form.objective as AiProfile["objective"],
      level: form.level as AiProfile["level"],
      gender: form.gender as AiProfile["gender"],
      age: parseInt(form.age, 10),
      weightKg: parseFloat(form.weightKg.replace(",", ".")),
      heightCm: parseInt(form.heightCm, 10),
      equipment: form.equipment,
      constraints: form.constraints,
    });
    if (!profile) {
      setInvalid(true);
      return;
    }
    onSubmit(profile);
  };

  const label = "cf-muted text-[12px] font-semibold mb-2";
  const segment = (on: boolean) => ({
    padding: "10px 0",
    borderRadius: 10,
    background: on ? "var(--grad-brand)" : "transparent",
    color: on ? "#fff" : "var(--muted)",
  });

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "var(--bg)" }}>
      <div
        className="shrink-0 px-4 pb-3 border-b border-border"
        style={{ paddingTop: "calc(12px + var(--sat, 0px))" }}
      >
        <div className="container mx-auto max-w-xl px-0 flex items-center gap-3">
          <button
            onClick={onClose}
            className="cf-icon-tile bg-surface-2 border border-border"
            style={{ width: 40, height: 40 }}
            aria-label={t("ui.close", "Cerrar")}
          >
            <X size={19} />
          </button>
          <span className="cf-h2 flex-1 text-[16px] truncate">
            {t("plans.ai_profile.title", "Datos para la IA")}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="container mx-auto max-w-xl px-0 flex flex-col gap-5">
          <p className="cf-muted text-[13px] leading-relaxed">
            {t(
              "plans.ai_profile.intro",
              "La IA necesita estos datos para elegir ejercicios que puedas hacer. Se piden una sola vez para este plan."
            )}
          </p>

          <div>
            <div className={label}>{t("onboarding.objective.label")}</div>
            <select
              value={form.objective}
              onChange={(e) => set({ objective: e.target.value })}
              className="cf-card w-full text-[14.5px] font-semibold outline-none"
              style={{ padding: "13px 14px", borderRadius: 14, color: "var(--txt)" }}
            >
              {AI_OBJECTIVES.map((o) => (
                <option key={o} value={o} style={{ color: "#111" }}>
                  {t(`onboarding.objective.${o}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className={label}>{t("onboarding.level.label")}</div>
            <div className="flex flex-col gap-2">
              {AI_LEVELS.map((lvl) => {
                const on = form.level === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => set({ level: lvl })}
                    aria-pressed={on}
                    className="cf-card flex items-center gap-3 text-left"
                    style={{
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: on ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                    }}
                  >
                    <span className="flex-1 font-bold text-[14px]">
                      {t(`onboarding.level.${lvl}`)}
                    </span>
                    {on && <Check size={16} className="text-primary" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className={label}>{t("onboarding.personal.gender")}</div>
            <div
              className="flex gap-2"
              style={{ background: "var(--surface-2)", padding: 5, borderRadius: 14 }}
            >
              {AI_GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set({ gender: g })}
                  aria-pressed={form.gender === g}
                  className="flex-1 font-semibold text-[13px]"
                  style={segment(form.gender === g)}
                >
                  {t(`onboarding.personal.gender_${g}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                ["age", t("onboarding.personal.age"), "numeric"],
                ["weightKg", t("onboarding.personal.weight"), "decimal"],
                ["heightCm", t("onboarding.personal.height"), "numeric"],
              ] as const
            ).map(([field, text, mode]) => (
              <label
                key={field}
                className="cf-card block"
                style={{ padding: "10px 12px", borderRadius: 14 }}
              >
                <span className="cf-muted text-[11px] font-semibold block truncate">{text}</span>
                <input
                  value={form[field]}
                  onChange={(e) => set({ [field]: e.target.value })}
                  inputMode={mode}
                  autoComplete="off"
                  className="cf-num bg-transparent outline-none w-full"
                  style={{ fontSize: 20, color: "var(--txt)" }}
                />
              </label>
            ))}
          </div>

          <div>
            <div className={label}>{t("onboarding.equipment.label")}</div>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(({ key, label: fallback }) => {
                const on = !!form.equipment[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle("equipment", key)}
                    aria-pressed={on}
                    className={`cf-chip ${on ? "cf-chip-brand" : ""}`}
                    style={{ padding: "9px 13px", fontSize: 12.5 }}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                    {String(t(`equipment.${key}`, fallback))}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className={label}>{t("onboarding.constraints.label", "Restricciones")}</div>
            <p className="cf-muted text-[12px] mb-2">
              {t(
                "onboarding.constraints.help",
                "Marca lo que debamos evitar por lesiones o molestias. Lo dejaremos fuera de tu plan."
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {AI_CONSTRAINTS.map((key) => {
                const on = !!form.constraints[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle("constraints", key)}
                    aria-pressed={on}
                    className={`cf-chip ${on ? "cf-chip-brand" : ""}`}
                    style={{ padding: "9px 13px", fontSize: 12.5 }}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                    {String(t(`onboarding.constraints.${key}`, key))}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        className="shrink-0 px-4 pt-3 border-t border-border"
        style={{ paddingBottom: "calc(14px + var(--sab, 0px))" }}
      >
        <div className="container mx-auto max-w-xl px-0">
          {invalid && (
            <p className="text-[12.5px] font-semibold text-center mb-2" style={{ color: "#ef4444" }}>
              {t(
                "plans.ai_profile.invalid",
                "Revisa edad (16-80), peso (30-200 kg) y altura (120-250 cm), y marca al menos una opción de equipo."
              )}
            </p>
          )}
          <button className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg" onClick={submit}>
            {submitLabel ?? t("plans.ai_profile.submit", "Guardar y continuar")}
          </button>
        </div>
      </div>
    </div>
  );
}

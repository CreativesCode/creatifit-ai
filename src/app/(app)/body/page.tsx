"use client";

import { Input } from "@/components/ui/input";
import { useRevenueCat } from "@/lib/revenuecat/revenuecat-context";
import { supabaseClient } from "@/lib/supabase-client";
import {
  ArrowLeft,
  Camera,
  Images,
  Lock,
  Plus,
  Ruler,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface Measurement {
  id: string;
  date: string;
  weight?: number | null;
  body_fat?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  arms?: number | null;
  thighs?: number | null;
  photo_path?: string | null;
  notes?: string | null;
  created_at?: string;
}

// Campos de medida (cm) que pintamos en el formulario y en las tarjetas.
const MEASURE_FIELDS = ["chest", "waist", "hips", "arms", "thighs"] as const;
type MeasureField = (typeof MEASURE_FIELDS)[number];

const num = (v: string): number | null => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const fmt = (n?: number | null) => (n == null ? "—" : Number.isInteger(n) ? `${n}` : n.toFixed(1));

export default function BodyPage() {
  const { t, i18n } = useTranslation("common");
  const router = useRouter();
  const { isPro, presentPaywall } = useRevenueCat();

  const [entries, setEntries] = useState<Measurement[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado del formulario (strings; se parsean al guardar).
  const [form, setForm] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const load = async () => {
    try {
      const data = (await supabaseClient.getMeasurements()) as Measurement[];
      setEntries(data);
      // Firmamos las URLs de las fotos (bucket privado).
      const withPhotos = data.filter((d) => d.photo_path);
      const urls: Record<string, string> = {};
      await Promise.all(
        withPhotos.map(async (d) => {
          const u = await supabaseClient.getPhotoUrl(d.photo_path!);
          if (u) urls[d.id] = u;
        })
      );
      setPhotoUrls(urls);
    } catch (e) {
      console.error("Error loading measurements", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      let photo_path: string | null = null;
      if (photoFile) photo_path = await supabaseClient.uploadProgressPhoto(photoFile);

      const entry: Record<string, unknown> = {
        date: form.date || new Date().toISOString().split("T")[0],
        weight: num(form.weight ?? ""),
        body_fat: num(form.body_fat ?? ""),
        notes: form.notes?.trim() || null,
        photo_path,
      };
      for (const f of MEASURE_FIELDS) entry[f] = num(form[f] ?? "");

      await supabaseClient.saveMeasurement(entry);
      setForm({});
      setPhotoFile(null);
      setShowForm(false);
      setLoading(true);
      await load();
    } catch (e) {
      console.error("Error saving measurement", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m: Measurement) => {
    try {
      await supabaseClient.deleteMeasurement(m.id, m.photo_path);
      setEntries((prev) => prev.filter((e) => e.id !== m.id));
    } catch (e) {
      console.error("Error deleting measurement", e);
    }
  };

  // Delta de peso de cada entrada respecto a la anterior cronológica (más antigua).
  // entries viene desc por fecha → la "anterior" es la siguiente en el array.
  const weightDelta = (i: number): number | null => {
    const cur = entries[i]?.weight;
    const prev = entries[i + 1]?.weight;
    if (cur == null || prev == null) return null;
    return +(cur - prev).toFixed(1);
  };

  // Para la comparación: primera y última foto disponibles (cronológico).
  const photoEntries = useMemo(
    () => entries.filter((e) => e.photo_path && photoUrls[e.id]),
    [entries, photoUrls]
  );
  const before = photoEntries[photoEntries.length - 1];
  const after = photoEntries[0];
  const canCompare = before && after && before.id !== after.id;

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(i18n.language, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="container mx-auto max-w-xl lg:max-w-3xl px-4 lg:px-6 pt-4 lg:pt-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between pt-1 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="cf-icon-tile bg-surface-2 border border-border"
            style={{ width: 40, height: 40 }}
            aria-label={t("body.back", "Volver")}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="cf-eyebrow">{t("body.eyebrow", "Tu cuerpo")}</div>
            <div className="cf-h1 text-[22px] mt-0.5">{t("body.title", "Progreso corporal")}</div>
          </div>
        </div>
        <button
          className="cf-btn cf-btn-primary cf-btn-sm"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
        </button>
      </div>

      {/* Formulario de registro */}
      {showForm && (
        <div className="cf-card mb-4" style={{ padding: 16, borderRadius: 20 }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("body.date", "Fecha")}>
              <Input
                type="date"
                value={form.date ?? ""}
                onChange={(e) => setField("date", e.target.value)}
              />
            </Field>
            <Field label={t("body.weight", "Peso (kg)")}>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={form.weight ?? ""}
                onChange={(e) => setField("weight", e.target.value)}
              />
            </Field>
            <Field label={t("body.body_fat", "% grasa")}>
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={form.body_fat ?? ""}
                onChange={(e) => setField("body_fat", e.target.value)}
              />
            </Field>
            {MEASURE_FIELDS.map((f) => (
              <Field key={f} label={t(`body.${f}`)}>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="cm"
                  value={form[f] ?? ""}
                  onChange={(e) => setField(f, e.target.value)}
                />
              </Field>
            ))}
          </div>

          {/* Foto */}
          <label className="cf-card-solid flex items-center gap-3 mt-3 cursor-pointer" style={{ padding: "11px 13px", borderRadius: 14 }}>
            <div className="cf-icon-tile bg-grad-brand text-white" style={{ width: 38, height: 38, borderRadius: 11 }}>
              <Camera size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[13.5px]">{t("body.photo", "Foto de progreso")}</div>
              <div className="cf-muted text-[11.5px] truncate">
                {photoFile ? photoFile.name : t("body.photo_hint", "Opcional · privada, solo tú la ves")}
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <button
            className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg mt-3"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t("body.saving", "Guardando…") : t("body.save", "Guardar registro")}
          </button>
        </div>
      )}

      {/* Comparación antes/después (premium) */}
      {!loading && canCompare && (
        <div className="cf-card mb-4 relative overflow-hidden" style={{ padding: 16, borderRadius: 20 }}>
          <div className="flex items-center gap-2 mb-3">
            <Images size={17} style={{ color: "var(--primary)" }} />
            <div className="cf-h2 text-[15px]">{t("body.compare_title", "Antes y después")}</div>
            {!isPro && <span className="cf-chip cf-chip-brand ml-auto">PRO</span>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[before, after].map((m, idx) => (
              <div key={m.id} className="relative">
                <div
                  className="overflow-hidden"
                  style={{ borderRadius: 14, aspectRatio: "3/4", background: "var(--surface-2)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoUrls[m.id]}
                    alt={idx === 0 ? "before" : "after"}
                    className="w-full h-full object-cover"
                    style={{ filter: isPro ? "none" : "blur(14px)" }}
                  />
                </div>
                <div className="text-center cf-muted text-[11.5px] font-semibold mt-1.5">
                  {idx === 0 ? t("body.before", "Antes") : t("body.after", "Después")} · {fmtDate(m.date)}
                </div>
              </div>
            ))}
          </div>
          {!isPro && (
            <button
              className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(1px)" }}
              onClick={() => presentPaywall?.()}
            >
              <div className="cf-icon-tile bg-grad-brand text-white shadow-glow-brand" style={{ width: 48, height: 48 }}>
                <Lock size={22} />
              </div>
              <div className="font-bold text-[14px] text-white">
                {t("body.compare_locked", "Compara tu progreso con Pro")}
              </div>
            </button>
          )}
        </div>
      )}

      {/* Lista de registros */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="cf-card animate-pulse" style={{ padding: 16, borderRadius: 18 }}>
              <div className="h-4 w-1/3 bg-surface-2 rounded mb-2" />
              <div className="h-3 w-1/2 bg-surface-2 rounded" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-14">
          <div className="cf-icon-tile bg-surface-2 border border-border mx-auto mb-4" style={{ width: 80, height: 80, borderRadius: 26 }}>
            <Scale className="w-9 h-9 text-muted" />
          </div>
          <h3 className="cf-h2 text-[18px] mb-2">{t("body.empty_title", "Aún no hay registros")}</h3>
          <p className="cf-muted text-sm mb-6 max-w-xs mx-auto">
            {t("body.empty_desc", "Registra tu peso, medidas y una foto para ver tu transformación con el tiempo.")}
          </p>
          <button className="cf-btn cf-btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} />
            {t("body.add_first", "Añadir primer registro")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {entries.map((m, i) => {
            const d = weightDelta(i);
            return (
              <div key={m.id} className="cf-card flex gap-3.5" style={{ padding: 14, borderRadius: 18 }}>
                {photoUrls[m.id] ? (
                  <div className="overflow-hidden shrink-0" style={{ width: 56, height: 56, borderRadius: 14 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrls[m.id]} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="cf-icon-tile bg-surface-2 border border-border shrink-0" style={{ width: 56, height: 56, borderRadius: 14 }}>
                    <Ruler size={22} className="text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-[14.5px] capitalize">{fmtDate(m.date)}</div>
                    <button
                      onClick={() => handleDelete(m)}
                      className="cf-muted hover:text-primary p-1"
                      aria-label={t("body.delete", "Borrar")}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1.5">
                    {m.weight != null && (
                      <span className="flex items-center gap-1 font-bold text-[14px]">
                        {fmt(m.weight)} kg
                        {d != null && d !== 0 && (
                          <span
                            className="flex items-center gap-0.5 text-[11px] font-semibold"
                            style={{ color: d < 0 ? "var(--mint)" : "var(--amber)" }}
                          >
                            {d < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                            {Math.abs(d)}
                          </span>
                        )}
                      </span>
                    )}
                    {m.body_fat != null && (
                      <span className="cf-chip" style={{ fontSize: 11 }}>{fmt(m.body_fat)}% {t("body.fat_short", "grasa")}</span>
                    )}
                  </div>
                  {/* medidas */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {MEASURE_FIELDS.filter((f) => m[f] != null).map((f) => (
                      <span key={f} className="cf-chip cf-chip-cyan" style={{ fontSize: 10.5 }}>
                        {t(`body.${f}`)}: {fmt(m[f as MeasureField])}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="cf-muted text-[11.5px] font-semibold">{label}</span>
      {children}
    </label>
  );
}

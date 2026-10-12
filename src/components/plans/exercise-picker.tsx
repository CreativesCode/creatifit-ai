"use client";
import { Check, Heart, Loader2, Search, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExerciseThumb } from "@/components/ui/exercise-image";
import { useBackGuard } from "@/lib/back-guard";
import { EXERCISE_CATEGORIES } from "@/lib/constants/exercise-categories";
import { supabaseClient } from "@/lib/supabase-client";

export interface PickedExercise {
  id: string;
  name: string;
  gif_url: string | null;
}

interface Row extends PickedExercise {
  category: string | null;
  equipment: string | null;
}

const PAGE = 30;

/**
 * Hoja a pantalla completa para elegir ejercicios del catálogo: buscador,
 * grupos musculares, favoritos y selección múltiple. Necesita conexión: sin
 * ella no lista nada y lo dice, en vez de enseñar un catálogo a medias.
 */
export function ExercisePicker({
  presentIds,
  maxSelectable,
  onClose,
  onConfirm,
}: {
  /** Ejercicios que el día ya tiene: se muestran marcados y no se pueden elegir. */
  presentIds: string[];
  /** Huecos libres en el día. */
  maxSelectable: number;
  onClose: () => void;
  onConfirm: (exercises: PickedExercise[]) => void;
}) {
  const { t } = useTranslation("common");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [favorites, setFavorites] = useState<string[] | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" && navigator.onLine === false
  );
  const [selected, setSelected] = useState<PickedExercise[]>([]);

  const present = new Set(presentIds);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Cada búsqueda nueva invalida las respuestas de la anterior que lleguen tarde.
  const queryRef = useRef(0);

  useBackGuard(true, onClose);

  useEffect(() => {
    const update = () => setOffline(navigator.onLine === false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    supabaseClient
      .getFavoriteIds()
      .then(setFavorites)
      .catch(() => setFavorites([]));
  }, []);

  // Los favoritos solo cuentan para la búsqueda cuando su filtro está activo.
  const favIds = onlyFavs ? favorites : undefined;
  const load = useCallback(
    async (nextPage: number) => {
      const query = nextPage === 1 ? ++queryRef.current : queryRef.current;
      setLoading(true);
      setFailed(false);
      try {
        const res = await supabaseClient.pickExercises({
          page: nextPage,
          limit: PAGE,
          search: search.trim() || undefined,
          category: category || undefined,
          onlyIds: favIds === undefined ? undefined : favIds ?? [],
        });
        if (query !== queryRef.current) return;
        setRows((prev) => (nextPage === 1 ? res.data : [...prev, ...res.data]));
        setHasMore(res.hasMore);
        setPage(nextPage);
      } catch (err) {
        if (query !== queryRef.current) return;
        console.error("Error loading exercises:", err);
        setFailed(true);
      } finally {
        if (query === queryRef.current) setLoading(false);
      }
    },
    [search, category, favIds]
  );

  // Primera página al abrir y al cambiar la búsqueda o los filtros (con espera
  // corta para no pedir una página por letra). Sin conexión no se pide nada.
  useEffect(() => {
    if (offline) return;
    if (favIds === null) return; // favoritos aún cargando
    const handle = setTimeout(() => {
      scrollRef.current?.scrollTo(0, 0);
      load(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [load, offline, favIds]);

  // Scroll infinito dentro de la hoja.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || failed || offline) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) load(page + 1);
      },
      { root: scrollRef.current, rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, failed, offline, page, load]);

  const full = selected.length >= maxSelectable;
  const toggle = (row: Row) => {
    setSelected((prev) => {
      if (prev.some((s) => s.id === row.id)) return prev.filter((s) => s.id !== row.id);
      if (prev.length >= maxSelectable) return prev;
      return [...prev, { id: row.id, name: row.name, gif_url: row.gif_url }];
    });
  };

  const chip = (active: boolean) => `cf-chip shrink-0 ${active ? "cf-chip-brand" : ""}`;
  const chipStyle = { padding: "8px 14px", fontSize: 12.5, gap: 5 };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: "var(--bg)" }}>
      {/* cabecera fija: título, buscador y filtros */}
      <div
        className="shrink-0 px-4 pb-2 border-b border-border"
        style={{ paddingTop: "calc(12px + var(--sat, 0px))" }}
      >
        <div className="container mx-auto max-w-xl lg:max-w-3xl px-0">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onClose}
              className="cf-icon-tile bg-surface-2 border border-border"
              style={{ width: 40, height: 40 }}
              aria-label={t("ui.close", "Cerrar")}
            >
              <X size={19} />
            </button>
            <span className="cf-h2 flex-1 text-[16px] truncate">
              {t("plans.picker.title", "Añadir ejercicios")}
            </span>
          </div>
          <div
            className="cf-card flex items-center gap-2.5 mb-2.5"
            style={{ padding: "0 14px", borderRadius: 15 }}
          >
            <Search size={18} className="text-muted shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("exercises.search.placeholder")}
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              className="bg-transparent outline-none w-full text-[14px] py-3"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setOnlyFavs((v) => !v)}
              className={chip(onlyFavs)}
              style={chipStyle}
              aria-pressed={onlyFavs}
            >
              <Heart size={12} fill={onlyFavs ? "currentColor" : "none"} />
              {t("exercises.filters.favorites", "Favoritos")}
            </button>
            <button onClick={() => setCategory("")} className={chip(!category)} style={chipStyle}>
              {t("exercises.filters.all_types")}
            </button>
            {EXERCISE_CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={chip(category === c.value)}
                style={chipStyle}
              >
                {String(t(`exercises.categories.${c.value}`, c.fallback))}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* resultados */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        <div className="container mx-auto max-w-xl lg:max-w-3xl px-0">
          {offline ? (
            <div className="text-center py-14">
              <WifiOff size={30} className="mx-auto mb-3 text-muted" />
              <div className="cf-h2 text-[16px] mb-1.5">
                {t("plans.picker.offline_title", "Hace falta conexión")}
              </div>
              <p className="cf-muted text-[13px] px-4">
                {t(
                  "plans.picker.offline_desc",
                  "Para elegir ejercicios del catálogo necesitas conexión. Lo que ya tienes en el plan sigue guardado en este teléfono."
                )}
              </p>
            </div>
          ) : failed && rows.length === 0 ? (
            <div className="text-center py-14">
              <WifiOff size={30} className="mx-auto mb-3 text-muted" />
              <p className="cf-muted text-[13px] px-4 mb-4">
                {t(
                  "plans.picker.error",
                  "No se pudo cargar el catálogo. Revisa tu conexión e inténtalo de nuevo."
                )}
              </p>
              <button className="cf-btn cf-btn-ghost" onClick={() => load(1)}>
                {t("plans.retry", "Reintentar")}
              </button>
            </div>
          ) : !loading && rows.length === 0 ? (
            <p className="cf-muted text-[13px] text-center py-14 px-4">
              {onlyFavs && (favorites?.length ?? 0) === 0
                ? t(
                    "exercises.no_results.no_favorites",
                    "Aún no tienes favoritos. Toca el corazón en un ejercicio para guardarlo aquí."
                  )
                : t("exercises.no_results.description")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {rows.map((row) => {
                const inDay = present.has(row.id);
                const picked = selected.some((s) => s.id === row.id);
                return (
                  <button
                    key={row.id}
                    type="button"
                    disabled={inDay || (full && !picked)}
                    onClick={() => toggle(row)}
                    aria-pressed={picked}
                    className="cf-card-flat flex items-center gap-3 text-left disabled:opacity-50"
                    style={{
                      padding: 10,
                      borderRadius: 16,
                      borderColor: picked ? "var(--primary)" : undefined,
                    }}
                  >
                    <ExerciseThumb
                      gif={row.gif_url}
                      alt={row.name}
                      className="rounded-[12px] object-contain bg-white/90 shrink-0"
                      style={{ width: 50, height: 50 }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[14.5px] leading-tight">{row.name}</div>
                      <div className="cf-muted text-[11.5px] truncate mt-0.5">
                        {inDay
                          ? t("plans.picker.in_day", "Ya está en este día")
                          : row.equipment || ""}
                      </div>
                    </div>
                    <span
                      className="cf-icon-tile shrink-0"
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        border: "1.5px solid var(--border)",
                        background: picked || inDay ? "var(--primary)" : "transparent",
                        color: "#fff",
                      }}
                      aria-hidden
                    >
                      {(picked || inDay) && <Check size={15} />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!offline && loading && (
            <div className="flex justify-center py-6">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          )}
          {!offline && failed && rows.length > 0 && (
            <div className="text-center py-4">
              <button className="cf-btn cf-btn-ghost cf-btn-sm" onClick={() => load(page + 1)}>
                {t("plans.picker.load_more_retry", "No se pudo cargar más. Reintentar")}
              </button>
            </div>
          )}
          <div ref={sentinelRef} aria-hidden style={{ height: 1 }} />
        </div>
      </div>

      {/* pie fijo: confirmar */}
      <div
        className="shrink-0 px-4 pt-3 border-t border-border"
        style={{ paddingBottom: "calc(14px + var(--sab, 0px))" }}
      >
        <div className="container mx-auto max-w-xl lg:max-w-3xl px-0">
          {full && (
            <p className="cf-muted text-[12px] text-center mb-2">
              {t("plans.picker.limit", "No caben más ejercicios en este día.")}
            </p>
          )}
          <button
            className="cf-btn cf-btn-primary cf-btn-block cf-btn-lg"
            disabled={selected.length === 0}
            onClick={() => onConfirm(selected)}
          >
            {selected.length === 0
              ? t("plans.picker.choose", "Elige ejercicios")
              : t("plans.picker.add", "Añadir {{count}}", { count: selected.length })}
          </button>
        </div>
      </div>
    </div>
  );
}

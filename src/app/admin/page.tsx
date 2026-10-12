"use client";

// Panel de administración (/admin). Ruta top-level (fuera del grupo (app)) para
// no arrastrar la navegación de fitness. Doble protección:
//   1. Cliente: lee profiles.is_admin del usuario logueado y oculta el panel si
//      no es admin (UX rápida, no es la barrera de seguridad real).
//   2. Servidor: la Edge Function `admin-api` revalida is_admin en cada acción.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Crown,
  Dumbbell,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { LoadError } from "@/components/ui/load-error";
import { refreshProfileFlags, useProfileFlags } from "@/lib/profile-flags";
import {
  adminApi,
  type AdminUser,
  type AdminUserDetail,
  type Tier,
} from "@/lib/admin/admin-api";

const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  pro_monthly: "Pro Mensual",
  pro_annual: "Pro Anual",
};

const TIER_OPTIONS: Tier[] = ["free", "pro_monthly", "pro_annual"];

function isPro(tier: Tier) {
  return tier === "pro_monthly" || tier === "pro_annual";
}

// "hoy", "ayer", "hace 5 d"… para leer la actividad de un vistazo.
function fmtAgo(iso: string | null) {
  if (!iso) return "nunca";
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000);
  if (Number.isNaN(days)) return "—";
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days} d`;
}

// Usuarios que se pintan de una vez; el resto, con "Mostrar más".
const PAGE_SIZE = 50;

// Contraseña legible para dictarla o copiarla (sin 0/O ni 1/l).
function randomPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // null = comprobando, false = no admin, true = admin. Si el perfil no se pudo
  // leer (sin red) NO es "denegado": se ofrece reintentar.
  const { flags, failed: flagsFailed } = useProfileFlags();
  const isAdmin: boolean | null = flags ? flags.isAdmin : null;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "active" | "inactive">("recent");
  // Detalle desplegado (plan, cuestionario y sesiones) de un usuario.
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, AdminUserDetail>>({});
  const [detailError, setDetailError] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [bulkBusy, setBulkBusy] = useState(false);
  // Alta de cuentas desde el panel.
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; password: string; tier: Tier }>({
    name: "",
    email: "",
    password: "",
    tier: "free",
  });

  // Redirige a login si no hay sesión.
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await adminApi.listUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin, loadUsers]);

  const handleSetTier = async (u: AdminUser, tier: Tier) => {
    if (tier === u.tier) return;
    setBusyId(u.id);
    setError(null);
    try {
      await adminApi.setTier(u.id, tier);
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, tier } : x))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cambiar el plan");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const email = form.email.trim().toLowerCase();
      await adminApi.createUser({ ...form, email, name: form.name.trim() });
      setCreated({ email, password: form.password });
      setCopied(false);
      setForm({ name: "", email: "", password: "", tier: form.tier });
      void loadUsers();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setCreating(false);
    }
  };

  // Pasa a Pro a todos los usuarios Free de la lista que se está viendo (con el
  // buscador se acota a quién).
  const handleBulkPro = async (ids: string[]) => {
    if (ids.length === 0 || bulkBusy) return;
    if (
      !window.confirm(
        `¿Dar Pro Mensual a ${ids.length} ${ids.length === 1 ? "usuario" : "usuarios"} que ahora están en Free?`
      )
    )
      return;
    setBulkBusy(true);
    setError(null);
    try {
      await adminApi.setTierBulk(ids, "pro_monthly");
      const changed = new Set(ids);
      setUsers((prev) =>
        prev.map((x) => (changed.has(x.id) ? { ...x, tier: "pro_monthly" } : x))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cambiar el plan");
    } finally {
      setBulkBusy(false);
    }
  };

  // Abre o cierra el detalle de un usuario; lo pide al servidor la primera vez.
  const toggleDetail = async (u: AdminUser) => {
    if (openId === u.id) {
      setOpenId(null);
      return;
    }
    setOpenId(u.id);
    if (details[u.id]) return;
    setDetailError(null);
    try {
      const d = await adminApi.userDetail(u.id);
      setDetails((prev) => ({ ...prev, [u.id]: d }));
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "No se pudo cargar el detalle");
    }
  };

  const handleDelete = async (u: AdminUser) => {
    if (
      !window.confirm(
        `¿Eliminar a ${u.email}? Se borrarán su cuenta, planes e historial. Esta acción no se puede deshacer.`
      )
    )
      return;
    setBusyId(u.id);
    setError(null);
    try {
      await adminApi.deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar el usuario");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? users.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            (u.name ?? "").toLowerCase().includes(q)
        )
      : [...users];
    const time = (iso: string | null) => (iso ? Date.parse(iso) : 0);
    if (sort === "active") {
      list.sort((a, b) => time(b.last_workout) - time(a.last_workout));
    } else if (sort === "inactive") {
      // Primero quien nunca entrenó, luego quien lleva más tiempo sin hacerlo.
      list.sort((a, b) => time(a.last_workout) - time(b.last_workout));
    }
    return list;
  }, [users, query, sort]);

  const freeShown = useMemo(
    () => filtered.filter((u) => u.tier === "free").map((u) => u.id),
    [filtered]
  );
  // Al cambiar la búsqueda o el orden se vuelve a la primera tanda.
  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, sort]);

  const stats = useMemo(() => {
    const total = users.length;
    const pro = users.filter((u) => isPro(u.tier)).length;
    const plans = users.reduce((s, u) => s + u.plan_count, 0);
    const weekAgo = Date.now() - 7 * 86400000;
    const active = users.filter(
      (u) => u.last_workout && Date.parse(u.last_workout) > weekAgo
    ).length;
    return { total, pro, active, plans };
  }, [users]);

  // ── Estados de carga / acceso ──────────────────────────────────────────────
  if (!authLoading && user && isAdmin === null && flagsFailed) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg px-6">
        <LoadError onRetry={() => void refreshProfileFlags(true)} />
      </div>
    );
  }

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg">
        <Loader2 className="animate-spin text-primary" size={28} />
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen grid place-items-center bg-bg px-6 text-center">
        <div>
          <ShieldCheck className="mx-auto text-faint mb-3" size={34} />
          <div className="cf-h2 text-[18px]">Acceso denegado</div>
          <div className="cf-muted text-[13px] mt-1">
            Esta cuenta no tiene permisos de administrador.
          </div>
        </div>
      </div>
    );
  }

  // ── Panel ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg safe-top safe-bottom">
      <div className="cf-mesh fixed inset-0" aria-hidden />
      <div className="relative z-10 container mx-auto max-w-5xl px-4 lg:px-6 py-6 lg:py-8">
        {/* header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* El panel vive fuera del layout de la app: sin esto no hay vuelta en móvil */}
            <button
              onClick={() => router.push("/settings")}
              className="cf-icon-tile bg-surface-2 border border-border"
              style={{ width: 40, height: 40 }}
              aria-label="Volver a la app"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="cf-eyebrow flex items-center gap-1.5">
                <ShieldCheck size={13} /> Administración
              </div>
              <h1 className="cf-h1 text-[26px] mt-1.5">Usuarios</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowCreate((v) => !v);
              setCreateError(null);
              setCreated(null);
            }}
            className="cf-icon-tile bg-surface-2 border border-border"
            style={{ width: 40, height: 40 }}
            aria-label="Nueva cuenta"
            aria-expanded={showCreate}
          >
            <UserPlus size={18} />
          </button>
          <button
            onClick={loadUsers}
            disabled={loading}
            className="cf-icon-tile bg-surface-2 border border-border"
            style={{ width: 40, height: 40 }}
            aria-label="Recargar"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
          </div>
        </div>

        {/* alta de una cuenta */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="cf-card flex flex-col gap-2.5 mb-5"
            style={{ padding: 14, borderRadius: 18 }}
          >
            <div className="cf-h2 text-[15px]">Nueva cuenta</div>
            <div className="cf-muted text-[12px] -mt-1">
              Queda lista para entrar, sin correo de confirmación. Entrega tú el correo y la
              contraseña.
            </div>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre"
              autoComplete="off"
              className="bg-surface-2 border border-border rounded-xl text-[14px] px-3 py-2.5 outline-none"
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Correo"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="off"
              required
              className="bg-surface-2 border border-border rounded-xl text-[14px] px-3 py-2.5 outline-none"
            />
            <div className="flex gap-2">
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Contraseña (mín. 8)"
                autoCapitalize="none"
                autoComplete="off"
                minLength={8}
                required
                className="flex-1 min-w-0 bg-surface-2 border border-border rounded-xl text-[14px] px-3 py-2.5 outline-none"
              />
              <button
                type="button"
                onClick={() => setForm({ ...form, password: randomPassword() })}
                className="cf-btn cf-btn-ghost shrink-0"
                style={{ padding: "0 14px" }}
              >
                Generar
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value as Tier })}
                aria-label="Plan de la cuenta"
                className="bg-surface-2 border border-border rounded-xl text-[13.5px] font-semibold px-3 py-2.5 outline-none"
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}
                  </option>
                ))}
              </select>
              <button type="submit" disabled={creating} className="cf-btn cf-btn-primary flex-1">
                {creating ? <Loader2 size={16} className="animate-spin" /> : "Crear cuenta"}
              </button>
            </div>
            {createError && (
              <div className="text-[13px] font-semibold" style={{ color: "var(--danger, #ef4444)" }}>
                {createError}
              </div>
            )}
            {created && (
              <div className="cf-card-solid text-[13px]" style={{ padding: "10px 12px", borderRadius: 12 }}>
                <div className="font-semibold mb-1">Cuenta creada. La contraseña no se vuelve a mostrar.</div>
                <div className="cf-txt2 break-all">{created.email}</div>
                <div className="cf-txt2 break-all font-mono">{created.password}</div>
                <button
                  type="button"
                  className="text-primary font-semibold mt-1.5"
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(`${created.email}\n${created.password}`)
                      .then(() => setCopied(true))
                      .catch(() => undefined);
                  }}
                >
                  {copied ? "Copiado" : "Copiar correo y contraseña"}
                </button>
              </div>
            )}
          </form>
        )}

        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Users} label="Usuarios" value={stats.total} />
          <StatCard icon={Crown} label="Pro" value={stats.pro} highlight />
          <StatCard icon={Dumbbell} label="Activos 7 días" value={stats.active} />
          <StatCard icon={Users} label="Planes" value={stats.plans} />
        </div>

        {/* search */}
        <div className="cf-card flex items-center gap-2.5 mb-4" style={{ padding: "10px 14px", borderRadius: 16 }}>
          <Search size={17} className="text-faint shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por email o nombre…"
            className="flex-1 min-w-0 bg-transparent outline-none text-[14px]"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label="Ordenar"
            className="bg-surface-2 border border-border rounded-lg text-[12.5px] font-semibold px-2 py-1.5 outline-none shrink-0"
          >
            <option value="recent">Alta reciente</option>
            <option value="active">Entrenó hace poco</option>
            <option value="inactive">Sin actividad</option>
          </select>
        </div>

        {error && (
          <div
            className="mb-4 text-[13px] font-semibold"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "color-mix(in srgb, var(--danger, #ef4444) 12%, transparent)",
              color: "var(--danger, #ef4444)",
            }}
          >
            {error}
          </div>
        )}

        {/* Pro en bloque para los Free de la lista visible */}
        {!loading && freeShown.length > 0 && (
          <div className="flex items-center justify-between gap-3 mb-3 text-[12.5px]">
            <span className="cf-muted">
              {filtered.length} {filtered.length === 1 ? "usuario" : "usuarios"} · {freeShown.length} en Free
            </span>
            <button
              onClick={() => handleBulkPro(freeShown)}
              disabled={bulkBusy}
              className="cf-chip cf-chip-brand shrink-0"
              style={{ padding: "8px 12px" }}
            >
              {bulkBusy ? <Loader2 size={13} className="animate-spin" /> : <Crown size={13} />}
              Dar Pro a {freeShown.length === 1 ? "este" : `estos ${freeShown.length}`}
            </button>
          </div>
        )}

        {/* list */}
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="animate-spin text-primary" size={26} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="cf-muted text-center py-16 text-[14px]">
            No hay usuarios que mostrar.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.slice(0, visible).map((u) => (
              <div key={u.id} className="cf-card" style={{ padding: 14, borderRadius: 18 }}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* avatar + identidad (tocar abre el detalle) */}
                <button
                  type="button"
                  onClick={() => toggleDetail(u)}
                  aria-expanded={openId === u.id}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div
                    className="rounded-full grid place-items-center text-white font-display font-bold text-[15px] shrink-0"
                    style={{ width: 42, height: 42, background: "var(--grad-brand-soft)" }}
                  >
                    {(u.email.charAt(0) || "?").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[14px] truncate flex items-center gap-1.5">
                      <span className="truncate">{u.name?.trim() || u.email}</span>
                      {u.is_admin && (
                        <ShieldCheck size={13} className="text-primary shrink-0" />
                      )}
                    </div>
                    {u.name?.trim() && (
                      <div className="cf-muted text-[11.5px] truncate">{u.email}</div>
                    )}
                    <div className="cf-muted text-[11.5px] mt-0.5">
                      Alta {fmtDate(u.created_at)} · acceso {fmtAgo(u.last_sign_in)}
                    </div>
                    {/* actividad: lo que hace falta para seguir el piloto */}
                    <div
                      className="text-[11.5px] font-semibold mt-0.5"
                      style={{ color: u.last_workout ? "var(--txt-2)" : "var(--muted)" }}
                    >
                      {u.last_workout
                        ? `Entrenó ${fmtAgo(u.last_workout)} · ${u.session_count} ${
                            u.session_count === 1 ? "sesión" : "sesiones"
                          } · ${u.set_count} series`
                        : "Aún no ha entrenado"}
                      {" · "}
                      {u.plan_count} {u.plan_count === 1 ? "plan" : "planes"}
                      {u.generation_count > 0 && ` (${u.generation_count} gen.)`}
                    </div>
                  </div>
                  <ChevronDown
                    size={17}
                    className="text-faint shrink-0 ml-auto"
                    style={{ transform: openId === u.id ? "rotate(180deg)" : "none" }}
                  />
                </button>

                {/* acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={u.tier}
                    disabled={busyId === u.id}
                    onChange={(e) => handleSetTier(u, e.target.value as Tier)}
                    className="bg-surface-2 border border-border rounded-lg text-[12.5px] font-semibold px-2 py-1.5 outline-none"
                  >
                    {TIER_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {TIER_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleDelete(u)}
                    disabled={busyId === u.id || u.id === user?.id}
                    className="cf-icon-tile bg-surface-2 border border-border"
                    style={{
                      width: 34,
                      height: 34,
                      color: "var(--danger, #ef4444)",
                      opacity: u.id === user?.id ? 0.4 : 1,
                    }}
                    aria-label="Eliminar usuario"
                    title={
                      u.id === user?.id
                        ? "No puedes eliminar tu propia cuenta"
                        : "Eliminar usuario"
                    }
                  >
                    {busyId === u.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
              {openId === u.id && (
                <UserDetail detail={details[u.id]} error={detailError} />
              )}
              </div>
            ))}
            {filtered.length > visible && (
              <button
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="cf-btn cf-btn-ghost cf-btn-block"
              >
                Mostrar más ({filtered.length - visible})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Detalle de un usuario: cuestionario, planes y últimas sesiones.
function UserDetail({
  detail,
  error,
}: {
  detail?: AdminUserDetail;
  error: string | null;
}) {
  if (!detail) {
    return (
      <div className="cf-muted text-[12.5px] mt-3 pt-3 border-t border-border">
        {error ?? "Cargando detalle…"}
      </div>
    );
  }
  const { intake, plans, sessions } = detail;
  const equipment = Array.isArray(intake?.equipment)
    ? intake?.equipment.join(", ")
    : intake?.equipment;
  const dayOfPlan = (planId: string | null) =>
    plans.findIndex((p) => p.id === planId);
  return (
    <div className="mt-3 pt-3 border-t border-border flex flex-col gap-3 text-[12.5px]">
      <div>
        <div className="cf-eyebrow text-[10px] mb-1">Cuestionario</div>
        {intake ? (
          <div className="cf-txt2 leading-relaxed">
            {[
              intake.objective,
              intake.level,
              intake.age ? `${intake.age} años` : null,
              intake.weight_kg ? `${intake.weight_kg} kg` : null,
              intake.height_cm ? `${intake.height_cm} cm` : null,
              equipment || null,
            ]
              .filter(Boolean)
              .join(" · ")}
            {intake.notes ? <div className="cf-muted mt-0.5">Notas: {intake.notes}</div> : null}
          </div>
        ) : (
          <div className="cf-muted">Sin cuestionario (aún no ha generado un plan).</div>
        )}
      </div>

      <div>
        <div className="cf-eyebrow text-[10px] mb-1">Planes ({plans.length})</div>
        {plans.length === 0 ? (
          <div className="cf-muted">Sin planes.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {plans.map((p, i) => (
              <details key={p.id} className="cf-card-solid" style={{ padding: "8px 10px", borderRadius: 12 }}>
                <summary className="font-semibold cursor-pointer">
                  Plan {plans.length - i} · {fmtDate(p.created_at)}
                  {p.weeks ? ` · ${p.weeks} sem.` : ""} · {p.days.length} días
                </summary>
                <div className="flex flex-col gap-1.5 mt-2">
                  {p.days.map((d, di) => (
                    <div key={di}>
                      <span className="font-semibold">Día {d.day}</span>
                      {d.focus ? ` · ${d.focus}` : ""}
                      <div className="cf-muted">{d.exercises.join(", ")}</div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="cf-eyebrow text-[10px] mb-1">Últimas sesiones ({sessions.length})</div>
        {sessions.length === 0 ? (
          <div className="cf-muted">Aún no ha registrado ninguna serie.</div>
        ) : (
          <div className="flex flex-col gap-1">
            {sessions.map((s) => {
              const idx = dayOfPlan(s.plan_id);
              return (
                <div key={s.session_id} className="flex justify-between gap-3">
                  <span className="cf-txt2">
                    {fmtDate(s.at)} · Día {s.day}
                    {idx >= 0 ? ` (plan ${plans.length - idx})` : ""}
                  </span>
                  <span className="cf-muted shrink-0">
                    {s.sets} series · {s.volume} kg{s.avg_rpe ? ` · RPE ${s.avg_rpe}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className="cf-card flex items-center gap-3"
      style={{
        padding: 14,
        borderRadius: 16,
        ...(highlight ? { border: "1.5px solid var(--primary)" } : {}),
      }}
    >
      <div
        className="cf-icon-tile shrink-0"
        style={{
          width: 36,
          height: 36,
          ...(highlight
            ? { background: "var(--grad-brand)", color: "#fff" }
            : { background: "var(--surface-2)", color: "var(--txt-2)" }),
        }}
      >
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <div className="cf-num font-bold text-[20px] leading-none">{value}</div>
        <div className="cf-muted text-[11.5px] mt-1">{label}</div>
      </div>
    </div>
  );
}

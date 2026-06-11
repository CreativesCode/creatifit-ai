"use client";

// Panel de administración (/admin). Ruta top-level (fuera del grupo (app)) para
// no arrastrar la navegación de fitness. Doble protección:
//   1. Cliente: lee profiles.is_admin del usuario logueado y oculta el panel si
//      no es admin (UX rápida, no es la barrera de seguridad real).
//   2. Servidor: la Edge Function `admin-api` revalida is_admin en cada acción.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Dumbbell,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { supabase } from "@/lib/supabase-config";
import { adminApi, type AdminUser, type Tier } from "@/lib/admin/admin-api";

const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  pro_monthly: "Pro Mensual",
  pro_annual: "Pro Anual",
};

const TIER_OPTIONS: Tier[] = ["free", "pro_monthly", "pro_annual"];

function isPro(tier: Tier) {
  return tier === "pro_monthly" || tier === "pro_annual";
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

  // null = comprobando, false = no admin, true = admin
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Redirige a login si no hay sesión.
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // Comprueba is_admin leyendo el propio perfil (RLS permite leer el propio).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!cancelled) setIsAdmin(Boolean(data?.is_admin));
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  const stats = useMemo(() => {
    const total = users.length;
    const pro = users.filter((u) => isPro(u.tier)).length;
    const plans = users.reduce((s, u) => s + u.plan_count, 0);
    return { total, pro, free: total - pro, plans };
  }, [users]);

  // ── Estados de carga / acceso ──────────────────────────────────────────────
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
    <div className="min-h-screen bg-bg">
      <div className="cf-mesh fixed inset-0" aria-hidden />
      <div className="relative z-10 container mx-auto max-w-5xl px-4 lg:px-6 py-6 lg:py-8">
        {/* header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="cf-eyebrow flex items-center gap-1.5">
              <ShieldCheck size={13} /> Administración
            </div>
            <h1 className="cf-h1 text-[26px] mt-1.5">Usuarios</h1>
          </div>
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

        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard icon={Users} label="Usuarios" value={stats.total} />
          <StatCard icon={Crown} label="Pro" value={stats.pro} highlight />
          <StatCard icon={Users} label="Free" value={stats.free} />
          <StatCard icon={Users} label="Planes" value={stats.plans} />
        </div>

        {/* search */}
        <div className="cf-card flex items-center gap-2.5 mb-4" style={{ padding: "10px 14px", borderRadius: 16 }}>
          <Search size={17} className="text-faint shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por email o nombre…"
            className="flex-1 bg-transparent outline-none text-[14px]"
          />
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
            {filtered.map((u) => (
              <div
                key={u.id}
                className="cf-card flex flex-col sm:flex-row sm:items-center gap-3"
                style={{ padding: 14, borderRadius: 18 }}
              >
                {/* avatar + identidad */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="rounded-full grid place-items-center text-white font-display font-bold text-[15px] shrink-0"
                    style={{ width: 42, height: 42, background: "var(--grad-brand-soft)" }}
                  >
                    {(u.email.charAt(0) || "?").toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-[14px] truncate flex items-center gap-1.5">
                      {u.email}
                      {u.is_admin && (
                        <ShieldCheck size={13} className="text-primary shrink-0" />
                      )}
                    </div>
                    <div className="cf-muted text-[11.5px] mt-0.5">
                      Registrado {fmtDate(u.created_at)}
                    </div>
                  </div>
                </div>

                {/* planes generados */}
                <span
                  className="text-[11.5px] font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
                  style={{
                    background: u.plan_count > 0 ? "var(--surface-2)" : "transparent",
                    border: "1px solid var(--border)",
                    color: u.plan_count > 0 ? "var(--txt)" : "var(--muted)",
                  }}
                  title="Planes generados"
                >
                  <Dumbbell size={12} />
                  {u.plan_count} {u.plan_count === 1 ? "plan" : "planes"}
                </span>

                {/* tier badge */}
                <span
                  className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1 self-start sm:self-auto"
                  style={
                    isPro(u.tier)
                      ? { background: "var(--grad-brand)", color: "#fff" }
                      : { background: "var(--surface-2)", color: "var(--muted)" }
                  }
                >
                  {isPro(u.tier) && <Crown size={11} />}
                  {TIER_LABEL[u.tier]}
                </span>

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
            ))}
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

"use client";
import * as React from "react";
import type { LucideIcon } from "lucide-react";

/* Tile de estadística para dashboards. Portado de screens1.jsx (StatTile). */

type Accent = "brand" | "cyan" | "mint" | "amber";

const ACCENT: Record<Accent, string> = {
  brand: "var(--primary)",
  cyan: "var(--cyan)",
  mint: "var(--mint)",
  amber: "var(--amber)",
};

export function StatTile({
  icon: Icon,
  value,
  unit,
  label,
  accent = "brand",
}: {
  icon: LucideIcon;
  value: React.ReactNode;
  unit?: string;
  label: string;
  accent?: Accent;
}) {
  return (
    <div className="cf-card flex-1" style={{ padding: "14px 13px", borderRadius: 18 }}>
      <div style={{ color: ACCENT[accent], marginBottom: 9 }}>
        <Icon size={19} strokeWidth={2.1} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span className="cf-num" style={{ fontSize: 22, color: "var(--txt)" }}>
          {value}
        </span>
        {unit && (
          <span className="cf-num" style={{ fontSize: 12, color: "var(--muted)" }}>
            {unit}
          </span>
        )}
      </div>
      <div className="cf-muted" style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

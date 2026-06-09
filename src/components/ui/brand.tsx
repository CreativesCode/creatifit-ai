"use client";
import * as React from "react";

/* ============================================================
   CreatiFit AI — Marca "Anillos de actividad"
   Portado de docs/design/logos.jsx → React/TSX.
   ============================================================ */

type GradProps = {
  id: string;
  a?: string;
  b?: string;
  c?: string;
  vertical?: boolean;
};

function Grad({
  id,
  a = "#7C5CFF",
  b = "#B14BF4",
  c = "#F0469C",
  vertical,
}: GradProps) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={vertical ? 0 : 1} y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="0.5" stopColor={b} />
      <stop offset="1" stopColor={c} />
    </linearGradient>
  );
}

/** El mark: anillos de actividad concéntricos + nodo. `mono` => color único. */
export function Mark({
  size = 36,
  mono,
  className,
}: {
  size?: number;
  mono?: string;
  className?: string;
}) {
  const uid = React.useId().replace(/:/g, "");
  const g1 = `${uid}-g1`;
  const g2 = `${uid}-g2`;
  const C1 = 2 * Math.PI * 38;
  const C2 = 2 * Math.PI * 23;
  const outer = mono || `url(#${g1})`;
  const inner = mono || `url(#${g2})`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    >
      {!mono && (
        <defs>
          <Grad id={g1} />
          <Grad id={g2} a="#6A5BFF" b="#3FB6F0" c="#25E0E5" />
        </defs>
      )}
      <circle
        cx="50"
        cy="50"
        r="38"
        stroke={outer}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${0.72 * C1} ${C1}`}
        transform="rotate(48 50 50)"
      />
      <circle
        cx="50"
        cy="50"
        r="23"
        stroke={inner}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${0.6 * C2} ${C2}`}
        transform="rotate(-130 50 50)"
        opacity={mono ? 0.85 : 1}
      />
      <circle cx="50" cy="50" r="6.5" fill={outer} />
    </svg>
  );
}

/** Lockup horizontal: mark + "creatifit". */
export function Wordmark({
  size = 30,
  mono,
  className,
}: {
  size?: number;
  mono?: string;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", gap: size * 0.32 }}
    >
      <Mark size={size} mono={mono} />
      <span
        className="font-display"
        style={{
          fontWeight: 700,
          fontSize: size * 0.5,
          letterSpacing: "-0.03em",
          color: "var(--txt)",
        }}
      >
        creati<span className="cf-grad-txt">fit</span>
      </span>
    </div>
  );
}

type IconVariant = "dark" | "gradient" | "light";

/** App icon — mark sobre un tile terminado. */
export function AppIcon({
  size = 96,
  variant = "dark",
  radius,
}: {
  size?: number;
  variant?: IconVariant;
  radius?: number;
}) {
  const r = radius != null ? radius : size * 0.26;
  const styles: Record<
    IconVariant,
    { background: string; boxShadow: string; mark?: string }
  > = {
    dark: {
      background:
        "radial-gradient(120% 120% at 30% 20%, #1E1730, #0C0916 70%)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      mark: undefined,
    },
    gradient: {
      background:
        "linear-gradient(135deg, #7C5CFF 0%, #B14BF4 50%, #F0469C 100%)",
      boxShadow: "0 12px 30px -10px rgba(124,92,255,0.6)",
      mark: "#fff",
    },
    light: {
      background: "#fff",
      boxShadow: "0 8px 22px -10px rgba(80,50,160,0.4)",
      mark: undefined,
    },
  };
  const s = styles[variant];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: r,
        background: s.background,
        boxShadow: s.boxShadow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Mark size={size * 0.66} mono={s.mark} />
    </div>
  );
}

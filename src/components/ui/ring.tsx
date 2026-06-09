"use client";
import * as React from "react";

/* Anillo de progreso SVG con gradiente. value 0..100.
   Portado de docs/design/kit.jsx (Ring). */

type Gradient = "brand" | "cyan" | "mint" | "amber";

const STOPS: Record<Gradient, [string, string]> = {
  brand: ["#7C5CFF", "#F0469C"],
  cyan: ["#6A5BFF", "#25E0E5"],
  mint: ["#2BC7D6", "#36E5A4"],
  amber: ["#FF7A45", "#FFB23E"],
};

export function Ring({
  value = 70,
  size = 120,
  stroke = 11,
  gradient = "brand",
  track,
  children,
}: {
  value?: number;
  size?: number;
  stroke?: number;
  gradient?: Gradient;
  track?: string;
  children?: React.ReactNode;
}) {
  const uid = React.useId().replace(/:/g, "");
  const gid = `rg-${gradient}-${uid}`;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  const [from, to] = STOPS[gradient];
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track || "var(--ring-track)"}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

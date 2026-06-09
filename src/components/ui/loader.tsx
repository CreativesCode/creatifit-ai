"use client";
import * as React from "react";

/* Loader de marca — anillos de actividad animados.
   Portado de docs/design/loader.jsx (CFLoader). */

const R1 = 38;
const R2 = 23;
const C1 = 2 * Math.PI * R1;
const C2 = 2 * Math.PI * R2;

export function CFLoader({
  size = 80,
  variant = "gyro",
  mono,
}: {
  size?: number;
  variant?: "gyro" | "draw";
  mono?: string;
}) {
  const uid = React.useId().replace(/:/g, "");
  const g1 = `${uid}-a`;
  const g2 = `${uid}-b`;
  const outer = mono || `url(#${g1})`;
  const inner = mono || `url(#${g2})`;
  const oCls = variant === "draw" ? "cf-load2-outer" : "cf-load-outer";
  const iCls = variant === "draw" ? "cf-load2-inner" : "cf-load-inner";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      style={{ display: "block" }}
    >
      {!mono && (
        <defs>
          <linearGradient id={g1} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7C5CFF" />
            <stop offset="0.5" stopColor="#B14BF4" />
            <stop offset="1" stopColor="#F0469C" />
          </linearGradient>
          <linearGradient id={g2} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6A5BFF" />
            <stop offset="0.5" stopColor="#3FB6F0" />
            <stop offset="1" stopColor="#25E0E5" />
          </linearGradient>
        </defs>
      )}
      <circle
        className={oCls}
        style={{ ["--c" as string]: C1 } as React.CSSProperties}
        cx="50"
        cy="50"
        r={R1}
        stroke={outer}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${0.7 * C1} ${C1}`}
      />
      <circle
        className={iCls}
        style={{ ["--c" as string]: C2 } as React.CSSProperties}
        cx="50"
        cy="50"
        r={R2}
        stroke={inner}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${0.58 * C2} ${C2}`}
        opacity={mono ? 0.85 : 1}
      />
      <circle className="cf-load-node" cx="50" cy="50" r="6.5" fill={outer} />
    </svg>
  );
}

/* Loader centrado para estados de carga / transiciones de ruta.
   Solo el loader — sin texto, sin card. `full` ocupa toda la pantalla. */
export function PageLoader({ full = false }: { full?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center ${
        full ? "min-h-screen" : "min-h-[60vh]"
      }`}
    >
      <CFLoader size={84} />
    </div>
  );
}

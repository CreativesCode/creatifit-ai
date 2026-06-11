"use client";

// Gráfica de tendencia minimalista en SVG (sin dependencias). Soporta línea con
// área o barras. Las etiquetas van en HTML (fuera del SVG) para no deformarse con
// el escalado horizontal; los trazos usan `vector-effect` para no engrosarse.

export interface ChartPoint {
  label: string; // etiqueta del eje X (se muestran solo la primera y la última)
  value: number;
}

interface TrendChartProps {
  title: string;
  points: ChartPoint[];
  variant?: "line" | "bar";
  color?: string; // CSS var, p.ej. "var(--primary)"
  unit?: string;
  formatValue?: (n: number) => string;
  emptyLabel?: string;
}

const VW = 100; // ancho del viewBox (se escala a 100% del contenedor)
const VH = 100;
const PAD_TOP = 8;
const PAD_BOTTOM = 6;

export function TrendChart({
  title,
  points,
  variant = "line",
  color = "var(--primary)",
  unit = "",
  formatValue,
  emptyLabel = "—",
}: TrendChartProps) {
  const fmt = formatValue ?? ((n: number) => `${Math.round(n)}`);

  if (points.length === 0) {
    return (
      <div className="cf-card" style={{ padding: 16, borderRadius: 20 }}>
        <div className="cf-muted text-[12px] font-semibold mb-1">{title}</div>
        <div className="cf-muted text-[13px] py-6 text-center">{emptyLabel}</div>
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const last = values[values.length - 1];
  const first = values[0];
  const delta = +(last - first).toFixed(1);

  // Escala un valor a coordenada Y del viewBox (invertida).
  const yOf = (v: number) =>
    PAD_TOP + (1 - (v - min) / span) * (VH - PAD_TOP - PAD_BOTTOM);
  const xOf = (i: number) =>
    points.length === 1 ? VW / 2 : (i / (points.length - 1)) * VW;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(2)},${yOf(p.value).toFixed(2)}`)
    .join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L${VW},${VH - PAD_BOTTOM} L0,${VH - PAD_BOTTOM} Z`
      : "";

  const gradId = `tg-${title.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="cf-card" style={{ padding: 16, borderRadius: 20 }}>
      <div className="flex items-baseline justify-between mb-2">
        <div className="cf-muted text-[12px] font-semibold">{title}</div>
        <div className="flex items-baseline gap-1.5">
          <span className="cf-num text-[18px]">{fmt(last)}</span>
          {unit && <span className="cf-muted text-[11px] font-semibold">{unit}</span>}
          {delta !== 0 && (
            <span
              className="text-[11px] font-bold"
              style={{ color: delta > 0 ? "var(--mint)" : "var(--amber)" }}
            >
              {delta > 0 ? "+" : ""}
              {fmt(delta)}
            </span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: 96, display: "block" }}
        aria-hidden
      >
        {variant === "line" ? (
          <>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
            <path
              d={linePath}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : (
          points.map((p, i) => {
            const bw = (VW / points.length) * 0.6;
            const x = xOf(i) - bw / 2;
            const y = yOf(p.value);
            const isLast = i === points.length - 1;
            return (
              <rect
                key={i}
                x={Math.max(0, x).toFixed(2)}
                y={y.toFixed(2)}
                width={bw.toFixed(2)}
                height={(VH - PAD_BOTTOM - y).toFixed(2)}
                rx={1}
                fill={color}
                opacity={isLast ? 1 : 0.4}
              />
            );
          })
        )}
      </svg>

      <div className="flex justify-between cf-muted text-[10.5px] font-semibold mt-1.5">
        <span>{points[0].label}</span>
        {points.length > 1 && <span>{points[points.length - 1].label}</span>}
      </div>
    </div>
  );
}

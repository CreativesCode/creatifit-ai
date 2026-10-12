interface FlagProps {
  className?: string;
  size?: number;
}

// Bandera simplificada (tres franjas). La versión con el escudo completo eran
// 2.500 líneas de SVG (~100 KB) para un icono de 20 px.
export function SpanishFlag({ className = "", size = 20 }: FlagProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 480"
      width={size}
      height={(size * 3) / 4}
      className={className}
      aria-hidden
    >
      <path fill="#AA151B" d="M0 0h640v480H0z" />
      <path fill="#F1BF00" d="M0 120h640v240H0z" />
    </svg>
  );
}

export function USFlag({ className = "", size = 20 }: FlagProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      id="flag-icons-us"
      viewBox="0 0 640 480"
      className={className}
      width={size}
      height={size * 0.75}
    >
      <path fill="#bd3d44" d="M0 0h640v480H0" />
      <path
        stroke="#fff"
        strokeWidth="37"
        d="M0 55.3h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640"
      />
      <path fill="#192f5d" d="M0 0h364.8v258.5H0" />
      <marker id="us-a" markerHeight="30" markerWidth="30">
        <path fill="#fff" d="m14 0 9 27L0 10h28L5 27z" />
      </marker>
      <path
        fill="none"
        markerMid="url(#us-a)"
        d="m0 0 16 11h61 61 61 61 60L47 37h61 61 60 61L16 63h61 61 61 61 60L47 89h61 61 60 61L16 115h61 61 61 61 60L47 141h61 61 60 61L16 166h61 61 61 61 60L47 192h61 61 60 61L16 218h61 61 61 61 60z"
      />
    </svg>
  );
}

export function FlagIcon({
  country,
  className = "",
  size = 20,
}: {
  country: "es" | "en";
  className?: string;
  size?: number;
}) {
  switch (country) {
    case "es":
      return <SpanishFlag className={className} size={size} />;
    case "en":
      return <USFlag className={className} size={size} />;
    default:
      return <USFlag className={className} size={size} />;
  }
}

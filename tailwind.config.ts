import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-solid": "var(--surface-solid)",
        elevated: "var(--elevated)",
        txt: "var(--txt)",
        "txt-2": "var(--txt-2)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        primary: "var(--primary)",
        accent: "var(--accent)",
        secondary: "var(--secondary)",
        cyan: "var(--cyan)",
        mint: "var(--mint)",
        amber: "var(--amber)",
        coral: "var(--coral)",
        info: "var(--info)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        border: "var(--border)",
        "border-2": "var(--border-2)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "grad-brand": "var(--grad-brand)",
        "grad-brand-soft": "var(--grad-brand-soft)",
        "grad-cyan": "var(--grad-cyan)",
        "grad-mint": "var(--grad-mint)",
        "grad-amber": "var(--grad-amber)",
      },
      boxShadow: {
        soft: "0 6px 24px rgba(0,0,0,.18)",
        glow: "0 0 0 4px color-mix(in oklab, var(--accent), transparent 70%)",
        card: "var(--shadow-card)",
        "glow-brand": "var(--glow-brand)",
        "glow-cyan": "var(--glow-cyan)",
        "glow-mint": "var(--glow-mint)",
      },
    },
  },
  plugins: [],
} satisfies Config;

# CreatiFit AI — INSTRUCTIONS.md

> **Purpose**: Source-of-truth brief for Cursor/AI and devs to build the **Web SPA (Next.js)** + **Mobile (Capacitor)** MVP that generates **AI‑driven training plans** and tracks workouts.

---

## 0) TL;DR for Cursor

- **Stack**: Next.js (App Router, TS), Tailwind, shadcn/ui, TanStack Query, Prisma, **Supabase (Auth+DB)** _or_ Neon + NextAuth, OpenAI **Structured Outputs**, Capacitor (iOS/Android), OneSignal (push).
- **SPA‑first (CSR)**: Treat the app as a **Single‑Page Application** for seamless Capacitor embedding. **No SSR/RSC in app surfaces**; client navigation, server logic only in route handlers.
- **i18n & Theme**: **English/Spanish** via `react-i18next` (CSR), **Light/Dark** via `next-themes` + Tailwind `dark` class. Persist user prefs (localStorage) and set `<html lang>`.
- **Key routes**: `/api/plan/generate`, `/api/logs`, `/api/plan/[id]`.
- **Models**: `profiles`, `intake`, `plans`, `plan_days`, `exercises`, `day_exercises`, `workout_logs`.
- **Security**: Never expose API keys. Validate all I/O with Zod. Enforce RLS per `user_id`.

---

## 1) MVP Goal

- Onboarding questionnaire (goal, level, equipment, etc.).
- Generate a **6–8 week plan** via **Structured Outputs** (valid JSON only).
- Editable A/B/C/D calendar with exercise substitutions.
- Set/rep/RPE logging; **mobile offline** with sync.
- Push reminders and minimal stats.

### Acceptance criteria

- Intake → valid plan (schema OK) **< 10 s**.
- Session runner logs sets/reps and shows weekly progress.
- Regenerate/edit plan **without losing history**.

---

## 2) Architecture

- **Web**: Next.js 15+, **SPA (CSR‑only)** using App Router. **Avoid SSR/RSC** in app; keep server code strictly in API Route Handlers.
- **API**: Route Handlers under `/app/api/*` (server-only).
- **DB/Auth (default)**: Supabase (Postgres + Auth + Storage). Alternative: Neon + NextAuth.
- **Mobile**: Capacitor wrapper. **Online** mode (WebView → Vercel URL) + **Offline** (SQLite logs + sync).
- **State**: TanStack Query for client fetching; mutations go to route handlers.
- **UI**: Tailwind + shadcn/ui.

**SPA notes**

- Prefer client components (`"use client"`) for app pages.
- Avoid SSR data fetching; call **route handlers** from the client.
- For partial offline, ship a static **shell** and point API calls to the hosted domain.

```
apps
└─ web (next)
   ├─ app
   │  ├─ (marketing)/
   │  ├─ (app)/dashboard, plan, session
   │  └─ api/plan/generate | api/logs | api/plan/[id]
   ├─ components
   ├─ lib (db, auth, ai, validators)
   ├─ prisma/schema.prisma
   └─ capacitor/ (ios, android)
```

---

## 3) Quick Setup

### Requirements

- Node 20+, PNPM/NPM, Supabase (or Neon) account, Vercel CLI.

### Environment variables (examples)

**Common**

```env
OPENAI_API_KEY=
MODEL_NAME=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Supabase (recommended for MVP)**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-only
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres
```

**OneSignal (optional push)**

```env
NEXT_PUBLIC_ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=      # server-only
```

### Commands

```bash
pnpm i
pnpm prisma db push   # create tables
pnpm dev
```

### Deploy

- **Vercel Hobby**. Set env vars in Project Settings (`DATABASE_URL`, `OPENAI_API_KEY`, Supabase vars).

---

## 4) Database (Prisma)

> If using Supabase Auth, keep `profiles.id` = `auth.users.id` (UUID).

```prisma
// prisma/schema.prisma
model profiles {
  id        String   @id // auth UUID
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  intake    intake?
  plans     plans[]
}

model intake {
  id        String   @id @default(cuid())
  userId    String   @unique
  objective String
  level     String
  age       Int
  weightKg  Float
  heightCm  Int
  equipment Json
  stepsDay  Int?
  notes     String?
  createdAt DateTime @default(now())
  profiles  profiles @relation(fields: [userId], references: [id])
}

model plans {
  id         String    @id @default(cuid())
  userId     String
  weeks      Int
  version    Int       @default(1)
  sourceHash String
  payload    Json      // cached full plan
  createdAt  DateTime  @default(now())
  user       profiles  @relation(fields: [userId], references: [id])
  days       plan_days[]
}

model plan_days {
  id        String   @id @default(cuid())
  planId    String
  dayIndex  Int      // 0..n
  date      DateTime?
  focus     String
  plan      plans    @relation(fields: [planId], references: [id])
  items     day_exercises[]
}

model exercises {
  id    String @id @default(cuid())
  name  String @unique
  kind  String // push, pull, squat, hinge, core, cardio
  meta  Json?
}

model day_exercises {
  id           String     @id @default(cuid())
  dayId        String
  exerciseId   String
  targetSets   Int
  targetRepsLo Int
  targetRepsHi Int
  restSec      Int
  cues         Json?
  day          plan_days  @relation(fields: [dayId], references: [id])
  exercise     exercises  @relation(fields: [exerciseId], references: [id])
  logs         workout_logs[]
}

model workout_logs {
  id          String   @id @default(cuid())
  userId      String
  dayExId     String
  setIndex    Int
  reps        Int
  load        Float?   // bands: use level or 0
  rpe         Float?
  notes       String?
  ts          DateTime @default(now())
  dayExercise day_exercises @relation(fields: [dayExId], references: [id])
}
```

**Indexes**: `(plans.userId)`, `(plan_days.planId, dayIndex)`, `(workout_logs.userId, ts)`.

**RLS (Supabase)**: allow `select/insert/update` where `user_id = auth.uid()`.

---

## 5) API — Contracts

### `POST /api/plan/generate`

**Input**

```json
{
  "weeks": 8,
  "objective": "fat_loss",
  "level": "beginner",
  "age": 32,
  "weightKg": 78,
  "heightCm": 173,
  "equipment": {
    "bands": ["loop", "tube"],
    "ab_wheel": true,
    "pushup_handles": true
  },
  "constraints": { "jumps": true },
  "stepsDay": 5000
}
```

**Output (simplified)**

```json
{
  "weeks": 8,
  "days": [
    {
      "day": "A",
      "focus": "Upper+Core",
      "blocks": [
        {
          "name": "Push-ups",
          "sets": 4,
          "reps": [8, 12],
          "rest_sec": 60,
          "cues": ["incline if needed"]
        },
        { "name": "Band row", "sets": 4, "reps": [10, 12], "rest_sec": 60 }
      ]
    }
  ]
}
```

**Notes**

- Validate with Zod; **reject** if JSON is invalid.
- Persist `payload` and derive `plans/plan_days/day_exercises` in a single transaction.

### `GET /api/plan/[id]`

- Returns plan + days + exercises.

### `POST /api/logs`

**Input**

```json
{
  "dayExerciseId": "...",
  "setIndex": 1,
  "reps": 10,
  "load": 0,
  "rpe": 8,
  "ts": "2025-08-17T10:00:00Z"
}
```

- Respond `201` with created log. Optional idempotency by `(userId, dayExId, setIndex, ts)`.

---

## 6) OpenAI — Structured Outputs

- **Server-only** calls.
- System prompt: _"You are a coach. Return ONLY JSON following the schema."_
- Use **response_format: json_schema** (or equivalent) + validate with Zod.
- Cache by **intake hash** to avoid repeat cost.

_Pseudo route handler_

```ts
const schema = /* Zod → JSON Schema */
const completion = await ai.responses.create({
  model: process.env.MODEL_NAME!,
  input: [
    { role: "system", content: "You are a coach. JSON only." },
    { role: "user", content: JSON.stringify(intake) }
  ],
  response_format: { type: "json_schema", json_schema: {/*...*/} }
});
const plan = JSON.parse(completion.output_text);
PlanSchema.parse(plan);
```

---

## 7) UI/UX baseline

- **Onboarding Wizard**: 3–4 steps → plan preview → confirm.
- **Plan View**: weekly grid A/B/C/D; substitution menu by categories.
- **Session Runner**: exercise list → set-by-set → rest timer → save.
- **Progress**: weekly total reps, adherence %, time under tension.
- **Accessibility**: touch targets ≥44px, haptics on mobile.

---

## 8) Mobile with Capacitor

- `npx cap add ios android`
- **Online mode (recommended)**: `capacitor.config.ts` → `server: { url: "https://<your-app>.vercel.app", cleartext: true }`.
- **Offline**: @capacitor-community/sqlite for `workout_logs` + `sync_queue`.
- **Sync**: when online, upload pending logs; conflict policy: _last-write-wins_ by `(userId, dayId, exerciseId, setIndex)`.

_Minimal SQLite schema (mobile)_

```sql
CREATE TABLE workout_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  day_ex_id TEXT,
  set_index INTEGER,
  reps INTEGER,
  load REAL,
  rpe REAL,
  notes TEXT,
  ts TEXT
);
CREATE TABLE sync_queue (id TEXT PRIMARY KEY, payload TEXT, ts TEXT);
```

---

## 9) Security & Quality

- Keys on server; rotate credentials.
- Zod for input/output validation.
- Rate limit per IP/user on `/api/plan/generate`.
- RLS policies by `user_id`.
- Telemetry: latency + error logs for generation.
- Testing: unit (schemas), e2e (API), UI smoke.

---

## 10) Roadmap (4 sprints)

1. **MVP Web**: Auth + Intake → `/api/plan/generate` → Plan View → Logs.
2. **Mobile Wrapper**: Capacitor + push + deep links to sessions.
3. **Offline**: SQLite + sync + conflict resolution.
4. **UX Pro**: advanced substitutions, stats, export, badges.

---

## 11) Rules for Cursor

- Use **strict TypeScript** (`"strict": true`).
- App Router; server code in Route Handlers/Server Actions only.
- Prefer **TanStack Query** for client data fetching.
- Validate all inputs/outputs with **Zod**.
- Don’t change schema without `prisma migrate`.
- Keep **atomic** plan creation (transaction).
- **Never** expose `OPENAI_API_KEY` to the client.
- Small commits; linters and tests must pass.

---

## 12) Initial tasks (checklist)

- ***

## 13) Design System / Colors

**Brand**: _CreatiFit AI_. Default **dark theme** with a **purple‑forward, neon tech** vibe.

### Palette V — Violet Nebula (**Default**)

- **Background**: `#0B0A0F` (bg) / `#13111A` (surface)
- **Text**: `#ECEAF5` (primary) / `#AAA6BD` (muted)
- **Primary (Violet Core)**: `#8B5CF6`
- **Accent (Neon Magenta)**: `#F472D0`
- **Secondary (Indigo/Iris)**: `#6366F1`
- **Info**: `#22D3EE` · **Success**: `#22C55E` · **Warning**: `#F59E0B` · **Danger**: `#EF4444`
- **Borders/Lines**: `#1A1625`

**globals.css**

```css
:root {
  /* Light */
  --bg: #ffffff;
  --surface: #f6f3ff; /* lilac surface */
  --txt: #0f0a1f;
  --muted: #6e6a86;
  --primary: #7c3aed; /* violet-600 */
  --accent: #c026d3; /* fuchsia-600 */
  --secondary: #6366f1;
  --info: #06b6d4;
  --success: #16a34a;
  --warning: #f59e0b;
  --danger: #ef4444;
  --border: #e4e1f4;
}
.dark {
  /* Dark */
  --bg: #0b0a0f;
  --surface: #13111a;
  --txt: #eceaf5;
  --muted: #aaa6bd;
  --primary: #8b5cf6; /* violet-500 */
  --accent: #f472d0; /* neon magenta */
  --secondary: #6366f1; /* indigo-500 */
  --info: #22d3ee;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --border: #1a1625;
}
```

**tailwind.config.ts** (tokens remain the same)

```ts
import type { Config } from "tailwindcss";
export default {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        txt: "var(--txt)",
        muted: "var(--muted)",
        primary: "var(--primary)",
        accent: "var(--accent)",
        secondary: "var(--secondary)",
        info: "var(--info)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        border: "var(--border)",
      },
      boxShadow: {
        soft: "0 6px 24px rgba(0,0,0,.18)",
        glow: "0 0 0 4px color-mix(in oklab, var(--accent), transparent 70%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

**Gradients & usage**

- Headers/hero: `bg-[linear-gradient(135deg,var(--primary),var(--accent))]`
- Accent bands: `bg-[conic-gradient(at_20%_30%,var(--secondary),var(--primary),var(--accent))]`
- CTA (AI glow): `bg-primary text-white focus:shadow-glow`
- KPIs: `text-accent font-semibold`
- Cards: `bg-surface border border-border rounded-2xl shadow-soft`

### Palette V2 — Royal Grape + Cyan (**Alternative**)

- **Primary**: `#7C3AED` · **Accent**: `#00E5FF` · **Secondary**: `#A78BFA`

> To switch, override only `--primary`/`--accent`/`--secondary` values above; tokens and classes stay the same.

---

## 14) Tooling Compatibility & Version Pinning (Tailwind)

**Do \*\*\***not**\*** use Tailwind v4 pre‑releases or early v4.0.0**. Some teams report broken styles on **Vercel\** unless the new PostCSS plugin is configured correctly, and v4 config is no longer auto‑detected. Stick to \*\*Tailwind \*\*`(stable) *or\* fallback to` if needed.

**Required for v4.1.x**

- Install: `pnpm add -D tailwindcss@^4.1 @tailwindcss/postcss`.
- `postcss.config.mjs`:

```js
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
```

- In your global CSS _first line_: `@import "tailwindcss";`
- If you keep a JS config, v4 needs explicit load in CSS: `@config "./tailwind.config.js";`

**Pin recommendation**

```json
// package.json
"devDependencies": {
  "tailwindcss": "^4.1.12",
  "@tailwindcss/postcss": "^4.1.0"
}
```

**Notes**

- If Vercel build shows unstyled pages, ensure the v4 plugin is present and the CSS includes Tailwind output. If issues persist, \*\*downgrade to \*\*\`\` (stable) and retry.
- **Capacitor**: no Tailwind version lock, works as it compiles to static CSS. If using Capgo’s Tailwind plugin, match plugin major to Tailwind major (v4 plugin ↔ Tailwind 4.x; v1.0.8 ↔ Tailwind 3.x).

> Summary: **Use Tailwind 4.1.x** for CreatiFit AI. **Avoid v4.0.0‑alpha/canary and misconfigured v4.0.0**. If any CI/CD hiccups on Vercel, temporarily pin **3.4.x**, then upgrade back to 4.1.x once the pipeline is fixed.

## 15) Boilerplate files to add now (copy/paste)

> Minimal, working setup for **Tailwind 4.1.x on Vercel/Capacitor**. Add these files exactly.

### `/.env.example`

```env
# Core
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OpenAI
OPENAI_API_KEY=sk-...
MODEL_NAME=gpt-5.1-mini

# Database — choose ONE
## Supabase (recommended for MVP)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres

## Neon (alternative)
# DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require

# Auth (only if using NextAuth instead of Supabase Auth)
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=...

# Push (optional)
NEXT_PUBLIC_ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=
```

> In Vercel, replicate these as **Environment Variables**. Never commit real secrets.

### `/postcss.config.mjs`

```js
/** Tailwind v4.1.x required PostCSS plugin */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### `/app/globals.css` (minimal, v4‑style)

```css
@import "tailwindcss";
/* If you keep a Tailwind config file (TS/JS), load it explicitly: */
@config "./tailwind.config.ts";

/* Brand tokens — Violet Nebula (dark‑first) */
:root {
  /* Light */
  --bg: #ffffff;
  --surface: #f6f3ff; /* lilac surface */
  --txt: #0f0a1f;
  --muted: #6e6a86;
  --primary: #7c3aed; /* violet-600 */
  --accent: #c026d3; /* fuchsia-600 */
  --secondary: #6366f1;
  --info: #06b6d4;
  --success: #16a34a;
  --warning: #f59e0b;
  --danger: #ef4444;
  --border: #e4e1f4;
}
.dark {
  /* Dark */
  --bg: #0b0a0f;
  --surface: #13111a;
  --txt: #eceaf5;
  --muted: #aaa6bd;
  --primary: #8b5cf6; /* violet-500 */
  --accent: #f472d0; /* neon magenta */
  --secondary: #6366f1; /* indigo-500 */
  --info: #22d3ee;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
  --border: #1a1625;
}

html,
body {
  background: var(--bg);
  color: var(--txt);
}

/* Utility helpers */
.container {
  width: 100%;
  margin: 0 auto;
  padding-left: 1rem;
  padding-right: 1rem;
}
@media (min-width: 1280px) {
  .container {
    max-width: 72rem;
  }
}
```

> With Tailwind v4, there is no `@tailwind base/components/utilities`. The single `@import "tailwindcss";` loads all layers.

### Notes

- If the site renders unstyled on Vercel: confirm `@tailwindcss/postcss` is in `postcss.config.mjs` and that `globals.css` begins with `@import "tailwindcss";`. If you use a TS/JS Tailwind config, ensure the `@config` line path is correct.
- For Capacitor builds, this CSS compiles to static output — no special handling required.

## 16) i18n (EN/ES) & Theme (Light/Dark)

**Requirements**

- Languages: **English** (default) and **Spanish**.
- CSR-only i18n with `** + **`. No SSR needed.
- Theme: **dark** (default) and **light**, using `` (`attribute="class"`) + Tailwind `darkMode:"class"`.
- Persist preferences in `localStorage` and set `<html lang>`.

### Install

```bash
pnpm add i18next react-i18next next-themes
```

### Files & Structure

```
/locales
  /en/common.json
  /es/common.json
/app/providers/ThemeProvider.tsx
/app/providers/LanguageProvider.tsx
/lib/i18n.ts
```

**/locales/en/common.json**

```json
{
  "app": {
    "title": "CreatiFit AI",
    "generate": "Generate with AI",
    "plan": "Plan",
    "session": "Session",
    "progress": "Progress"
  }
}
```

**/locales/es/common.json**

```json
{
  "app": {
    "title": "CreatiFit AI",
    "generate": "Generar con IA",
    "plan": "Plan",
    "session": "Sesión",
    "progress": "Progreso"
  }
}
```

**/lib/i18n.ts**

```ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en/common.json";
import es from "@/locales/es/common.json";

const prefer = () => {
  if (typeof window === "undefined") return "en";
  const ls = localStorage.getItem("lang");
  if (ls === "en" || ls === "es") return ls;
  return navigator.language.startsWith("es") ? "es" : "en";
};

void i18n.use(initReactI18next).init({
  resources: { en: { common: en }, es: { common: es } },
  lng: prefer(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
```

**/app/providers/LanguageProvider.tsx**

```tsx
"use client";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
export default function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
```

**LanguageSwitcher.tsx (example)**

```tsx
"use client";
import { useTranslation } from "react-i18next";
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const set = (lng: "en" | "es") => {
    i18n.changeLanguage(lng);
    localStorage.setItem("lang", lng);
    document.documentElement.lang = lng;
  };
  return (
    <div className="inline-flex gap-2">
      <button
        onClick={() => set("en")}
        className="px-2 py-1 rounded bg-surface border border-border"
      >
        EN
      </button>
      <button
        onClick={() => set("es")}
        className="px-2 py-1 rounded bg-surface border border-border"
      >
        ES
      </button>
    </div>
  );
}
```

**/app/providers/ThemeProvider.tsx**

```tsx
"use client";
import { ThemeProvider as NextThemes } from "next-themes";
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </NextThemes>
  );
}
```

**ThemeToggle.tsx (example)**

```tsx
"use client";
import { useTheme } from "next-themes";
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      onClick={() => setTheme(next)}
      className="px-3 py-2 rounded bg-surface border border-border"
    >
      {next === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
```

**Wire into layout**

```tsx
// app/layout.tsx
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import LanguageProvider from "@/app/providers/LanguageProvider";
import "@/app/globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Usage**

```tsx
// In a client component
import { useTranslation } from "react-i18next";
export default function CTA() {
  const { t } = useTranslation("common");
  return (
    <button className="bg-primary text-white px-4 py-2 rounded">
      {t("app.generate")}
    </button>
  );
}
```

**QA checklist**

-

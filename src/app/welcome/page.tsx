import { Mark, Wordmark } from "@/components/ui/brand";
import {
  Activity,
  ArrowRight,
  Calendar,
  Check,
  Dumbbell,
  Flame,
  Play,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";

/* ---------- Mockup estático del teléfono para el hero ---------- */
function PhoneMock() {
  return (
    <div
      className="dark"
      style={{
        width: 300,
        borderRadius: 44,
        padding: 10,
        background: "linear-gradient(160deg,#2A2440,#0E0B18)",
        boxShadow: "0 40px 90px -30px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{ borderRadius: 34, overflow: "hidden", background: "var(--bg)", padding: 16 }}
      >
        {/* header */}
        <div className="flex items-center gap-2.5 mb-4">
          <Mark size={30} />
          <div>
            <div className="cf-muted text-[10px] font-semibold">Lunes · 8 jun</div>
            <div className="font-display font-bold text-[16px]">Hola, Alex</div>
          </div>
          <span className="cf-chip cf-chip-amber ml-auto" style={{ padding: "3px 8px", fontSize: 10 }}>
            <Flame size={10} fill="currentColor" />12
          </span>
        </div>
        {/* hero card */}
        <div className="cf-card relative overflow-hidden mb-3" style={{ padding: 14, borderRadius: 18 }}>
          <span className="cf-chip cf-chip-brand" style={{ fontSize: 10, padding: "3px 9px" }}>
            <Sparkles size={10} fill="currentColor" />Hoy
          </span>
          <div className="font-display font-bold text-[16px] mt-2">Empuje superior</div>
          <div className="cf-muted text-[10px] font-semibold mt-1">6 ejercicios · 48 min</div>
          <div className="flex gap-1.5 mt-2.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="cf-eximg flex-1" style={{ height: 30, borderRadius: 8 }} />
            ))}
          </div>
          <button className="cf-btn cf-btn-primary cf-btn-block mt-3" style={{ padding: "9px 0", fontSize: 12 }}>
            <Play size={12} fill="currentColor" />Iniciar
          </button>
        </div>
        {/* tiles */}
        <div className="flex gap-2">
          {(
            [
              { icon: Flame, v: "12", l: "Racha", c: "var(--amber)" },
              { icon: TrendingUp, v: "8.4t", l: "Volumen", c: "var(--cyan)" },
              { icon: Activity, v: "7.8", l: "RPE", c: "var(--mint)" },
            ] as { icon: React.ElementType; v: string; l: string; c: string }[]
          ).map(({ icon: Icon, v, l, c }, i) => (
            <div key={i} className="cf-card flex-1" style={{ padding: "9px 8px", borderRadius: 12 }}>
              <div style={{ color: c, marginBottom: 4 }}>
                <Icon size={14} />
              </div>
              <div className="cf-num text-[14px]">{v}</div>
              <div className="cf-muted text-[8px] font-semibold">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FloatCard({
  icon: Icon,
  grad,
  big,
  small,
  className,
  style,
}: {
  icon: React.ElementType;
  grad: string;
  big: string;
  small: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`cf-card hidden lg:flex items-center gap-3 ${className || ""}`}
      style={{ padding: "12px 14px", borderRadius: 16, ...style }}
    >
      <div className="cf-icon-tile" style={{ width: 38, height: 38, background: grad, color: "#1a1200" }}>
        <Icon size={18} />
      </div>
      <div>
        <div className="cf-num text-[16px] leading-none">{big}</div>
        <div className="cf-muted text-[10px] font-semibold mt-0.5">{small}</div>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
  color,
  span,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  color: string;
  span?: boolean;
}) {
  return (
    <div className={`cf-card ${span ? "sm:col-span-2" : ""}`} style={{ padding: 28, borderRadius: 24 }}>
      <div className="cf-icon-tile" style={{ width: 52, height: 52, borderRadius: 16, background: "var(--surface-2)", color, marginBottom: 18 }}>
        <Icon size={24} />
      </div>
      <div className="cf-h2 text-[20px]">{title}</div>
      <div className="cf-muted text-[14px] leading-relaxed mt-2">{body}</div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <div className="dark relative min-h-screen overflow-hidden" style={{ background: "var(--bg)", color: "var(--txt)" }}>
      <div className="cf-mesh fixed inset-0" aria-hidden />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8 lg:px-12">
        {/* ===== NAV ===== */}
        <nav className="flex items-center justify-between py-6">
          <Wordmark size={28} />
          <div className="flex items-center gap-6 lg:gap-8 text-[14.5px] font-semibold text-txt-2">
            <span className="hidden md:inline">Funciones</span>
            <span className="hidden md:inline">Cómo funciona</span>
            <span className="hidden md:inline">Precios</span>
            <Link href="/login" className="cf-btn cf-btn-ghost cf-btn-sm">Entrar</Link>
            <Link href="/login" className="cf-btn cf-btn-primary cf-btn-sm">Empezar gratis</Link>
          </div>
        </nav>

        {/* ===== HERO ===== */}
        <section className="grid lg:grid-cols-2 gap-10 items-center py-8 lg:py-16">
          <div>
            <span className="cf-chip cf-chip-brand" style={{ fontSize: 13, padding: "8px 14px" }}>
              <Sparkles size={13} fill="currentColor" />Entrenador personal con IA
            </span>
            <h1 className="font-display font-bold tracking-tight text-[40px] sm:text-[52px] lg:text-[64px] leading-[1.04] mt-5">
              Tu plan de fitness,
              <br />
              <span className="cf-grad-txt">creado por IA</span>
            </h1>
            <p className="cf-muted text-[17px] lg:text-[18px] leading-relaxed mt-5 max-w-md">
              Dile tu objetivo y CreatiFit genera un plan a tu medida, registra cada serie y adapta tus entrenos a tu progreso real.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link href="/login" className="cf-btn cf-btn-primary cf-btn-lg" style={{ fontSize: 16 }}>
                Empieza gratis<ArrowRight size={19} />
              </Link>
              <Link href="/login" className="cf-btn cf-btn-ghost cf-btn-lg" style={{ fontSize: 16 }}>
                <Play size={17} fill="currentColor" />Ver demo
              </Link>
            </div>
            <div className="flex items-center gap-3.5 mt-9">
              <div className="flex">
                {["#7C5CFF", "#F0469C", "#25E0E5", "#36E5A4"].map((c, i) => (
                  <div key={i} style={{ width: 36, height: 36, borderRadius: "50%", marginLeft: i ? -10 : 0, border: "2px solid var(--bg)", background: c }} />
                ))}
              </div>
              <div>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} color="var(--amber)" fill="var(--amber)" />)}
                </div>
                <div className="cf-muted text-[13px] font-semibold mt-0.5">+50.000 usuarios activos</div>
              </div>
            </div>
          </div>

          {/* phone + floating cards */}
          <div className="relative flex justify-center min-h-[420px] lg:min-h-[560px]">
            <div
              className="absolute pointer-events-none"
              style={{ width: 420, height: 420, borderRadius: "50%", top: 30, background: "radial-gradient(circle, rgba(124,92,255,0.4), transparent 70%)", filter: "blur(20px)" }}
              aria-hidden
            />
            <div className="relative z-10">
              <PhoneMock />
            </div>
            <FloatCard icon={Flame} grad="var(--grad-amber)" big="12 días" small="de racha" className="z-20" style={{ position: "absolute", top: 50, left: 0, boxShadow: "var(--glow-brand)" }} />
            <FloatCard icon={Trophy} grad="var(--grad-mint)" big="Nuevo récord" small="Sentadilla 80kg" className="z-20" style={{ position: "absolute", bottom: 70, right: 0, boxShadow: "var(--glow-mint)" }} />
          </div>
        </section>

        {/* ===== AI SHOWCASE ===== */}
        <section className="py-10 lg:py-16">
          <div className="cf-card relative overflow-hidden grid lg:grid-cols-2 gap-10 items-center" style={{ borderRadius: 30, padding: "clamp(28px,4vw,44px)" }}>
            <div
              className="absolute pointer-events-none"
              style={{ top: -60, right: -40, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,70,156,0.25), transparent 70%)" }}
              aria-hidden
            />
            <div className="relative">
              <span className="cf-eyebrow">Inteligencia artificial</span>
              <div className="font-display font-bold tracking-tight text-[30px] lg:text-[38px] leading-tight mt-3">
                Describe tu meta.<br />La IA hace el resto.
              </div>
              <p className="cf-muted text-[16px] leading-relaxed mt-4 max-w-md">
                Sin plantillas genéricas. Genera planes según tu objetivo, equipo disponible, nivel y días por semana — y los reajusta a tu progreso.
              </p>
              <div className="flex flex-col gap-3 mt-6">
                {[
                  "Adapta volumen e intensidad cada semana",
                  "Sugiere progresión de cargas automáticamente",
                  "Sustituye ejercicios según tu equipo",
                ].map((tx) => (
                  <div key={tx} className="flex items-center gap-3">
                    <div className="flex items-center justify-center shrink-0" style={{ width: 24, height: 24, borderRadius: 8, background: "rgba(54,229,164,0.16)" }}>
                      <Check size={14} color="var(--mint)" strokeWidth={3} />
                    </div>
                    <span className="text-[14.5px] font-semibold text-txt-2">{tx}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* prompt → result */}
            <div className="relative flex flex-col gap-3.5">
              <div className="cf-card cf-card-solid flex gap-3 items-start" style={{ padding: 18, borderRadius: 18 }}>
                <div className="rounded-full flex items-center justify-center text-white font-display font-bold text-sm shrink-0" style={{ width: 34, height: 34, background: "var(--grad-brand-soft)" }}>A</div>
                <div className="text-txt-2 text-[14.5px] leading-relaxed pt-1">
                  &quot;Quiero ganar músculo, entreno 5 días con mancuernas y barra. Nivel intermedio.&quot;
                </div>
              </div>
              <div className="flex justify-center">
                <span className="cf-chip cf-chip-brand"><Sparkles size={12} fill="currentColor" />Generando plan…</span>
              </div>
              <div className="cf-card" style={{ padding: 20, borderRadius: 18, border: "1.5px solid var(--primary)", boxShadow: "var(--glow-brand)" }}>
                <div className="flex justify-between items-center mb-3.5">
                  <div className="cf-h2 text-[18px]">Hipertrofia Push/Pull</div>
                  <Mark size={30} />
                </div>
                {[["A", "Empuje", "6 ej"], ["B", "Tirón", "6 ej"], ["C", "Pierna", "7 ej"]].map((d, i) => (
                  <div key={i} className="flex items-center gap-3" style={{ padding: "9px 0", borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}>
                    <div className="font-display font-bold flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 10, background: "var(--surface-2)", fontSize: 13, color: "var(--primary)" }}>{d[0]}</div>
                    <div className="flex-1 font-bold text-[14px]">{d[1]}</div>
                    <span className="cf-muted text-[12.5px] font-semibold">{d[2]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== BENTO FEATURES ===== */}
        <section className="py-10 lg:py-16">
          <div className="text-center mb-10 lg:mb-12">
            <span className="cf-eyebrow">Todo en una app</span>
            <div className="font-display font-bold tracking-tight text-[32px] lg:text-[42px] mt-3">Diseñada para el progreso</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Feature icon={Sparkles} color="var(--primary)" title="Planes con IA" body="Rutinas personalizadas que evolucionan contigo, semana a semana." />
            <Feature icon={Activity} color="var(--cyan)" title="Seguimiento real" body="Registra series, peso y RPE. Visualiza volumen y tendencias." />
            <Feature icon={Trophy} color="var(--amber)" title="Récords y logros" body="Celebra cada PR y mantén tu racha viva con recordatorios." />
            <Feature icon={Dumbbell} color="var(--mint)" title="Biblioteca de ejercicios" body="Cientos de movimientos con técnica, músculos y alternativas." />
            <Feature icon={Calendar} color="var(--primary)" title="Sesiones guiadas" body="Calentamiento, descansos cronometrados y resumen al terminar." span />
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="py-10 lg:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {(
              [
                { n: "1", icon: Target, title: "Define tu objetivo", body: "Cuéntanos qué quieres lograr, tu nivel y equipo disponible." },
                { n: "2", icon: Sparkles, title: "Recibe tu plan", body: "La IA construye una rutina a tu medida en segundos." },
                { n: "3", icon: TrendingUp, title: "Entrena y progresa", body: "Registra cada sesión y deja que el plan se adapte a ti." },
              ] as { n: string; icon: React.ElementType; title: string; body: string }[]
            ).map(({ n, icon: Icon, title, body }, i) => (
              <div key={i}>
                <div className="cf-num cf-grad-txt text-[52px] leading-none" style={{ opacity: 0.9 }}>{n}</div>
                <div className="cf-icon-tile" style={{ width: 46, height: 46, borderRadius: 14, background: "var(--surface-2)", color: "var(--primary)", margin: "8px 0 14px" }}>
                  <Icon size={22} />
                </div>
                <div className="cf-h2 text-[20px]">{title}</div>
                <div className="cf-muted text-[14.5px] leading-relaxed mt-2 max-w-xs">{body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== STATS BAND ===== */}
        <section className="py-6 lg:py-10">
          <div className="cf-card relative overflow-hidden" style={{ borderRadius: 28, padding: "40px 24px" }}>
            <div className="absolute inset-0 bg-grad-brand" style={{ opacity: 0.1 }} aria-hidden />
            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
              {[["50K+", "Usuarios activos"], ["2.4M", "Sesiones completadas"], ["4.9", "Valoración media"], ["180K", "Récords logrados"]].map((s, i) => (
                <div key={i}>
                  <div className="cf-num cf-grad-txt text-[38px] lg:text-[46px] tracking-tight">{s[0]}</div>
                  <div className="cf-muted text-[14px] font-semibold mt-1">{s[1]}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section className="py-10 lg:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              ["Marta G.", "Perdió 8 kg en 12 semanas", "La IA ajusta el plan cuando me estanco. Por fin algo que se adapta a mí y no al revés.", "var(--grad-brand)"],
              ["Diego R.", "+15 kg en press banca", "El seguimiento de RPE y volumen me cambió la forma de entrenar. Datos claros, progreso real.", "var(--grad-cyan)"],
              ["Lucía M.", "Constante 6 meses", "Las rachas y recordatorios me mantienen. Es la primera app que no abandono.", "var(--grad-mint)"],
            ].map((tm, i) => (
              <div key={i} className="cf-card" style={{ padding: 26, borderRadius: 22 }}>
                <div className="flex gap-0.5 mb-4">
                  {[0, 1, 2, 3, 4].map((j) => <Star key={j} size={15} color="var(--amber)" fill="var(--amber)" />)}
                </div>
                <div className="text-txt-2 text-[15px] leading-relaxed">&quot;{tm[2]}&quot;</div>
                <div className="flex items-center gap-3 mt-5">
                  <div className="rounded-full flex items-center justify-center text-white font-display font-bold" style={{ width: 42, height: 42, background: tm[3] }}>{tm[0][0]}</div>
                  <div>
                    <div className="font-bold text-[14.5px]">{tm[0]}</div>
                    <div className="cf-muted text-[12.5px] font-semibold">{tm[1]}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== PRICING ===== */}
        <section className="py-10 lg:py-16">
          <div className="text-center mb-10">
            <span className="cf-eyebrow">Precios</span>
            <div className="font-display font-bold tracking-tight text-[30px] lg:text-[42px] mt-3">Empieza gratis, mejora cuando quieras</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
            {[
              { n: "Free", p: "0", d: "/siempre", f: ["1 plan activo", "Seguimiento básico", "Biblioteca de ejercicios"], cta: "Empezar gratis", hot: false },
              { n: "Pro", p: "9", d: "/mes", f: ["Planes con IA ilimitados", "Analíticas avanzadas", "Progresión automática", "Sin anuncios"], cta: "Probar Pro", hot: true },
              { n: "Team", p: "19", d: "/mes", f: ["Todo en Pro", "Para entrenadores", "Hasta 10 atletas", "Panel de seguimiento"], cta: "Contactar", hot: false },
            ].map((pl, i) => (
              <div key={i} className="cf-card relative overflow-hidden" style={{ padding: 30, borderRadius: 24, border: pl.hot ? "1.5px solid var(--primary)" : "1px solid var(--border)", boxShadow: pl.hot ? "var(--glow-brand)" : "var(--shadow-card)" }}>
                {pl.hot && <div className="absolute inset-0 bg-grad-brand" style={{ opacity: 0.08 }} aria-hidden />}
                <div className="relative">
                  {pl.hot && <span className="cf-chip cf-chip-brand mb-3.5"><Sparkles size={12} fill="currentColor" />Más popular</span>}
                  <div className="cf-h2 text-[20px]">{pl.n}</div>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="cf-num text-[17px] text-muted">€</span>
                    <span className="cf-num text-[46px] tracking-tight">{pl.p}</span>
                    <span className="cf-muted text-[14px] font-semibold">{pl.d}</span>
                  </div>
                  <div className="flex flex-col gap-3 my-6">
                    {pl.f.map((f) => (
                      <div key={f} className="flex items-center gap-3">
                        <div className="flex items-center justify-center shrink-0" style={{ width: 22, height: 22, borderRadius: 7, background: pl.hot ? "var(--grad-brand)" : "var(--surface-2)" }}>
                          <Check size={13} color={pl.hot ? "#fff" : "var(--primary)"} strokeWidth={3} />
                        </div>
                        <span className="text-[14px] font-semibold text-txt-2">{f}</span>
                      </div>
                    ))}
                  </div>
                  <Link href="/login" className={`cf-btn cf-btn-block ${pl.hot ? "cf-btn-primary" : "cf-btn-ghost"}`}>{pl.cta}</Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-8 lg:py-12">
          <div className="cf-card relative overflow-hidden text-center" style={{ borderRadius: 32, padding: "clamp(40px,6vw,60px) 32px" }}>
            <div className="absolute inset-0 bg-grad-brand" style={{ opacity: 0.16 }} aria-hidden />
            <div
              className="absolute pointer-events-none"
              style={{ top: -80, left: "50%", transform: "translateX(-50%)", width: 500, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,70,156,0.3), transparent 70%)" }}
              aria-hidden
            />
            <div className="relative flex flex-col items-center">
              <Mark size={64} />
              <div className="font-display font-bold tracking-tight text-[34px] lg:text-[48px] leading-tight mt-5">
                Empieza a entrenar con inteligencia
              </div>
              <div className="cf-muted text-[17px] mt-3.5">Tu primer plan generado por IA, gratis. Sin tarjeta.</div>
              <Link href="/login" className="cf-btn cf-btn-primary cf-btn-lg mt-7" style={{ fontSize: 17, padding: "18px 36px" }}>
                Crear mi plan gratis<ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 py-8 border-t border-border">
          <Wordmark size={24} />
          <div className="flex flex-wrap justify-center gap-6 text-[13.5px] font-semibold text-muted">
            <span>Funciones</span><span>Precios</span><span>Privacidad</span><span>Términos</span><span>Contacto</span>
          </div>
          <div className="cf-muted text-[13px]">© 2026 CreatiFit AI</div>
        </footer>
      </div>
    </div>
  );
}

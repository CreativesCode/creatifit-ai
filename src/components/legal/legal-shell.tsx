import { Wordmark } from "@/components/ui/brand";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

// Shell común para las páginas legales/soporte (públicas, sin auth). Reusa el
// tema oscuro del landing. No lleva "use client": es contenido estático.
export function LegalShell({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string;
  subtitle?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="dark relative min-h-screen overflow-hidden"
      style={{ background: "var(--bg)", color: "var(--txt)" }}
    >
      <div className="cf-mesh fixed inset-0" aria-hidden />

      <div className="relative z-10 mx-auto max-w-3xl px-5 sm:px-8 py-7 lg:py-10">
        <nav className="flex items-center justify-between mb-8">
          <Link href="/welcome" className="hover:opacity-80 transition-opacity">
            <Wordmark size={24} />
          </Link>
          <Link href="/welcome" className="cf-btn cf-btn-ghost cf-btn-sm" style={{ gap: 6 }}>
            <ArrowLeft size={15} />
            Inicio
          </Link>
        </nav>

        <header className="mb-9">
          <h1 className="font-display font-bold tracking-tight text-[30px] lg:text-[40px] leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="cf-muted text-[15px] leading-relaxed mt-3 max-w-xl">{subtitle}</p>
          )}
          {updated && (
            <div className="cf-muted text-[13px] font-semibold mt-3">
              Última actualización: {updated}
            </div>
          )}
        </header>

        <article className="flex flex-col gap-1">{children}</article>

        <footer className="mt-14 pt-7 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex flex-wrap justify-center gap-5 text-[13px] font-semibold text-muted">
            <Link href="/privacy" className="hover:text-txt transition-colors">Privacidad</Link>
            <Link href="/terms" className="hover:text-txt transition-colors">Términos</Link>
            <Link href="/account-deletion" className="hover:text-txt transition-colors">Borrar cuenta</Link>
            <Link href="/support" className="hover:text-txt transition-colors">Soporte</Link>
          </div>
          <div className="cf-muted text-[12.5px]">© 2026 CreatiFit AI</div>
        </footer>
      </div>
    </div>
  );
}

// Encabezado de sección.
export function LegalH2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display font-bold text-[20px] lg:text-[22px] mt-8 mb-3">{children}</h2>
  );
}

// Párrafo.
export function LegalP({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-txt-2 text-[15px] leading-relaxed mb-3">{children}</p>
  );
}

// Lista de viñetas.
export function LegalUl({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 mb-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5 text-txt-2 text-[15px] leading-relaxed">
          <span className="text-primary mt-1.5 shrink-0" style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--primary)" }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

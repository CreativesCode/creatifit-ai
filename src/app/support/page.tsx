import { LegalShell, LegalH2, LegalP } from "@/components/legal/legal-shell";
import { Mail } from "lucide-react";

export const metadata = {
  title: "Soporte · CreatiFit AI",
  description: "Ayuda y contacto de CreatiFit AI.",
};

const EMAIL = "robert.cabrer92@gmail.com";

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="cf-card mb-3" style={{ padding: "16px 18px", borderRadius: 16 }}>
      <div className="font-bold text-[15px] mb-1.5">{q}</div>
      <div className="text-txt-2 text-[14.5px] leading-relaxed">{children}</div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <LegalShell
      title="Soporte"
      subtitle="¿Necesitas ayuda? Estamos para echarte una mano."
    >
      {/* Contacto destacado */}
      <div
        className="cf-card flex items-center gap-3.5 mb-8"
        style={{ padding: 18, borderRadius: 18, border: "1.5px solid var(--primary)", boxShadow: "var(--glow-brand)" }}
      >
        <div className="cf-icon-tile" style={{ width: 44, height: 44, background: "var(--grad-brand)", color: "#fff" }}>
          <Mail size={20} />
        </div>
        <div>
          <div className="font-bold text-[15px]">Escríbenos</div>
          <a href={`mailto:${EMAIL}`} className="text-primary font-semibold text-[14.5px]">{EMAIL}</a>
          <div className="cf-muted text-[12.5px] mt-0.5">Solemos responder en 48 horas laborables.</div>
        </div>
      </div>

      <LegalH2>Preguntas frecuentes</LegalH2>

      <Faq q="¿Cómo genero mi plan?">
        Entra en la app, pulsa &quot;Crear plan&quot; y responde el breve cuestionario (objetivo,
        nivel, equipo y días). La IA generará tu rutina en segundos.
      </Faq>

      <Faq q="¿Qué incluye el plan gratuito?">
        El plan Free incluye 1 generación de plan con IA, el seguimiento básico y la
        biblioteca de ejercicios. Con Pro generas planes ilimitados y desbloqueas las
        analíticas avanzadas.
      </Faq>

      <Faq q="¿Cómo cancelo mi suscripción?">
        Las suscripciones se gestionan desde Google Play: abre Play Store → Suscripciones →
        CreatiFit AI → Cancelar. Mantendrás el acceso Pro hasta el final del periodo pagado.
      </Faq>

      <Faq q="Pagué pero no veo el Pro">
        En Ajustes pulsa &quot;Restaurar compras&quot;. Si el problema persiste, escríbenos con el
        correo de tu cuenta y la fecha de compra.
      </Faq>

      <Faq q="¿Cómo elimino mi cuenta?">
        Desde la app: Ajustes → Eliminar cuenta. Se borrarán tu perfil, tus planes y tu
        historial de forma permanente. Más detalles en la página de borrado de cuenta.
      </Faq>

      <LegalP>
        ¿No encuentras lo que buscas? Escríbenos a{" "}
        <a href={`mailto:${EMAIL}`} className="text-primary font-semibold">{EMAIL}</a> y te
        ayudamos.
      </LegalP>
    </LegalShell>
  );
}

import { LegalShell, LegalH2, LegalP, LegalUl } from "@/components/legal/legal-shell";

export const metadata = {
  title: "Términos de servicio · CreatiFit AI",
  description: "Condiciones de uso de CreatiFit AI.",
};

const EMAIL = "robert.cabrer92@gmail.com";

export default function TermsPage() {
  return (
    <LegalShell
      title="Términos de servicio"
      subtitle="Al usar CreatiFit AI aceptas estas condiciones. Léelas con atención, sobre todo el aviso de salud."
      updated="11 de junio de 2026"
    >
      <LegalH2>1. Aceptación</LegalH2>
      <LegalP>
        Al crear una cuenta o usar CreatiFit AI (&quot;la app&quot;) aceptas estos términos. Si no
        estás de acuerdo, no uses la app.
      </LegalP>

      <LegalH2>2. Qué ofrece la app</LegalH2>
      <LegalP>
        CreatiFit AI genera planes de entrenamiento personalizados con inteligencia
        artificial y te permite registrar tus sesiones y seguir tu progreso. Los planes son
        sugerencias generales basadas en la información que proporcionas.
      </LegalP>

      <LegalH2>3. Aviso de salud (importante)</LegalH2>
      <LegalP>
        CreatiFit AI <strong>no es un servicio médico</strong> y no sustituye el consejo de un
        profesional de la salud. El ejercicio físico conlleva riesgos. Antes de empezar
        cualquier programa, especialmente si tienes condiciones médicas, lesiones o estás
        embarazada, consulta a un profesional. Entrenas bajo tu propia responsabilidad; si
        sientes dolor o malestar, detente. No nos hacemos responsables de lesiones derivadas
        del uso de la app.
      </LegalP>

      <LegalH2>4. Tu cuenta</LegalH2>
      <LegalUl
        items={[
          "Eres responsable de mantener la confidencialidad de tus credenciales.",
          "Debes facilitar datos veraces para que los planes sean adecuados.",
          "Debes tener al menos 16 años para usar la app.",
        ]}
      />

      <LegalH2>5. Suscripciones y pagos</LegalH2>
      <LegalUl
        items={[
          "La app ofrece un plan gratuito (Free) con 1 generación de plan por IA, y planes de pago (Pro mensual y Pro anual).",
          "Las suscripciones se contratan y se cobran a través de Google Play. La renovación es automática salvo que la canceles.",
          "Puedes gestionar o cancelar tu suscripción desde tu cuenta de Google Play. La cancelación surte efecto al final del periodo ya pagado.",
          "Los precios pueden cambiar; te avisaremos antes de que afecte a tu renovación.",
        ]}
      />

      <LegalH2>6. Uso aceptable</LegalH2>
      <LegalP>No puedes usar la app para fines ilícitos, ni intentar vulnerar su seguridad, copiar o revender el servicio, ni abusar de la generación con IA mediante automatismos.</LegalP>

      <LegalH2>7. Propiedad intelectual</LegalH2>
      <LegalP>
        La app, su marca y su contenido pertenecen a CreatiFit AI. Conservas la titularidad de
        los datos que introduces; nos concedes una licencia limitada para procesarlos y
        prestarte el servicio.
      </LegalP>

      <LegalH2>8. Limitación de responsabilidad</LegalH2>
      <LegalP>
        La app se ofrece &quot;tal cual&quot;. En la medida que permita la ley, no garantizamos que
        esté libre de errores ni nos responsabilizamos de daños indirectos derivados de su
        uso. Nada en estos términos limita responsabilidades que no puedan excluirse
        legalmente.
      </LegalP>

      <LegalH2>9. Cancelación y baja</LegalH2>
      <LegalP>
        Puedes dejar de usar la app y eliminar tu cuenta en cualquier momento desde{" "}
        <strong>Ajustes → Eliminar cuenta</strong>. Podemos suspender cuentas que incumplan
        estos términos.
      </LegalP>

      <LegalH2>10. Cambios</LegalH2>
      <LegalP>Podemos actualizar estos términos. Publicaremos la nueva versión con su fecha y, si los cambios son relevantes, te lo notificaremos.</LegalP>

      <LegalH2>11. Ley aplicable</LegalH2>
      <LegalP>Estos términos se rigen por la legislación española, sin perjuicio de los derechos que te correspondan como consumidor.</LegalP>

      <LegalH2>12. Contacto</LegalH2>
      <LegalP>
        Para cualquier duda:{" "}
        <a href={`mailto:${EMAIL}`} className="text-primary font-semibold">{EMAIL}</a>.
      </LegalP>
    </LegalShell>
  );
}

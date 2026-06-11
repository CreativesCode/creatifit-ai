import { LegalShell, LegalH2, LegalP, LegalUl } from "@/components/legal/legal-shell";

export const metadata = {
  title: "Eliminar tu cuenta · CreatiFit AI",
  description: "Cómo eliminar tu cuenta de CreatiFit AI y qué datos se borran.",
};

const EMAIL = "robert.cabrer92@gmail.com";

export default function AccountDeletionPage() {
  return (
    <LegalShell
      title="Eliminar tu cuenta"
      subtitle="Puedes eliminar tu cuenta de CreatiFit AI y todos tus datos en cualquier momento. Aquí te explicamos cómo."
      updated="11 de junio de 2026"
    >
      <LegalH2>Opción 1 — Desde la app (recomendado)</LegalH2>
      <LegalP>Es la forma más rápida e inmediata:</LegalP>
      <LegalUl
        items={[
          "Abre CreatiFit AI e inicia sesión.",
          "Ve a Ajustes.",
          "Pulsa “Eliminar cuenta”.",
          "Confirma. Tu cuenta y tus datos se borrarán de inmediato y se cerrará la sesión.",
        ]}
      />

      <LegalH2>Opción 2 — Por correo</LegalH2>
      <LegalP>
        Si no puedes acceder a la app, escríbenos desde el correo asociado a tu cuenta a{" "}
        <a href={`mailto:${EMAIL}`} className="text-primary font-semibold">{EMAIL}</a> con el
        asunto &quot;Eliminar cuenta&quot;. Verificaremos tu identidad y la eliminaremos en un plazo
        máximo de 30 días.
      </LegalP>

      <LegalH2>Qué datos se eliminan</LegalH2>
      <LegalP>Al eliminar tu cuenta se borran de forma permanente:</LegalP>
      <LegalUl
        items={[
          "Tu cuenta y credenciales de acceso.",
          "Tu perfil (correo y nombre).",
          "Tu cuestionario de fitness (objetivo, nivel, edad, peso, altura, equipo).",
          "Todos tus planes generados.",
          "Todo tu historial de entrenamiento (series, repeticiones, peso, RPE).",
        ]}
      />

      <LegalH2>Qué puede conservarse</LegalH2>
      <LegalP>
        El borrado es permanente e irreversible: no podremos recuperar tus datos después.
        Puede permanecer información mínima únicamente cuando una ley nos obligue a
        conservarla (por ejemplo, registros de facturación que gestiona Google Play, que no
        almacenamos nosotros).
      </LegalP>

      <LegalH2>Suscripciones</LegalH2>
      <LegalP>
        Eliminar la cuenta no cancela automáticamente una suscripción contratada en Google
        Play. Si tienes una suscripción activa, cancélala también desde Play Store →
        Suscripciones para evitar futuros cobros.
      </LegalP>

      <LegalH2>¿Dudas?</LegalH2>
      <LegalP>
        Escríbenos a{" "}
        <a href={`mailto:${EMAIL}`} className="text-primary font-semibold">{EMAIL}</a>.
      </LegalP>
    </LegalShell>
  );
}

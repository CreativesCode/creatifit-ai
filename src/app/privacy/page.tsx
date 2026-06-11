import { LegalShell, LegalH2, LegalP, LegalUl } from "@/components/legal/legal-shell";

export const metadata = {
  title: "Política de privacidad · CreatiFit AI",
  description: "Cómo CreatiFit AI recoge, usa y protege tus datos.",
};

const EMAIL = "robert.cabrer92@gmail.com";

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Política de privacidad"
      subtitle="En CreatiFit AI nos tomamos en serio tu privacidad. Aquí explicamos qué datos recogemos, para qué los usamos y qué derechos tienes."
      updated="11 de junio de 2026"
    >
      <LegalH2>1. Responsable del tratamiento</LegalH2>
      <LegalP>
        El responsable del tratamiento de tus datos es el equipo de CreatiFit AI. Para
        cualquier asunto relacionado con la privacidad puedes escribirnos a{" "}
        <a href={`mailto:${EMAIL}`} className="text-primary font-semibold">{EMAIL}</a>.
      </LegalP>

      <LegalH2>2. Datos que recogemos</LegalH2>
      <LegalP>Recogemos únicamente los datos necesarios para que la app funcione:</LegalP>
      <LegalUl
        items={[
          <><strong>Datos de cuenta:</strong> tu correo electrónico y, opcionalmente, tu nombre. La contraseña se guarda cifrada (gestionada por nuestro proveedor de autenticación, nunca la vemos).</>,
          <><strong>Datos de fitness que tú introduces:</strong> objetivo, nivel, edad, peso, altura, equipo disponible, pasos diarios y notas. Sirven para generar tu plan.</>,
          <><strong>Planes y registros de entreno:</strong> los planes generados y lo que registras en cada sesión (series, repeticiones, peso, RPE, notas).</>,
          <><strong>Datos de suscripción:</strong> el estado de tu suscripción (Free/Pro). Los pagos los procesan Google Play y RevenueCat; <strong>no almacenamos datos de tu tarjeta</strong>.</>,
          <><strong>Datos técnicos básicos:</strong> registros de error e identificadores técnicos necesarios para el funcionamiento y la seguridad.</>,
        ]}
      />

      <LegalH2>3. Para qué usamos tus datos</LegalH2>
      <LegalUl
        items={[
          "Crear y personalizar tus planes de entrenamiento.",
          "Mostrar tu progreso, récords y estadísticas.",
          "Gestionar tu cuenta y tu suscripción.",
          "Mantener la seguridad del servicio y resolver incidencias.",
        ]}
      />

      <LegalH2>4. Inteligencia artificial</LegalH2>
      <LegalP>
        Para generar tu plan, enviamos los datos de tu cuestionario (objetivo, nivel, edad,
        peso, altura y equipo) a nuestro proveedor de IA (OpenAI), exclusivamente con el fin
        de crear la rutina. No enviamos tu correo ni datos que te identifiquen directamente
        más allá de lo necesario para esa generación.
      </LegalP>

      <LegalH2>5. Con quién compartimos datos</LegalH2>
      <LegalP>
        No vendemos tus datos. Los compartimos solo con los proveedores que hacen posible el
        servicio, actuando como encargados del tratamiento:
      </LegalP>
      <LegalUl
        items={[
          <><strong>Supabase:</strong> alojamiento, base de datos y autenticación.</>,
          <><strong>OpenAI:</strong> generación de planes con IA (ver punto 4).</>,
          <><strong>RevenueCat y Google Play:</strong> gestión de suscripciones y pagos.</>,
        ]}
      />
      <LegalP>
        Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo,
        con las garantías adecuadas previstas por la normativa aplicable.
      </LegalP>

      <LegalH2>6. Conservación</LegalH2>
      <LegalP>
        Conservamos tus datos mientras tengas una cuenta activa. Cuando eliminas tu cuenta,
        borramos tu perfil, tu cuestionario, tus planes y tus registros de entreno. Puede
        permanecer información mínima cuando una ley nos obligue a conservarla.
      </LegalP>

      <LegalH2>7. Tus derechos</LegalH2>
      <LegalP>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición,
        limitación y portabilidad. La forma más rápida de eliminar tus datos es desde la
        propia app: <strong>Ajustes → Eliminar cuenta</strong>. También puedes escribirnos a{" "}
        <a href={`mailto:${EMAIL}`} className="text-primary font-semibold">{EMAIL}</a>.
      </LegalP>

      <LegalH2>8. Menores</LegalH2>
      <LegalP>
        CreatiFit AI no está dirigida a menores de 16 años. Si crees que un menor nos ha
        facilitado datos, contáctanos y los eliminaremos.
      </LegalP>

      <LegalH2>9. Seguridad</LegalH2>
      <LegalP>
        Usamos cifrado en tránsito y reglas de acceso por usuario (Row Level Security) para
        que cada persona solo pueda ver sus propios datos. Ningún sistema es 100% infalible,
        pero trabajamos para protegerlos.
      </LegalP>

      <LegalH2>10. Cambios en esta política</LegalH2>
      <LegalP>
        Si actualizamos esta política, cambiaremos la fecha de arriba y, si los cambios son
        relevantes, te lo notificaremos en la app.
      </LegalP>

      <LegalH2>11. Contacto</LegalH2>
      <LegalP>
        Para cualquier duda sobre privacidad:{" "}
        <a href={`mailto:${EMAIL}`} className="text-primary font-semibold">{EMAIL}</a>.
      </LegalP>
    </LegalShell>
  );
}

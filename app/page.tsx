import Link from "next/link";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Mis Deudas — Controla tus deudas y finanzas en un solo lugar",
  description:
    "Registra tus deudas, cuentas y responsabilidades, mira tu saldo real con TRM y prepárate para recibir consejos financieros con IA.",
};

export default async function Landing() {
  const user = await getSession();

  return (
    <main className="landing">
      <section className="hero">
        <h1>Toma el control de tus deudas y tu dinero</h1>
        <p className="hero-sub">
          Registra tus deudas, responsabilidades y cuentas en pesos, dólares o
          euros. Mira tu saldo real convertido con la TRM del día y ten claro
          cuánto debes y cuánto tienes, todo en un solo lugar.
        </p>
        <div className="hero-cta">
          {user ? (
            <Link className="boton" href="/dashboard">
              Ir a mi panel
            </Link>
          ) : (
            <>
              <Link className="boton" href="/register">
                Empezar gratis
              </Link>
              <Link className="boton-ghost" href="/login">
                Ya tengo cuenta
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <span className="feature-icon">📊</span>
          <h3>Todo tu dinero, claro</h3>
          <p>
            Deudas, pagos permanentes y cuentas en un mismo tablero. Saldo total
            unificado aunque tengas varias monedas.
          </p>
        </div>
        <div className="feature">
          <span className="feature-icon">🤝</span>
          <h3>Deudas compartidas</h3>
          <p>
            Comparte el seguimiento de una deuda con otra persona y mantengan las
            cuentas claras entre los dos.
          </p>
        </div>
        <div className="feature">
          <span className="feature-icon">🌎</span>
          <h3>Multimoneda con TRM</h3>
          <p>
            Cuentas en COP, USD y EUR convertidas automáticamente con la tasa del
            día para ver tu patrimonio real.
          </p>
        </div>
      </section>

      <section className="cta-ai">
        <span className="badge-soon">Próximamente</span>
        <h2>Tu asesor financiero con IA</h2>
        <p>
          Estamos construyendo un asesor que analiza tus finanzas y te dice en
          qué gastas de más, qué deuda conviene pagar primero y cómo ahorrar mes
          a mes. Crea tu cuenta hoy y sé de los primeros en probarlo.
        </p>
        {!user && (
          <Link className="boton" href="/register">
            Crear cuenta gratis
          </Link>
        )}
      </section>

      <footer className="landing-footer">
        <p className="muted">
          Mis Deudas — orientación general sobre tus finanzas personales. No
          constituye asesoría financiera profesional.
        </p>
      </footer>
    </main>
  );
}

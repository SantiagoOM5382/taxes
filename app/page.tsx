import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Handshake, Globe } from "lucide-react";
import { getSession } from "@/lib/session";
import BrandMark from "@/components/BrandMark";

export const metadata = {
  title: "Mis Deudas: tus deudas y tu dinero en un solo lugar",
  description:
    "Registra deudas, cuentas y pagos fijos. Mira tu saldo real con la TRM del día y lo que vence este mes.",
};

export default async function Landing() {
  const user = await getSession();

  if (user) redirect("/dashboard");

  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link href="/" className="brand">
          <BrandMark />
          Mis Deudas
        </Link>
        <Link href="/login" className="btn btn-quiet">
          Iniciar sesión
        </Link>
      </nav>

      <section className="hero">
        <div>
          <h1>Sabe cuánto tienes y cuánto debes, hoy.</h1>
          <p className="hero-sub">
            Registra tus cuentas en pesos, dólares o euros, tus deudas y tus pagos fijos. Mis Deudas lo convierte todo con
            la TRM del día y te muestra qué vence este mes.
          </p>
          <div className="hero-cta">
            <Link className="btn btn-primary" href="/register">
              Crear cuenta gratis
            </Link>
            <Link className="btn btn-ghost" href="/login">
              Ya tengo cuenta
            </Link>
          </div>
        </div>

        <div className="statement" aria-label="Ejemplo de resumen">
          <div className="statement-head">
            <h3>Septiembre</h3>
            <span className="hint">Ejemplo</span>
          </div>
          <div className="statement-row">
            <span>Nequi</span>
            <span className="money">$ 1.240.000</span>
          </div>
          <div className="statement-row">
            <span>Binance, US$ 850 a TRM</span>
            <span className="money">$ 3.580.000</span>
          </div>
          <div className="statement-row">
            <span>Préstamo del carro</span>
            <span className="money money-debt">− $ 1.350.000</span>
          </div>
          <div className="statement-row">
            <span>Arriendo, vence el 5</span>
            <span className="tag tag-paid">Pagado</span>
          </div>
          <div className="statement-total">
            <span>Te queda</span>
            <span className="money">$ 3.470.000</span>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <Globe size={22} aria-hidden />
          <h3>Varias monedas, un solo total</h3>
          <p>Tus cuentas en USD y EUR se suman en pesos con la tasa del día.</p>
        </div>
        <div className="feature">
          <CalendarDays size={22} aria-hidden />
          <h3>Calendario de pagos</h3>
          <p>Arriendo, servicios y tarjetas aparecen el día que vencen. Márcalos al pagarlos.</p>
        </div>
        <div className="feature">
          <Handshake size={22} aria-hidden />
          <h3>Deudas compartidas</h3>
          <p>Dale acceso de solo lectura a la persona a quien le debes. Ambos ven los mismos pagos.</p>
        </div>
      </section>

      <section className="landing-ai">
        <div>
          <h2>Un asesor que lee tus números</h2>
          <p>
            Te dice qué deuda conviene pagar primero y cuánto te queda para ahorrar cada mes, a partir de tus datos
            reales.
          </p>
        </div>
        <Link className="btn btn-primary" href="/register">
          Probarlo gratis
        </Link>
      </section>

      <footer className="landing-foot">
        Mis Deudas ofrece orientación general sobre finanzas personales. No constituye asesoría financiera profesional.
      </footer>
    </div>
  );
}

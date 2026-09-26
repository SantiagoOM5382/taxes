import Link from "next/link";
import BrandMark from "./BrandMark";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <Link href="/" className="brand">
          <BrandMark />
          Mis Deudas
        </Link>
        <div className="auth-statement">
          <h2>Lo que tienes, lo que debes y lo que vence este mes.</h2>
          <p>Cuentas en pesos, dólares o euros, deudas con su avance y un calendario de pagos que no se te olvida.</p>
          <div className="auth-sample" aria-hidden>
            <div>
              <div className="auth-sample-label">Tienes</div>
              <div className="auth-sample-value have">$ 4.820.000</div>
            </div>
            <div>
              <div className="auth-sample-label">Debes</div>
              <div className="auth-sample-value owe">$ 1.350.000</div>
            </div>
          </div>
        </div>
        <p className="auth-fine">Orientación general. No constituye asesoría financiera profesional.</p>
      </aside>
      <main className="auth-main">
        <div className="auth-form-wrap">{children}</div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getResumenFinanciero } from "@/lib/resumen";
import { getEstadoUso } from "@/lib/asesor";
import AsesorIA from "@/components/AsesorIA";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default async function AsesorPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [resumen, uso] = await Promise.all([
    getResumenFinanciero(user.id),
    getEstadoUso(user.id),
  ]);

  const fc = resumen.flujo_caja;

  return (
    <main>
      <p style={{ marginBottom: 12 }}>
        <Link href="/dashboard">← Volver al inicio</Link>
      </p>
      <h1>Asesor financiero</h1>

      <AsesorIA usoInicial={uso} />

      <div className="card">
        <h2>Tu panorama (calculado, sin IA)</h2>
        <div className="resumen">
          <div>
            <span className="muted">Patrimonio</span>
            <strong className="monto">{cop.format(resumen.patrimonio.saldo_total_cop)}</strong>
          </div>
          <div>
            <span className="muted">Deuda total</span>
            <strong className="monto">{cop.format(resumen.deudas.total_adeudado)}</strong>
          </div>
          <div>
            <span className="muted">Ingreso mensual</span>
            <strong className="monto">{cop.format(resumen.ingresos.mensual_total)}</strong>
          </div>
          <div>
            <span className="muted">Gasto fijo mensual</span>
            <strong className="monto">{cop.format(fc.gasto_fijo_mensual)}</strong>
          </div>
          <div>
            <span className="muted">Capacidad de ahorro estimada</span>
            <strong
              className="monto"
              style={{ color: fc.capacidad_ahorro_estimada >= 0 ? "#166534" : "#b91c1c" }}
            >
              {cop.format(fc.capacidad_ahorro_estimada)}
            </strong>
          </div>
          {resumen.indicadores.meses_para_liquidar_deudas != null && (
            <div>
              <span className="muted">Meses para liquidar deudas</span>
              <strong className="monto">
                {resumen.indicadores.meses_para_liquidar_deudas}
              </strong>
            </div>
          )}
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Orientación general sobre tus finanzas personales. No constituye asesoría financiera
          profesional.
        </p>
      </div>
    </main>
  );
}

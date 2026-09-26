import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getResumenFinanciero } from "@/lib/resumen";
import { getEstadoUso } from "@/lib/asesor";
import { cop } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import AsesorIA from "@/components/AsesorIA";

export const metadata = { title: "Asesor" };

export default async function AsesorPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [resumen, uso] = await Promise.all([getResumenFinanciero(user.id), getEstadoUso(user.id)]);
  const fc = resumen.flujo_caja;
  const meses = resumen.indicadores.meses_para_liquidar_deudas;

  return (
    <>
      <PageHeader
        title="Asesor financiero"
        sub="Analiza tus deudas, ingresos y gastos fijos y te sugiere qué hacer primero."
      />

      <section className="ledger">
        <div className="stats">
          <div>
            <div className="stat-label">Ingreso mensual</div>
            <div className="stat-value money">{cop.format(resumen.ingresos.mensual_total)}</div>
          </div>
          <div>
            <div className="stat-label">Gasto fijo mensual</div>
            <div className="stat-value money">{cop.format(fc.gasto_fijo_mensual)}</div>
          </div>
          <div>
            <div className="stat-label">Te sobra al mes</div>
            <div className={`stat-value money ${fc.capacidad_ahorro_estimada >= 0 ? "money-paid" : "money-debt"}`}>
              {cop.format(fc.capacidad_ahorro_estimada)}
            </div>
          </div>
          <div>
            <div className="stat-label">Patrimonio</div>
            <div className="stat-value money">{cop.format(resumen.patrimonio.saldo_total_cop)}</div>
          </div>
          <div>
            <div className="stat-label">Deuda total</div>
            <div className={`stat-value money ${resumen.deudas.total_adeudado > 0 ? "money-debt" : ""}`}>
              {cop.format(resumen.deudas.total_adeudado)}
            </div>
          </div>
          {meses != null && (
            <div>
              <div className="stat-label">Para quedar sin deudas</div>
              <div className="stat-value num">
                {meses} {meses === 1 ? "mes" : "meses"}
              </div>
            </div>
          )}
        </div>
        <p className="hint" style={{ marginTop: 16 }}>
          Estas cifras se calculan con tus datos, sin IA.
        </p>
      </section>

      <AsesorIA usoInicial={uso} />

      <p className="hint" style={{ marginTop: 16 }}>
        Orientación general sobre finanzas personales. No constituye asesoría financiera profesional.
      </p>
    </>
  );
}

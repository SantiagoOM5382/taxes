import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listCuentas, listIngresos, listMovimientos, ensureCuentaEfectivo } from "@/lib/finanzas";
import { getTasaUSDCOP } from "@/lib/tasas";
import FinanzasTabs from "@/components/FinanzasTabs";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const usd = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export default async function FinanzasPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  await ensureCuentaEfectivo(user.id);
  const [cuentas, ingresos, movimientos, tasa] = await Promise.all([
    listCuentas(user.id),
    listIngresos(user.id),
    listMovimientos(user.id),
    getTasaUSDCOP(),
  ]);

  // Las archivadas no cuentan en los totales
  const abiertas = cuentas.filter((c) => c.estado !== "archivada");
  const totalCOP = abiertas.filter((c) => c.moneda === "COP").reduce((s, c) => s + c.saldo, 0);
  const totalUSD = abiertas.filter((c) => c.moneda === "USD").reduce((s, c) => s + c.saldo, 0);
  const totalGeneral = tasa != null ? totalCOP + totalUSD * tasa : null;

  return (
    <main>
      <p style={{ marginBottom: 12 }}>
        <Link href="/">← Volver al inicio</Link>
      </p>
      <h1>Mis Finanzas</h1>

      <div className="card resumen">
        <div>
          <span className="muted">Total en COP</span>
          <strong className="monto">{cop.format(totalCOP)}</strong>
        </div>
        <div>
          <span className="muted">Total en USD</span>
          <strong className="monto">{usd.format(totalUSD)}</strong>
        </div>
        <div>
          <span className="muted">Total general (COP)</span>
          <strong className="monto">
            {totalGeneral != null ? cop.format(totalGeneral) : "—"}
          </strong>
          {tasa != null && <span className="muted">TRM {cop.format(tasa)}</span>}
        </div>
        <div>
          <span className="muted">Cuentas abiertas</span>
          <strong>{abiertas.length}</strong>
        </div>
      </div>

      <FinanzasTabs cuentas={cuentas} ingresos={ingresos} movimientos={movimientos} />
    </main>
  );
}

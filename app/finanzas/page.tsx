import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listCuentas, listIngresos, listMovimientos, ensureCuentaEfectivo } from "@/lib/finanzas";
import { getTasasCOP } from "@/lib/tasas";
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
const eur = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export default async function FinanzasPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  await ensureCuentaEfectivo(user.id);
  const [cuentas, ingresos, movimientos, tasas] = await Promise.all([
    listCuentas(user.id),
    listIngresos(user.id),
    listMovimientos(user.id),
    getTasasCOP(),
  ]);

  // Las archivadas no cuentan en los totales
  const abiertas = cuentas.filter((c) => c.estado !== "archivada");
  const tarjetas = abiertas.filter((c) => c.es_credito && c.limite_credito != null);
  const cupoTotal = tarjetas.reduce((s, c) => s + (c.limite_credito ?? 0), 0);
  const cupoDisponible = tarjetas.reduce((s, c) => s + Math.max(0, c.saldo), 0);
  const cupoUsado = cupoTotal - cupoDisponible;
  const totalCOP = abiertas.filter((c) => c.moneda === "COP").reduce((s, c) => s + c.saldo, 0);
  const totalUSD = abiertas.filter((c) => c.moneda === "USD").reduce((s, c) => s + c.saldo, 0);
  const totalEUR = abiertas.filter((c) => c.moneda === "EUR").reduce((s, c) => s + c.saldo, 0);
  const totalGeneral =
    totalCOP +
    (tasas.usd != null ? totalUSD * tasas.usd : 0) +
    (tasas.eur != null ? totalEUR * tasas.eur : 0);
  const hayEUR = abiertas.some((c) => c.moneda === "EUR");

  return (
    <main>
      <p style={{ marginBottom: 12 }}>
        <Link href="/dashboard">← Volver al inicio</Link>
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
        {hayEUR && (
          <div>
            <span className="muted">Total en EUR</span>
            <strong className="monto">{eur.format(totalEUR)}</strong>
          </div>
        )}
        <div>
          <span className="muted">Total general (COP)</span>
          <strong className="monto">{cop.format(totalGeneral)}</strong>
          {tasas.usd != null && <span className="muted">TRM {cop.format(tasas.usd)}</span>}
        </div>
        <div>
          <span className="muted">Cuentas abiertas</span>
          <strong>{abiertas.length}</strong>
        </div>
      </div>

      {tarjetas.length > 0 && (
        <div className="card resumen" style={{ marginTop: 12 }}>
          <div>
            <span className="muted">Crédito total (cupo)</span>
            <strong className="monto">{cop.format(cupoTotal)}</strong>
          </div>
          <div>
            <span className="muted">Disponible</span>
            <strong className="monto" style={{ color: cupoDisponible > 0 ? "var(--verde, #4caf50)" : "var(--rojo, #e53935)" }}>
              {cop.format(cupoDisponible)}
            </strong>
          </div>
          <div>
            <span className="muted">Usado</span>
            <strong className="monto negativo">{cop.format(cupoUsado)}</strong>
          </div>
          <div>
            <span className="muted">% utilizado</span>
            <strong>{cupoTotal > 0 ? Math.round((cupoUsado / cupoTotal) * 100) : 0}%</strong>
          </div>
          {tarjetas.map((t) => (
            <div key={t.id} style={{ borderTop: "1px solid #333", paddingTop: 8, width: "100%" }}>
              <span className="muted">{t.nombre}</span>
              <span style={{ float: "right", fontSize: 13 }}>
                {cop.format(Math.max(0, t.saldo))} disponible de {cop.format(t.limite_credito ?? 0)}
                {t.dia_pago_credito && <span className="badge credito" style={{ marginLeft: 8 }}>Pago: día {t.dia_pago_credito}</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      <FinanzasTabs cuentas={cuentas} ingresos={ingresos} movimientos={movimientos} />
    </main>
  );
}

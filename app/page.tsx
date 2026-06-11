import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listDeudas } from "@/lib/deudas";
import { listCuentas } from "@/lib/finanzas";
import { getTasaUSDCOP } from "@/lib/tasas";
import NuevaDeudaBoton from "@/components/NuevaDeudaBoton";

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

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [todas, cuentas, tasa] = await Promise.all([
    listDeudas(user.id),
    listCuentas(user.id),
    getTasaUSDCOP(),
  ]);
  const deudas = todas.filter((d) => d.categoria === "deuda");
  const responsabilidades = todas.filter((d) => d.categoria === "responsabilidad");

  const saldoCOP = cuentas.filter((c) => c.moneda === "COP").reduce((s, c) => s + c.saldo, 0);
  const saldoUSD = cuentas.filter((c) => c.moneda === "USD").reduce((s, c) => s + c.saldo, 0);
  const saldoTotal = tasa != null ? saldoCOP + saldoUSD * tasa : null;

  return (
    <main>
      <div className="panel-header">
        <h1>Hola, {user.nombre}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <NuevaDeudaBoton />
          <Link className="boton" href="/finanzas">
            Finanzas
          </Link>
        </div>
      </div>

      <div className="card resumen">
        <div>
          <span className="muted">Saldo total</span>
          <strong className="monto">
            {saldoTotal != null ? cop.format(saldoTotal) : cop.format(saldoCOP)}
          </strong>
          {saldoUSD > 0 && (
            <span className="muted">
              {tasa != null
                ? `incluye ${usd.format(saldoUSD)} (TRM ${cop.format(tasa)})`
                : `+ ${usd.format(saldoUSD)} en dólares`}
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <h2>Deudas</h2>
        {deudas.length === 0 ? (
          <p className="muted">No tienes deudas registradas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Acreedor</th>
                <th>Frecuencia</th>
                <th>Inicial</th>
                <th>Actual</th>
              </tr>
            </thead>
            <tbody>
              {deudas.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link className="deuda-link" href={`/deudas/${d.id}`}>
                      {d.descripcion}
                    </Link>{" "}
                    {d.es_propia ? (
                      <span className="badge propia">propia</span>
                    ) : (
                      <span className="badge compartida">de {d.dueno}</span>
                    )}
                  </td>
                  <td>{d.acreedor ?? "—"}</td>
                  <td>{d.frecuencia_pago ?? "—"}</td>
                  <td className="monto">{cop.format(d.monto_inicial)}</td>
                  <td className="monto">{cop.format(d.monto_actual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>Responsabilidades (pagos permanentes)</h2>
        {responsabilidades.length === 0 ? (
          <p className="muted">Sin responsabilidades registradas (arriendo, servicios, comida...).</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>A quién</th>
                <th>Frecuencia</th>
                <th>Valor estimado</th>
                <th>Pagado histórico</th>
              </tr>
            </thead>
            <tbody>
              {responsabilidades.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link className="deuda-link" href={`/deudas/${d.id}`}>
                      {d.descripcion}
                    </Link>{" "}
                    {!d.es_propia && <span className="badge compartida">de {d.dueno}</span>}
                  </td>
                  <td>{d.acreedor ?? "—"}</td>
                  <td>{d.frecuencia_pago ?? "—"}</td>
                  <td className="monto">
                    {d.valor_estimado != null ? cop.format(d.valor_estimado) : "variable"}
                  </td>
                  <td className="monto">{cop.format(d.total_pagado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

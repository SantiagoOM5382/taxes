import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listDeudas } from "@/lib/deudas";
import { listCuentas, ensureCuentaEfectivo } from "@/lib/finanzas";
import { getTasasCOP } from "@/lib/tasas";
import NuevaDeudaBoton from "@/components/NuevaDeudaBoton";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
function fmtMoneda(moneda: string, valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 2,
  }).format(valor);
}

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");

  await ensureCuentaEfectivo(user.id);
  const [todas, todasCuentas, tasas] = await Promise.all([
    listDeudas(user.id),
    listCuentas(user.id),
    getTasasCOP(),
  ]);
  const cuentas = todasCuentas.filter((c) => c.estado !== "archivada");
  const deudas = todas.filter((d) => d.categoria === "deuda" && d.es_propia);
  const responsabilidades = todas.filter(
    (d) => d.categoria === "responsabilidad" && d.es_propia
  );
  const compartidas = todas.filter((d) => !d.es_propia);

  const saldoCOP = cuentas.filter((c) => c.moneda === "COP").reduce((s, c) => s + c.saldo, 0);
  const saldoUSD = cuentas.filter((c) => c.moneda === "USD").reduce((s, c) => s + c.saldo, 0);
  const saldoEUR = cuentas.filter((c) => c.moneda === "EUR").reduce((s, c) => s + c.saldo, 0);

  // Suma todo lo convertible; las monedas sin tasa disponible se muestran aparte
  const saldoTotal =
    saldoCOP +
    (tasas.usd != null ? saldoUSD * tasas.usd : 0) +
    (tasas.eur != null ? saldoEUR * tasas.eur : 0);
  const extranjeras = [
    saldoUSD > 0 &&
      (tasas.usd != null
        ? `${fmtMoneda("USD", saldoUSD)} (TRM ${cop.format(tasas.usd)})`
        : `${fmtMoneda("USD", saldoUSD)} aparte`),
    saldoEUR > 0 &&
      (tasas.eur != null
        ? `${fmtMoneda("EUR", saldoEUR)} (a ${cop.format(tasas.eur)})`
        : `${fmtMoneda("EUR", saldoEUR)} aparte`),
  ].filter(Boolean);
  const deudaTotal = deudas.reduce((s, d) => s + d.monto_actual, 0);

  const tarjetas = cuentas.filter((c) => c.es_credito && c.limite_credito != null);
  const cupoTotal = tarjetas.reduce((s, c) => s + (c.limite_credito ?? 0), 0);
  const cupoDisponible = tarjetas.reduce((s, c) => s + Math.max(0, c.saldo), 0);
  const cupoUsado = cupoTotal - cupoDisponible;
  const pctUsado = cupoTotal > 0 ? Math.round((cupoUsado / cupoTotal) * 100) : 0;

  return (
    <main>
      <div className="panel-header">
        <h1>Hola, {user.nombre}</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <NuevaDeudaBoton />
          <Link className="boton" href="/asesor">
            🤖 Asesor IA
          </Link>
          <Link className="boton" href="/finanzas">
            Finanzas
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        {/* Saldo total */}
        <div className="kpi-card" style={{ borderLeftColor: "#22c55e" }}>
          <div className="kpi-label">💰 Saldo total</div>
          <div className="kpi-value">{cop.format(saldoTotal)}</div>
          {extranjeras.length > 0 && (
            <div className="kpi-sub">incluye {extranjeras.join(" y ")}</div>
          )}
        </div>

        {/* Deuda total */}
        <div className="kpi-card" style={{ borderLeftColor: deudaTotal > 0 ? "#ef4444" : "#22c55e" }}>
          <div className="kpi-label">⚠️ Deuda total</div>
          <div className="kpi-value" style={{ color: deudaTotal > 0 ? "#b91c1c" : "#166534" }}>
            {cop.format(deudaTotal)}
          </div>
          {deudaTotal === 0 && <div className="kpi-sub">¡Sin deudas! 🎉</div>}
        </div>

        {/* Crédito disponible — solo si hay tarjetas */}
        {cupoTotal > 0 && (
          <div className="kpi-card" style={{ borderLeftColor: "#3b82f6" }}>
            <div className="kpi-label">💳 Crédito disponible</div>
            <div className="kpi-value" style={{ color: pctUsado > 80 ? "#b91c1c" : "#0f172a" }}>
              {cop.format(cupoDisponible)}
            </div>
            <div className="kpi-sub">{pctUsado}% utilizado de {cop.format(cupoTotal)}</div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${pctUsado}%`,
                  background: pctUsado > 80 ? "#ef4444" : pctUsado > 50 ? "#f59e0b" : "#3b82f6",
                }}
              />
            </div>
          </div>
        )}
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
                    </Link>
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
                    </Link>
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

      <div className="card">
        <h2>Deudas compartidas conmigo</h2>
        {compartidas.length === 0 ? (
          <p className="muted">Nadie te ha compartido el seguimiento de una deuda todavía.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Dueño</th>
                <th>Frecuencia</th>
                <th>Inicial / estimado</th>
                <th>Actual / pagado</th>
              </tr>
            </thead>
            <tbody>
              {compartidas.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link className="deuda-link" href={`/deudas/${d.id}`}>
                      {d.descripcion}
                    </Link>{" "}
                    {d.categoria === "responsabilidad" && (
                      <span className="badge responsabilidad">responsabilidad</span>
                    )}
                  </td>
                  <td>{d.dueno}</td>
                  <td>{d.frecuencia_pago ?? "—"}</td>
                  <td className="monto">
                    {d.categoria === "deuda"
                      ? cop.format(d.monto_inicial)
                      : d.valor_estimado != null
                        ? cop.format(d.valor_estimado)
                        : "variable"}
                  </td>
                  <td className="monto">
                    {d.categoria === "deuda"
                      ? cop.format(d.monto_actual)
                      : cop.format(d.total_pagado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}

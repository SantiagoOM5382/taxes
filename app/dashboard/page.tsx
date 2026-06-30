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
      <div className="panel-header" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
          Hola, {user.nombre} 👋
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <NuevaDeudaBoton />
          <Link className="boton" href="/asesor" style={{ background: "#7c3aed" }}>
            🤖 Asesor IA
          </Link>
          <Link className="boton" href="/finanzas" style={{ background: "#0f172a", border: "1px solid #334155" }}>
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
        <div className="section-header">
          <h2>Deudas</h2>
          {deudas.length > 0 && <span className="section-count">({deudas.length})</span>}
        </div>
        {deudas.length === 0 ? (
          <div className="empty-state">No tenés deudas registradas ✓</div>
        ) : (
          <div className="items-grid">
            {deudas.map((d) => {
              const pct = d.monto_inicial > 0
                ? Math.round(((d.monto_inicial - d.monto_actual) / d.monto_inicial) * 100)
                : 100;
              return (
                <Link key={d.id} className="item-card" href={`/deudas/${d.id}`}>
                  <div className="item-card-header">
                    <div>
                      <div className="item-name">{d.descripcion}</div>
                      {d.acreedor && <div className="item-sub">{d.acreedor}</div>}
                    </div>
                    <div className="item-amount" style={{ color: "#b91c1c" }}>
                      {cop.format(d.monto_actual)}
                    </div>
                  </div>
                  {d.frecuencia_pago && (
                    <span className="freq-badge freq-deuda">{d.frecuencia_pago}</span>
                  )}
                  <div className="progress-bar" style={{ marginTop: 10 }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${pct}%`, background: "#22c55e" }}
                    />
                  </div>
                  <div className="item-progress-label">{pct}% pagado</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Responsabilidades</h2>
          {responsabilidades.length > 0 && (
            <span className="section-count">({responsabilidades.length})</span>
          )}
        </div>
        {responsabilidades.length === 0 ? (
          <div className="empty-state">Sin responsabilidades registradas</div>
        ) : (
          <div className="items-grid">
            {responsabilidades.map((d) => (
              <Link key={d.id} className="item-card" href={`/deudas/${d.id}`}>
                <div className="item-card-header">
                  <div>
                    <div className="item-name">{d.descripcion}</div>
                    {d.acreedor && <div className="item-sub">{d.acreedor}</div>}
                  </div>
                  <div>
                    <div className="item-amount" style={{ color: "#0f172a" }}>
                      {d.valor_estimado != null ? cop.format(d.valor_estimado) : "variable"}
                    </div>
                    <div className="item-progress-label" style={{ textAlign: "right" }}>
                      pagado: {cop.format(d.total_pagado)}
                    </div>
                  </div>
                </div>
                {d.frecuencia_pago && (
                  <span className="freq-badge freq-resp">{d.frecuencia_pago}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="section-header">
          <h2>Deudas compartidas conmigo</h2>
          {compartidas.length > 0 && (
            <span className="section-count">({compartidas.length})</span>
          )}
        </div>
        {compartidas.length === 0 ? (
          <div className="empty-state">Nadie te ha compartido una deuda todavía</div>
        ) : (
          <div className="items-grid">
            {compartidas.map((d) => (
              <Link key={d.id} className="item-card" href={`/deudas/${d.id}`}>
                <div className="item-card-header">
                  <div>
                    <div className="item-name">{d.descripcion}</div>
                    <div className="item-sub">de {d.dueno}</div>
                  </div>
                  <div className="item-amount" style={{ color: d.categoria === "deuda" ? "#b91c1c" : "#0f172a" }}>
                    {d.categoria === "deuda"
                      ? cop.format(d.monto_actual)
                      : d.valor_estimado != null
                        ? cop.format(d.valor_estimado)
                        : "variable"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  {d.frecuencia_pago && (
                    <span className={`freq-badge ${d.categoria === "deuda" ? "freq-deuda" : "freq-resp"}`}>
                      {d.frecuencia_pago}
                    </span>
                  )}
                  {d.categoria === "responsabilidad" && (
                    <span className="badge responsabilidad">responsabilidad</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

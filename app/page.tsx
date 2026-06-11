import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listDeudas } from "@/lib/deudas";
import { listCuentas } from "@/lib/finanzas";
import NuevaDeuda from "@/components/NuevaDeuda";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [todas, cuentas] = await Promise.all([listDeudas(user.id), listCuentas(user.id)]);
  const deudas = todas.filter((d) => d.categoria === "deuda");
  const responsabilidades = todas.filter((d) => d.categoria === "responsabilidad");

  const totalActual = deudas
    .filter((d) => d.es_propia)
    .reduce((sum, d) => sum + d.monto_actual, 0);
  const saldoCOP = cuentas.filter((c) => c.moneda === "COP").reduce((s, c) => s + c.saldo, 0);

  return (
    <main>
      <h1>Hola, {user.nombre}</h1>

      <div className="card resumen">
        <div>
          <span className="muted">Deuda total actual</span>
          <strong className="monto">{cop.format(totalActual)}</strong>
        </div>
        <div>
          <span className="muted">Saldo total en cuentas (COP)</span>
          <strong className="monto">{cop.format(saldoCOP)}</strong>
        </div>
        <div>
          <span className="muted">Responsabilidades</span>
          <strong>{responsabilidades.length}</strong>
        </div>
        <div>
          <Link href="/finanzas">Ir a Mis Finanzas →</Link>
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

      <NuevaDeuda />
    </main>
  );
}

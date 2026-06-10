import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listDeudas } from "@/lib/deudas";
import NuevaDeuda from "@/components/NuevaDeuda";

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export default async function Home() {
  const user = await getSession();
  if (!user) redirect("/login");

  const deudas = await listDeudas(user.id);
  const totalActual = deudas
    .filter((d) => d.es_propia)
    .reduce((sum, d) => sum + d.monto_actual, 0);

  return (
    <main>
      <h1>Hola, {user.nombre}</h1>

      <div className="card resumen">
        <div>
          <span className="muted">Deuda total actual (propias)</span>
          <strong className="monto">{cop.format(totalActual)}</strong>
        </div>
        <div>
          <span className="muted">Deudas visibles</span>
          <strong>{deudas.length}</strong>
        </div>
      </div>

      <div className="card">
        <h2>Mis deudas</h2>
        {deudas.length === 0 ? (
          <p className="muted">Aún no tienes deudas registradas.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Acreedor</th>
                <th>Inicial</th>
                <th>Actual</th>
                <th></th>
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
                  <td className="monto">{cop.format(d.monto_inicial)}</td>
                  <td className="monto">{cop.format(d.monto_actual)}</td>
                  <td>
                    <Link href={`/deudas/${d.id}`}>Ver</Link>
                  </td>
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

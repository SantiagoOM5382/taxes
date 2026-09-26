import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div style={{ maxWidth: 480, margin: "12vh auto", padding: "0 16px" }}>
      <h1>No encontramos esta página</h1>
      <p className="page-sub">
        Puede que la deuda se haya eliminado o que no tengas acceso a ella.
      </p>
      <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 20 }}>
        Volver al resumen
      </Link>
    </div>
  );
}

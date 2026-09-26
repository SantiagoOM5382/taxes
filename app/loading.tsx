export default function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="skeleton" style={{ height: 40, width: 260, marginBottom: 28 }} />
      <div className="skeleton" style={{ height: 150, marginBottom: 20 }} />
      <div className="columns">
        <div className="skeleton" style={{ height: 260 }} />
        <div className="skeleton" style={{ height: 260 }} />
      </div>
    </div>
  );
}

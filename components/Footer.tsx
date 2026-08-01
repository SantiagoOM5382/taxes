import "./Footer.css";

interface FooterProps {
  user: { id: string; nombre: string };
}

export default function Footer({ user }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h4>Mis Deudas</h4>
          <p>Gestión inteligente de tu salud financiera</p>
        </div>
        <div className="footer-section">
          <h4>Usuario</h4>
          <p className="footer-user">
            <span className="user-badge">{user.nombre.charAt(0).toUpperCase()}</span>
            {user.nombre}
          </p>
        </div>
        <div className="footer-section">
          <h4>Recursos</h4>
          <ul className="footer-links">
            <li><a href="/calendario">Calendario</a></li>
            <li><a href="/finanzas">Finanzas</a></li>
            <li><a href="/asesor">Asesor IA</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {currentYear} Mis Deudas. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

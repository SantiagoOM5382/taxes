import "./globals.css";
import Link from "next/link";
import { getSession } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

export const metadata = { title: "Mis Deudas" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return (
    <html lang="es">
      <body>
        <header className="topbar">
          <Link href="/">💰 Mis Deudas</Link>
          {user && (
            <div className="user">
              <Link href="/asesor">Asesor IA</Link>
              <Link href="/dashboard">Mis Deudas</Link>
              <Link href="/finanzas">Mis Finanzas</Link>
              <Link href="/calendario">Calendario</Link>
              <span>{user.nombre}</span>
              <LogoutButton />
            </div>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}

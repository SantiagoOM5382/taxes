import "./globals.css";
import { getSession } from "@/lib/session";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

export const metadata = { title: "Mis Deudas" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  return (
    <html lang="es">
      <body>
        {user ? (
          <div className="app-layout">
            <Navigation user={user} />
            <main className="app-main">
              {children}
            </main>
            <Footer user={user} />
          </div>
        ) : (
          <>
            {children}
          </>
        )}
      </body>
    </html>
  );
}

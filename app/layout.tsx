import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSession } from "@/lib/session";
import Navigation from "@/components/Navigation";

// Fuente autoalojada (variable 400–900): no depende de Google Fonts al compilar
const schibsted = localFont({
  src: "../node_modules/@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2",
  weight: "400 900",
  variable: "--font-schibsted",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Mis Deudas", template: "%s · Mis Deudas" },
  description: "Lo que tienes, lo que debes y lo que vence este mes, en un solo lugar.",
};

export const viewport: Viewport = {
  themeColor: "#17262b",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();

  return (
    <html lang="es" className={schibsted.variable}>
      <body>
        {user ? (
          <div className="shell">
            <Navigation nombre={user.nombre} />
            <main className="main">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}

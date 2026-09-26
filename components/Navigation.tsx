"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarDays, Wallet, Sparkles, LogOut } from "lucide-react";
import BrandMark from "./BrandMark";

const NAV = [
  { href: "/dashboard", label: "Resumen", icon: LayoutDashboard, match: ["/dashboard", "/deudas"] },
  { href: "/calendario", label: "Calendario", icon: CalendarDays, match: ["/calendario"] },
  { href: "/finanzas", label: "Finanzas", icon: Wallet, match: ["/finanzas"] },
  { href: "/asesor", label: "Asesor", icon: Sparkles, match: ["/asesor"] },
];

export default function Navigation({ nombre }: { nombre: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const activo = (match: string[]) => match.some((m) => pathname === m || pathname.startsWith(m + "/"));

  async function salir() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <aside className="rail">
        <Link href="/dashboard" className="brand">
          <BrandMark />
          Mis Deudas
        </Link>

        <nav className="rail-nav" aria-label="Principal">
          {NAV.map(({ href, label, icon: Icon, match }) => (
            <Link
              key={href}
              href={href}
              className="rail-link"
              aria-current={activo(match) ? "page" : undefined}
            >
              <Icon size={19} strokeWidth={2} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>

        <div className="rail-user">
          <span className="avatar" aria-hidden>
            {nombre.charAt(0).toUpperCase()}
          </span>
          <span className="rail-user-name">{nombre}</span>
          <button className="rail-logout" onClick={salir} title="Cerrar sesión" aria-label="Cerrar sesión">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <header className="topbar">
        <Link href="/dashboard" className="brand">
          <BrandMark />
          Mis Deudas
        </Link>
        <button className="rail-logout" onClick={salir} aria-label="Cerrar sesión">
          <LogOut size={18} />
        </button>
      </header>

      <nav className="tabbar" aria-label="Principal">
        {NAV.map(({ href, label, icon: Icon, match }) => (
          <Link
            key={href}
            href={href}
            className="tab-link"
            aria-current={activo(match) ? "page" : undefined}
          >
            <Icon size={21} strokeWidth={2} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}

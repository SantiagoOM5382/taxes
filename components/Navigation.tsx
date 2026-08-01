"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Home, Calendar, TrendingUp, Zap, LogOut } from "lucide-react";
import LogoutButton from "./LogoutButton";
import "./Navigation.css";

interface NavigationProps {
  user: { id: string; nombre: string };
}

export default function Navigation({ user }: NavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/calendario", label: "Calendario", icon: Calendar },
    { href: "/finanzas", label: "Finanzas", icon: TrendingUp },
    { href: "/asesor", label: "Asesor IA", icon: Zap },
  ];

  return (
    <>
      {/* Sidebar Desktop */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <Link href="/dashboard" className="logo">
            <span className="logo-dot">·</span>
            <span className="logo-text">Mis Deudas</span>
          </Link>
        </div>

        <div className="nav-menu">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive(href) ? "active" : ""}`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-section">
            <div className="avatar">{user.nombre.charAt(0).toUpperCase()}</div>
            <div className="user-info">
              <div className="user-name">{user.nombre}</div>
              <div className="user-id">ID: {user.id}</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </nav>

      {/* Mobile Navigation Toggle */}
      <button
        className="mobile-nav-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      {isOpen && (
        <nav className="sidebar-mobile">
          <div className="sidebar-header">
            <Link href="/dashboard" className="logo" onClick={() => setIsOpen(false)}>
              <span className="logo-dot">·</span>
              <span className="logo-text">Mis Deudas</span>
            </Link>
          </div>

          <div className="nav-menu">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive(href) ? "active" : ""}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            ))}
          </div>

          <div className="sidebar-footer">
            <div className="user-section">
              <div className="avatar">{user.nombre.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <div className="user-name">{user.nombre}</div>
                <div className="user-id">ID: {user.id}</div>
              </div>
            </div>
            <LogoutButton />
          </div>
        </nav>
      )}
    </>
  );
}

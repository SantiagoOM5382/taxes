"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al iniciar sesión");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 400 }}>
      <div className="card">
        <h1>Iniciar sesión</h1>
        <form onSubmit={onSubmit}>
          <label>Email</label>
          <input name="email" type="email" required />
          <label>Contraseña</label>
          <input name="password" type="password" required />
          {error && <p className="error">{error}</p>}
          <button disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
        </form>
        <p className="muted" style={{ marginTop: 12 }}>
          ¿No tienes cuenta? <Link href="/register">Regístrate</Link>
        </p>
      </div>
    </main>
  );
}

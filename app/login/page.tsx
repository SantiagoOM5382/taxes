"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Field from "@/components/Field";

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
    }).catch(() => null);
    if (!res?.ok) {
      setLoading(false);
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo iniciar sesión. Revisa tu conexión.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell>
      <h1>Inicia sesión</h1>
      <p className="page-sub">Entra para ver cómo van tus cuentas.</p>
      <form onSubmit={onSubmit}>
        <Field label="Correo">
          <input name="email" type="email" placeholder="nombre@correo.com" required autoComplete="email" autoFocus />
        </Field>
        <Field label="Contraseña">
          <input name="password" type="password" required autoComplete="current-password" />
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ minHeight: 46 }}>
          {loading ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>
      <p className="auth-switch">
        ¿No tienes cuenta? <Link href="/register">Crea una gratis</Link>
      </p>
    </AuthShell>
  );
}

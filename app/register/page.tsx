"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import Field from "@/components/Field";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.get("nombre"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    }).catch(() => null);
    if (!res?.ok) {
      setLoading(false);
      const data = await res?.json().catch(() => ({}));
      setError(data?.error ?? "No se pudo crear la cuenta. Revisa tu conexión.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell>
      <h1>Crea tu cuenta</h1>
      <p className="page-sub">Es gratis. Solo necesitas un correo.</p>
      <form onSubmit={onSubmit}>
        <Field label="Nombre">
          <input name="nombre" type="text" required autoComplete="name" autoFocus />
        </Field>
        <Field label="Correo">
          <input name="email" type="email" placeholder="nombre@correo.com" required autoComplete="email" />
        </Field>
        <Field label="Contraseña" hint="Mínimo 6 caracteres.">
          <input name="password" type="password" minLength={6} required autoComplete="new-password" />
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={loading} className="btn btn-primary btn-block" style={{ minHeight: 46 }}>
          {loading ? "Creando cuenta…" : "Crear cuenta"}
        </button>
      </form>
      <p className="auth-switch">
        ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
      </p>
    </AuthShell>
  );
}

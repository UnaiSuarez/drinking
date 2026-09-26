"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function PasswordRecovery({ enlaceInvalido }: { enlaceInvalido: boolean }) {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (cargando) return;
    setCargando(true);
    setError(null);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/confirm?next=/auth/nueva-password`,
      });
      if (error) {
        setError(error.status === 429
          ? "Demasiados intentos. Espera unos minutos antes de volver a probar."
          : "No se pudo enviar la solicitud. Inténtalo de nuevo más tarde.");
      } else {
        setEnviado(true);
      }
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setCargando(false);
    }
  }

  return <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
    <h1 className="mb-5 font-titulo text-3xl text-ambar">Recuperar contraseña</h1>
    {enlaceInvalido && !enviado && <p role="alert" className="mb-4 text-sm text-rosa">El enlace ha caducado o no es válido. Solicita uno nuevo.</p>}
    {enviado ? <div role="status">
      <h2 className="mb-2 font-titulo text-xl text-cian">Revisa tu correo</h2>
      <p className="text-sm text-texto2">Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña. Revisa también la carpeta de spam y abre el enlace en este navegador.</p>
    </div> : <form onSubmit={enviar} className="space-y-4">
      <label className="block text-sm text-texto2">Correo de tu cuenta
        <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-borde bg-tarjeta px-4 py-3 text-base text-texto" />
      </label>
      {error && <p role="alert" className="text-sm text-rosa">{error}</p>}
      <button type="submit" disabled={cargando} className="min-h-12 w-full rounded-lg bg-ambar px-4 py-3 font-titulo text-fondo disabled:opacity-50">{cargando ? "Enviando..." : "Enviar enlace"}</button>
    </form>}
    <Link href="/login" className="mt-5 flex min-h-11 items-center justify-center text-sm text-cian underline">Volver al inicio de sesión</Link>
  </main>;
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function NewPassword() {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [cargando, setCargando] = useState(false);
  const [guardada, setGuardada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    if (cargando) return;
    setError(null);
    if (password !== confirmacion) { setError("Las contraseñas no coinciden."); return; }
    setCargando(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) {
        setError("No se pudo guardar. Usa una contraseña diferente de al menos 8 caracteres; si el enlace ha caducado, solicita otro.");
      } else {
        setPassword("");
        setConfirmacion("");
        setGuardada(true);
      }
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo otra vez.");
    } finally {
      setCargando(false);
    }
  }

  return <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
    <h1 className="mb-5 font-titulo text-3xl text-ambar">{guardada ? "Contraseña actualizada" : "Nueva contraseña"}</h1>
    {guardada ? <div role="status">
      <p className="mb-4 text-texto2">Ya puedes usar tu nueva contraseña.</p>
      <Link href="/" className="flex min-h-12 items-center justify-center rounded-lg bg-ambar px-4 font-titulo text-fondo">Continuar</Link>
    </div> : <form onSubmit={guardar} className="space-y-4">
      <label className="block text-sm text-texto2">Nueva contraseña
        <input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-borde bg-tarjeta px-4 py-3 text-base text-texto" />
      </label>
      <label className="block text-sm text-texto2">Repetir contraseña
        <input type="password" autoComplete="new-password" minLength={8} required value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} className="mt-2 w-full rounded-lg border border-borde bg-tarjeta px-4 py-3 text-base text-texto" />
      </label>
      {error && <p role="alert" className="text-sm text-rosa">{error}</p>}
      <button type="submit" disabled={cargando} className="min-h-12 w-full rounded-lg bg-ambar px-4 py-3 font-titulo text-fondo disabled:opacity-50">{cargando ? "Guardando..." : "Guardar contraseña"}</button>
      <Link href="/auth/recuperar" className="flex min-h-11 items-center justify-center text-sm text-cian underline">Solicitar otro enlace</Link>
    </form>}
  </main>;
}

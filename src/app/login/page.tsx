"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviarMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setCargando(false);
    if (error) {
      setError("No se pudo enviar el enlace. Prueba de nuevo en un rato.");
    } else {
      setEnviado(true);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <div className="mb-4 text-7xl">🍻</div>
        <h1 className="font-titulo text-5xl text-ambar drop-shadow-[0_0_12px_rgba(255,182,39,0.5)]">
          EL RANKING
        </h1>
        <p className="mt-3 text-texto2">
          ¿Quién bebe más? Que se entere el grupo,
          <br />
          que se ría, y que no se olvide.
        </p>
      </div>

      {enviado ? (
        <div className="w-full max-w-sm rounded-3xl border border-borde bg-tarjeta p-8 text-center glow-cian">
          <div className="mb-3 text-5xl">📬</div>
          <h2 className="font-titulo text-2xl text-cian">¡Revisa tu correo!</h2>
          <p className="mt-2 text-texto2">
            Te hemos enviado un enlace mágico a{" "}
            <span className="text-texto">{email}</span>. Tócalo y estás dentro
            — sin contraseñas.
          </p>
        </div>
      ) : (
        <form
          onSubmit={enviarMagicLink}
          className="w-full max-w-sm rounded-3xl border border-borde bg-tarjeta p-8 glow-ambar"
        >
          <label
            htmlFor="email"
            className="mb-2 block font-titulo text-lg text-texto"
          >
            Tu correo
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="mb-4 w-full rounded-2xl border border-borde bg-fondo px-5 py-4 text-lg text-texto placeholder-texto2 outline-none focus:border-ambar"
          />
          {error && <p className="mb-4 text-sm text-rosa">{error}</p>}
          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-2xl bg-ambar px-6 py-4 font-titulo text-xl text-fondo transition active:scale-95 disabled:opacity-50"
          >
            {cargando ? "Enviando…" : "Entrar con enlace mágico ✨"}
          </button>
          <p className="mt-4 text-center text-xs text-texto2">
            Sin contraseñas. Te llega un enlace al correo y listo.
          </p>
        </form>
      )}
    </main>
  );
}

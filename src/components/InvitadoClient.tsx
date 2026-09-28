"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Estado = "cargando" | "invalida" | "form" | "entrando" | "error";

export default function InvitadoClient({ token }: { token: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [estado, setEstado] = useState<Estado>("cargando");
  const [info, setInfo] = useState<{ salaNombre: string; fecha: string } | null>(null);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      const { data, error } = await supabase.rpc("info_invitacion", { p_token: token });
      if (!activo) return;
      const fila = data?.[0];
      if (error || !fila || !fila.valida) {
        setEstado("invalida");
        return;
      }
      setInfo({ salaNombre: fila.sala_nombre, fecha: fila.noche_fecha });
      setEstado("form");
    })();
    return () => {
      activo = false;
    };
  }, [supabase, token]);

  async function unirme(e: React.FormEvent) {
    e.preventDefault();
    setEstado("entrando");
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const { error: errorAnon } = await supabase.auth.signInAnonymously();
      if (errorAnon) {
        setError("No se pudo crear tu sesión de invitado. Prueba otra vez.");
        setEstado("form");
        return;
      }
    }

    const { data: nocheId, error: errorUnirse } = await supabase.rpc("unirse_como_invitado", {
      p_token: token,
      p_nombre: nombre,
    });
    if (errorUnirse) {
      setError(errorUnirse.message);
      setEstado("form");
      return;
    }
    router.push(`/noche/${nocheId}`);
  }

  if (estado === "cargando") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-texto2">Cargando invitación…</p>
      </main>
    );
  }

  if (estado === "invalida") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="mb-2 font-titulo text-2xl text-rosa">Invitación no válida</p>
        <p className="text-sm text-texto2">
          Puede que la noche ya se haya cerrado o que el enlace esté mal.
          Pide a quien te invitó que te mande uno nuevo.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 pb-10">
      <p className="mb-1 text-center text-sm text-texto2">Te invitan a</p>
      <h1 className="mb-1 text-center font-titulo text-3xl text-ambar">
        {info?.salaNombre}
      </h1>
      {info?.fecha && (
        <p className="mb-6 text-center text-sm text-texto2">
          {new Date(info.fecha).toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
      )}
      <p className="mb-6 text-center text-sm text-texto2">
        Sin crear cuenta: solo para esta noche, en este dispositivo.
      </p>
      <form onSubmit={unirme} className="space-y-3">
        <label className="block text-sm text-texto2">
          Tu nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            minLength={2}
            maxLength={24}
            required
            autoFocus
            className="mt-1 w-full rounded-lg border border-borde bg-tarjeta px-3 py-2 text-texto outline-none focus:border-ambar"
          />
        </label>
        {error && <p role="alert" className="text-sm text-rosa">{error}</p>}
        <button
          type="submit"
          disabled={estado === "entrando"}
          className="w-full rounded-2xl bg-lima py-4 font-titulo text-lg text-fondo active:scale-95 disabled:opacity-50"
        >
          {estado === "entrando" ? "Entrando…" : "🍻 ¡Unirme!"}
        </button>
      </form>
    </main>
  );
}

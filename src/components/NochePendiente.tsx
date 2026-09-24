"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { parseAvatarConfig, type AvatarConfig } from "@/lib/avatar";
import AvatarFramePreview from "@/components/AvatarFramePreview";

type JugadorPendiente = {
  id: string;
  nombre: string;
  avatarConfig: AvatarConfig;
};

const MIN_JUGADORES = 2;

export default function NochePendiente({
  nocheId,
  salaId,
  salaNombre,
  jugadoresIniciales,
  userId,
  esAdmin,
}: {
  nocheId: string;
  salaId: string;
  salaNombre: string;
  jugadoresIniciales: JugadorPendiente[];
  userId: string;
  esAdmin: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [jugadores, setJugadores] = useState(jugadoresIniciales);
  const [uniendome, setUniendome] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unido = jugadores.some((j) => j.id === userId);

  const cargarJugador = useCallback(
    async (id: string) => {
      const { data } = await supabase
        .from("perfiles")
        .select("id, nombre, avatar_config")
        .eq("id", id)
        .single();
      if (data) {
        setJugadores((prev) =>
          prev.some((j) => j.id === data.id)
            ? prev
            : [
                ...prev,
                {
                  id: data.id,
                  nombre: data.nombre,
                  avatarConfig: parseAvatarConfig(data.avatar_config),
                },
              ]
        );
      }
    },
    [supabase]
  );

  useEffect(() => {
    const canal = supabase
      .channel(`noche-pendiente-${nocheId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "noche_jugadores",
          filter: `noche_id=eq.${nocheId}`,
        },
        (payload) => {
          const nuevo = payload.new as { usuario_id: string };
          cargarJugador(nuevo.usuario_id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "noches",
          filter: `id=eq.${nocheId}`,
        },
        (payload) => {
          const actualizada = payload.new as { estado: string };
          if (actualizada.estado !== "pendiente") router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "noches",
          filter: `id=eq.${nocheId}`,
        },
        () => router.push(`/sala/${salaId}`)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, nocheId, salaId, router, cargarJugador]);

  async function unirme() {
    setUniendome(true);
    setError(null);
    const { error } = await supabase
      .from("noche_jugadores")
      .insert({ noche_id: nocheId, usuario_id: userId });
    setUniendome(false);
    if (error) {
      setError("No se pudo unir. Inténtalo otra vez.");
      return;
    }
    cargarJugador(userId);

    // Si este "unirme" es el que ha hecho que la noche pase de pendiente a
    // activa (el trigger de la base de datos ya lo habrá resuelto para
    // cuando este insert termina), avisamos al resto de la sala.
    const { data: nocheActual } = await supabase
      .from("noches")
      .select("estado")
      .eq("id", nocheId)
      .single();
    if (nocheActual?.estado === "activa") {
      fetch("/api/notificar-noche-activada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nocheId }),
      }).catch((err) => {
        console.error("notificar-noche-activada:", err);
      });
    }
  }

  async function cancelar() {
    setCancelando(true);
    setError(null);
    const { error } = await supabase.rpc("cancelar_noche_pendiente", {
      p_noche: nocheId,
    });
    setCancelando(false);
    if (error) {
      setError("No se pudo cancelar.");
      return;
    }
    router.push(`/sala/${salaId}`);
  }

  const faltan = Math.max(0, MIN_JUGADORES - jugadores.length);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <Link href={`/sala/${salaId}`} className="text-sm text-texto2">
        ← {salaNombre}
      </Link>

      <div className="mt-6 mb-8 rounded-3xl border-2 border-ambar bg-tarjeta p-6 text-center">
        <p className="font-titulo text-3xl text-ambar">⏳ NOCHE PENDIENTE</p>
        <p className="mt-2 text-sm text-texto2">
          {faltan > 0
            ? `Falta${faltan === 1 ? "" : "n"} ${faltan} persona${
                faltan === 1 ? "" : "s"
              } para que arranque de verdad.`
            : "¡Ya sois suficientes! Arrancando…"}
        </p>
      </div>

      {error && (
        <p className="mb-4 text-center text-sm text-rosa">{error}</p>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-titulo text-xl text-texto">
          Ya se han unido ({jugadores.length})
        </h2>
        {jugadores.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
            Todavía nadie se ha unido 👀
          </p>
        ) : (
          <ul className="space-y-2">
            {jugadores.map((j) => (
              <li
                key={j.id}
                className="flex items-center gap-2 rounded-2xl border border-borde bg-tarjeta px-4 py-3 text-texto"
              >
                <AvatarFramePreview
                  config={j.avatarConfig}
                  titulo={j.nombre}
                  triggerClassName="h-9 w-9"
                  previewClassName="h-72 w-72"
                  asSpan
                />
                <span>
                  {j.nombre}
                  {j.id === userId && (
                    <span className="ml-1 text-xs text-texto2">(tú)</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!unido && (
        <button
          onClick={unirme}
          disabled={uniendome}
          className="mb-4 w-full rounded-3xl bg-lima p-6 font-titulo text-2xl text-fondo transition active:scale-95 disabled:opacity-50"
        >
          🍻 ¡UNIRME!
        </button>
      )}

      {esAdmin && (
        <button
          onClick={cancelar}
          disabled={cancelando}
          className="w-full rounded-2xl border border-rosa py-3 text-sm text-rosa active:scale-95 disabled:opacity-50"
        >
          {cancelando ? "Cancelando…" : "Cancelar esta noche"}
        </button>
      )}
    </main>
  );
}

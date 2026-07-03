"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { calcularDivision } from "@/lib/liga";

export type Miembro = { id: string; nombre: string; rol: string };
export type NocheResumen = {
  id: string;
  inicio: string;
  ganador: string | null;
  jugadores: number;
};
export type EntradaLiga = { usuarioId: string; nombre: string; pl: number };

const DURACIONES = [
  { horas: 4, etiqueta: "4 horas" },
  { horas: 6, etiqueta: "6 horas" },
  { horas: 8, etiqueta: "8 horas" },
  { horas: 12, etiqueta: "12 horas" },
];

export default function SalaView({
  sala,
  miembros,
  miRol,
  userId,
  nocheActiva,
  nochesCerradas,
  temporada,
  liga,
}: {
  sala: { id: string; nombre: string; codigo: string };
  miembros: Miembro[];
  miRol: string;
  userId: string;
  nocheActiva: { id: string } | null;
  nochesCerradas: NocheResumen[];
  temporada: { id: string; nombre: string; fin: string } | null;
  liga: EntradaLiga[];
}) {
  const router = useRouter();
  const [eligiendoDuracion, setEligiendoDuracion] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const esAdmin = miRol === "fundador" || miRol === "admin";

  async function compartirCodigo() {
    const texto = `¡Únete a "${sala.nombre}" en El Ranking! 🍻 Código: ${sala.codigo}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: texto });
        return;
      } catch {
        // cancelado por el usuario
      }
    } else {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  async function iniciarNoche(horas: number) {
    setCargando(true);
    const supabase = createClient();
    const fin = new Date(Date.now() + horas * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from("noches")
      .insert({ sala_id: sala.id, creada_por: userId, fin_programado: fin })
      .select("id")
      .single();
    setCargando(false);
    if (!error && data) {
      router.push(`/noche/${data.id}`);
    }
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <header className="mb-6">
        <Link href="/" className="text-sm text-texto2">
          ← Tus salas
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <h1 className="font-titulo text-3xl text-texto">{sala.nombre}</h1>
          <button
            onClick={compartirCodigo}
            className="rounded-xl border border-cian px-3 py-2 text-sm text-cian active:scale-95"
          >
            {copiado ? "¡Copiado!" : `${sala.codigo} 📤`}
          </button>
        </div>
      </header>

      {nocheActiva ? (
        <Link
          href={`/noche/${nocheActiva.id}`}
          className="mb-8 block rounded-3xl bg-ambar p-6 text-center transition active:scale-[0.98] pulso-neon"
        >
          <span className="font-titulo text-2xl text-fondo">
            🌙 NOCHE EN CURSO
          </span>
          <p className="text-sm font-semibold text-fondo/70">
            Toca para entrar y registrar
          </p>
        </Link>
      ) : eligiendoDuracion ? (
        <div className="mb-8 rounded-3xl border border-borde bg-tarjeta p-6">
          <h3 className="mb-4 font-titulo text-lg text-ambar">
            ¿Cuánto va a durar la noche?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {DURACIONES.map((d) => (
              <button
                key={d.horas}
                disabled={cargando}
                onClick={() => iniciarNoche(d.horas)}
                className="rounded-2xl border-2 border-ambar py-4 font-titulo text-lg text-ambar transition active:scale-95 disabled:opacity-50"
              >
                {d.etiqueta}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-texto2">
            Se cierra sola al acabar el tiempo, o antes si la cierra un admin.
          </p>
          <button
            onClick={() => setEligiendoDuracion(false)}
            className="mt-3 w-full rounded-2xl border border-borde py-3 text-texto2 active:scale-95"
          >
            Cancelar
          </button>
        </div>
      ) : esAdmin ? (
        <button
          onClick={() => setEligiendoDuracion(true)}
          className="mb-8 w-full rounded-3xl bg-ambar p-6 font-titulo text-2xl text-fondo transition active:scale-[0.98] glow-ambar"
        >
          🌙 Iniciar noche
        </button>
      ) : (
        <div className="mb-8 rounded-3xl border border-borde bg-tarjeta p-6 text-center">
          <p className="text-texto2">
            😴 No hay noche activa. Un admin puede iniciarla.
          </p>
        </div>
      )}

      {/* Liga de la temporada */}
      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-titulo text-xl text-texto">🏆 Liga</h2>
          {temporada && (
            <span className="text-xs text-texto2">
              {temporada.nombre} · acaba el{" "}
              {new Date(temporada.fin).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
        {liga.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
            La liga arranca con vuestra primera noche 🌙
          </p>
        ) : (
          <ul className="space-y-2">
            {liga.map((e, i) => {
              const div = calcularDivision(e.pl, i === 0);
              return (
                <li key={e.usuarioId}>
                  <Link
                    href={`/perfil/${e.usuarioId}`}
                    className={`flex items-center justify-between rounded-2xl border bg-tarjeta px-4 py-3 transition active:scale-[0.98] ${
                      i === 0 && e.pl > 0 ? "border-oro" : "border-borde"
                    }`}
                  >
                    <span className="text-texto">
                      <span className="mr-2 font-titulo text-texto2">
                        {i + 1}.
                      </span>
                      {e.nombre}
                      {e.usuarioId === userId && (
                        <span className="ml-1 text-xs text-texto2">(tú)</span>
                      )}
                      <span className={`ml-2 text-xs ${div.color}`}>
                        {div.icono} {div.nombre}
                      </span>
                    </span>
                    <span className="font-titulo text-lima">{e.pl} PL</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-titulo text-xl text-texto">
          Miembros ({miembros.length})
        </h2>
        <ul className="space-y-2">
          {miembros.map((m) => (
            <li key={m.id}>
              <Link
                href={`/perfil/${m.id}`}
                className="flex items-center justify-between rounded-2xl border border-borde bg-tarjeta px-4 py-3 transition active:scale-[0.98]"
              >
                <span className="text-texto">
                  {m.nombre}
                  {m.id === userId && (
                    <span className="ml-2 text-xs text-texto2">(tú)</span>
                  )}
                </span>
                {m.rol !== "miembro" && (
                  <span className="rounded-full bg-fondo px-2 py-1 text-xs text-ambar">
                    {m.rol === "fundador" ? "👑 fundador" : "⭐ admin"}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-titulo text-xl text-texto">
          Últimas noches
        </h2>
        {nochesCerradas.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
            Aún no hay historia que contar… 📖
          </p>
        ) : (
          <ul className="space-y-2">
            {nochesCerradas.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/noche/${n.id}/podio`}
                  className="flex items-center justify-between rounded-2xl border border-borde bg-tarjeta px-4 py-3 transition active:scale-[0.98]"
                >
                  <div>
                    <span className="text-sm text-texto">
                      {new Date(n.inicio).toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <p className="text-xs text-texto2">
                      {n.jugadores} jugadores
                    </p>
                  </div>
                  {n.ganador && (
                    <span className="text-sm text-oro">🏆 {n.ganador}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

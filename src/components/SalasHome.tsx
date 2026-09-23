"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type SalaResumen = {
  id: string;
  nombre: string;
  codigo: string;
  rol: string;
  nocheActivaId: string | null;
};

export default function SalasHome({
  nombreUsuario,
  salas,
}: {
  nombreUsuario: string;
  salas: SalaResumen[];
}) {
  const router = useRouter();
  const [modo, setModo] = useState<"ninguno" | "crear" | "unirse">("ninguno");
  const [nombreSala, setNombreSala] = useState("");
  const [tipoSala, setTipoSala] = useState<"normal" | "temporada" | "permanente">(
    "normal"
  );
  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crearSala(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("crear_sala", {
      p_nombre: nombreSala.trim(),
      p_tipo: tipoSala,
    });
    setCargando(false);
    if (error || !data) {
      setError("No se pudo crear la sala.");
      return;
    }
    router.push(`/sala/${data.id}`);
  }

  async function unirseSala(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("unirse_sala", {
      p_codigo: codigo.trim(),
    });
    setCargando(false);
    if (error || !data) {
      setError("Código no válido. Revísalo con tu grupo.");
      return;
    }
    router.push(`/sala/${data.id}`);
  }

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-titulo text-3xl text-ambar">EL RANKING 🍻</h1>
          <p className="text-sm text-texto2">Hola, {nombreUsuario} 👋</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/retos"
            className="rounded-xl border border-cian px-3 py-2 text-xs text-cian active:scale-95"
          >
            🎯 Retos
          </Link>
          <Link
            href="/tienda"
            className="rounded-xl border border-ambar px-3 py-2 text-xs text-ambar active:scale-95"
          >
            Tienda
          </Link>
          <button
            onClick={cerrarSesion}
            className="rounded-xl border border-borde px-3 py-2 text-xs text-texto2 active:scale-95"
          >
            Salir
          </button>
        </div>
      </header>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-titulo text-xl text-texto">Tus salas</h2>
          {salas.length > 0 && (
            <Link
              href="/estadisticas"
              className="inline-flex items-center gap-1.5 rounded-full border border-lima/50 bg-lima/10 px-3 py-1.5 text-xs font-semibold text-lima transition active:scale-95"
            >
              📊 Comparativa
            </Link>
          )}
        </div>
        {salas.length === 0 ? (
          <div className="rounded-3xl border border-borde bg-tarjeta p-8 text-center">
            <div className="mb-2 text-5xl">🏚️</div>
            <p className="text-texto2">
              Bar cerrado… todavía. Crea una sala o únete a la de tu grupo.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {salas.map((sala) => (
              <li key={sala.id}>
                <Link
                  href={`/sala/${sala.id}`}
                  className={`flex items-center justify-between rounded-3xl border p-5 transition active:scale-[0.98] ${
                    sala.nocheActivaId
                      ? "border-ambar/70 bg-gradient-to-br from-tarjeta to-ambar/10"
                      : "border-borde bg-tarjeta"
                  }`}
                >
                  <div>
                    <span className="flex items-center gap-2 font-titulo text-xl text-texto">
                      {sala.nombre}
                      {sala.nocheActivaId && (
                        <span className="flex items-center gap-1 rounded-full bg-ambar/20 px-2 py-0.5 text-[11px] font-semibold text-ambar">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ambar" />
                          EN VIVO
                        </span>
                      )}
                    </span>
                    <p className="text-xs text-texto2">
                      Código: <span className="text-cian">{sala.codigo}</span>
                      {sala.rol !== "miembro" && (
                        <span className="ml-2 rounded-full bg-fondo px-2 py-0.5 text-ambar">
                          {sala.rol}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-2xl">🍺</span>
                </Link>
                {sala.nocheActivaId && (
                  <Link
                    href={`/noche/${sala.nocheActivaId}`}
                    className="mt-2 flex items-center justify-center gap-2 rounded-2xl bg-ambar px-4 py-3 text-center font-titulo text-sm text-fondo transition active:scale-[0.98] pulso-neon"
                  >
                    🎉 Unirse rápido a la noche de {sala.nombre}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {modo === "ninguno" && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setModo("crear")}
            className="rounded-2xl bg-ambar px-4 py-5 font-titulo text-lg text-fondo transition active:scale-95 glow-ambar"
          >
            + Crear sala
          </button>
          <button
            onClick={() => setModo("unirse")}
            className="rounded-2xl border-2 border-cian px-4 py-5 font-titulo text-lg text-cian transition active:scale-95 glow-cian"
          >
            Unirme con código
          </button>
        </div>
      )}

      {modo === "crear" && (
        <form
          onSubmit={crearSala}
          className="rounded-3xl border border-borde bg-tarjeta p-6"
        >
          <h3 className="mb-3 font-titulo text-lg text-ambar">Nueva sala</h3>
          <input
            autoFocus
            required
            minLength={2}
            value={nombreSala}
            onChange={(e) => setNombreSala(e.target.value)}
            placeholder="Nombre del grupo (ej: Los del pueblo)"
            className="mb-4 w-full rounded-2xl border border-borde bg-fondo px-4 py-4 text-texto placeholder-texto2 outline-none focus:border-ambar"
          />
          <div className="mb-4 space-y-2">
            <label className="flex items-start gap-3 rounded-2xl border border-borde bg-fondo px-4 py-3 has-[:checked]:border-ambar">
              <input
                type="radio"
                name="tipoSala"
                checked={tipoSala === "normal"}
                onChange={() => setTipoSala("normal")}
                className="mt-1 h-4 w-4 accent-ambar"
              />
              <span>
                <span className="block text-sm text-texto">🌙 Sala normal</span>
                <span className="block text-xs text-texto2">
                  Noches sueltas de unas horas fijas (4, 6, 8 o 12h).
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-borde bg-fondo px-4 py-3 has-[:checked]:border-ambar">
              <input
                type="radio"
                name="tipoSala"
                checked={tipoSala === "temporada"}
                onChange={() => setTipoSala("temporada")}
                className="mt-1 h-4 w-4 accent-ambar"
              />
              <span>
                <span className="block text-sm text-texto">
                  🗓️ Sala de temporada
                </span>
                <span className="block text-xs text-texto2">
                  En vez de una noche corta con horas fijas, eliges una fecha de
                  inicio y otra de fin (ej: &quot;Fin de semana con amigos&quot;,
                  &quot;Verano&quot;) y se pueden registrar bebidas durante todo
                  ese periodo.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-borde bg-fondo px-4 py-3 has-[:checked]:border-ambar">
              <input
                type="radio"
                name="tipoSala"
                checked={tipoSala === "permanente"}
                onChange={() => setTipoSala("permanente")}
                className="mt-1 h-4 w-4 accent-ambar"
              />
              <span>
                <span className="block text-sm text-texto">
                  ♾️ Sala permanente
                </span>
                <span className="block text-xs text-texto2">
                  Sin fecha de fin. Podéis registrar bebidas sueltas cuando
                  queráis (suman solo a vuestro nivel general, no a la liga) y
                  además iniciar noches normales cuando os junteéis: la noche
                  se queda pendiente hasta que se una una segunda persona
                  (si sois solo tú en la sala, arranca al momento).
                </span>
              </span>
            </label>
          </div>
          {error && <p className="mb-3 text-sm text-rosa">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModo("ninguno")}
              className="flex-1 rounded-2xl border border-borde py-3 text-texto2 active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="flex-1 rounded-2xl bg-ambar py-3 font-titulo text-fondo active:scale-95 disabled:opacity-50"
            >
              {cargando ? "Creando…" : "Crear 🍻"}
            </button>
          </div>
        </form>
      )}

      {modo === "unirse" && (
        <form
          onSubmit={unirseSala}
          className="rounded-3xl border border-borde bg-tarjeta p-6"
        >
          <h3 className="mb-3 font-titulo text-lg text-cian">
            Únete con el código del grupo
          </h3>
          <input
            autoFocus
            required
            minLength={6}
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="mb-4 w-full rounded-2xl border border-borde bg-fondo px-4 py-4 text-center font-titulo text-2xl tracking-[0.3em] text-cian placeholder-texto2 outline-none focus:border-cian"
          />
          {error && <p className="mb-3 text-sm text-rosa">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setModo("ninguno")}
              className="flex-1 rounded-2xl border border-borde py-3 text-texto2 active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="flex-1 rounded-2xl bg-cian py-3 font-titulo text-fondo active:scale-95 disabled:opacity-50"
            >
              {cargando ? "Entrando…" : "Unirme 🎉"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

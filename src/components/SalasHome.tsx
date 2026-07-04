"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type SalaResumen = { id: string; nombre: string; codigo: string; rol: string };

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
  const [esTemporada, setEsTemporada] = useState(false);
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
      p_tipo: esTemporada ? "temporada" : "normal",
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
        <h2 className="mb-3 font-titulo text-xl text-texto">Tus salas</h2>
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
                  className="flex items-center justify-between rounded-3xl border border-borde bg-tarjeta p-5 transition active:scale-[0.98]"
                >
                  <div>
                    <span className="font-titulo text-xl text-texto">
                      {sala.nombre}
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
          <label className="mb-4 flex items-start gap-3 rounded-2xl border border-borde bg-fondo px-4 py-3">
            <input
              type="checkbox"
              checked={esTemporada}
              onChange={(e) => setEsTemporada(e.target.checked)}
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

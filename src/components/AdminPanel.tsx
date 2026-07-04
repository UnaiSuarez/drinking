"use client";

import { useState } from "react";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/client";
import { CARTAS_COFRES, COFRES_TIPOS } from "@/lib/cofresDesign";
import { parseInventarioState, totalItems } from "@/lib/inventario";
import { calcularSaldoChapas, parseTiendaState } from "@/lib/tienda";
import { progresoNivel } from "@/lib/niveles";

type LogroInfo = { slug: string; nombre: string; icono: string; rareza: string };

type Resultado = { id: string; nombre: string };

type PerfilDetalle = {
  id: string;
  nombre: string;
  xp: number;
  saldo: number;
  cartas: number;
  cofres: number;
};

export default function AdminPanel({ logros }: { logros: LogroInfo[] }) {
  const supabase = createClient();
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [seleccionado, setSeleccionado] = useState<PerfilDetalle | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);

  const [deltaChapas, setDeltaChapas] = useState("10");
  const [deltaXp, setDeltaXp] = useState("50");
  const [cartaId, setCartaId] = useState(CARTAS_COFRES[0]?.id ?? "");
  const [deltaCarta, setDeltaCarta] = useState("1");
  const [cofreId, setCofreId] = useState<string>(COFRES_TIPOS[0]?.id ?? "");
  const [deltaCofre, setDeltaCofre] = useState("1");
  const [logroSlug, setLogroSlug] = useState(logros[0]?.slug ?? "");

  async function buscar() {
    if (!busqueda.trim()) return;
    setBuscando(true);
    const { data } = await supabase
      .from("perfiles")
      .select("id, nombre")
      .ilike("nombre", `%${busqueda.trim()}%`)
      .limit(20);
    setResultados(data ?? []);
    setBuscando(false);
  }

  async function cargarDetalle(id: string, nombre: string) {
    setMensaje(null);
    const { data } = await supabase
      .from("perfiles")
      .select("avatar_config, xp")
      .eq("id", id)
      .single();
    if (!data) return;
    const { data: ligaRaw } = await supabase
      .from("liga")
      .select("pl")
      .eq("usuario_id", id);
    const plHistoricos = (ligaRaw ?? []).reduce((acc, l) => acc + (l.pl ?? 0), 0);
    const inventario = parseInventarioState(data.avatar_config);
    const tienda = parseTiendaState(data.avatar_config);
    const xp = data.xp ?? 0;
    setSeleccionado({
      id,
      nombre,
      xp,
      saldo: calcularSaldoChapas({ xp, plHistoricos, tienda }),
      cartas: totalItems(inventario.cartas),
      cofres: totalItems(inventario.cofres),
    });
  }

  async function refrescar() {
    if (!seleccionado) return;
    await cargarDetalle(seleccionado.id, seleccionado.nombre);
  }

  async function aplicar(
    accion: () => PromiseLike<{ error: { message: string } | null }>
  ) {
    if (!seleccionado || aplicando) return;
    setAplicando(true);
    setMensaje(null);
    const { error } = await accion();
    if (error) {
      setMensaje(`Error: ${error.message}`);
    } else {
      setMensaje("Hecho ✓");
      await refrescar();
    }
    setAplicando(false);
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-16 pt-6">
      <BackButton />
      <header className="mb-6">
        <p className="font-titulo text-3xl text-ambar">🛠️ Panel de admin</p>
        <p className="mt-2 text-sm text-texto2">
          Dar o quitar monedas, XP, cartas, cofres y medallas a cualquier
          jugador.
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
          placeholder="Buscar jugador por nombre..."
          className="flex-1 rounded-xl border border-borde bg-tarjeta px-3 py-2 text-sm text-texto"
        />
        <button
          onClick={buscar}
          disabled={buscando}
          className="rounded-xl bg-cian px-4 py-2 font-titulo text-sm text-fondo active:scale-95 disabled:opacity-50"
        >
          {buscando ? "..." : "Buscar"}
        </button>
      </div>

      {resultados.length > 0 && (
        <ul className="mb-6 space-y-2">
          {resultados.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => cargarDetalle(r.id, r.nombre)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm active:scale-95 ${
                  seleccionado?.id === r.id
                    ? "border-ambar text-ambar"
                    : "border-borde text-texto"
                }`}
              >
                {r.nombre}
              </button>
            </li>
          ))}
        </ul>
      )}

      {seleccionado && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-ambar/50 bg-tarjeta p-4">
            <p className="font-titulo text-lg text-ambar">{seleccionado.nombre}</p>
            <p className="text-xs text-texto2">
              Nivel {progresoNivel(seleccionado.xp).nivel} · {seleccionado.xp} XP ·{" "}
              {seleccionado.saldo} chapas · {seleccionado.cartas} cartas ·{" "}
              {seleccionado.cofres} cofres
            </p>
          </div>

          {mensaje && (
            <p className="rounded-xl bg-fondo px-3 py-2 text-sm text-cian">{mensaje}</p>
          )}

          <section className="rounded-2xl border border-borde bg-tarjeta p-4">
            <p className="mb-2 font-titulo text-sm text-texto">💰 Chapas</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={deltaChapas}
                onChange={(e) => setDeltaChapas(e.target.value)}
                className="w-24 rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto"
              />
              <button
                disabled={aplicando}
                onClick={() =>
                  aplicar(() =>
                    supabase.rpc("admin_ajustar_chapas", {
                      p_usuario: seleccionado.id,
                      p_cantidad: Number(deltaChapas) || 0,
                    })
                  )
                }
                className="flex-1 rounded-xl bg-ambar py-2 font-titulo text-sm text-fondo active:scale-95 disabled:opacity-50"
              >
                Aplicar (usa negativo para quitar)
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-borde bg-tarjeta p-4">
            <p className="mb-2 font-titulo text-sm text-texto">📈 XP (sube o baja el nivel)</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={deltaXp}
                onChange={(e) => setDeltaXp(e.target.value)}
                className="w-24 rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto"
              />
              <button
                disabled={aplicando}
                onClick={() =>
                  aplicar(() =>
                    supabase.rpc("admin_ajustar_xp", {
                      p_usuario: seleccionado.id,
                      p_cantidad: Number(deltaXp) || 0,
                    })
                  )
                }
                className="flex-1 rounded-xl bg-ambar py-2 font-titulo text-sm text-fondo active:scale-95 disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-borde bg-tarjeta p-4">
            <p className="mb-2 font-titulo text-sm text-texto">🎴 Cartas</p>
            <div className="mb-2 flex gap-2">
              <select
                value={cartaId}
                onChange={(e) => setCartaId(e.target.value)}
                className="flex-1 rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto"
              >
                {CARTAS_COFRES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={deltaCarta}
                onChange={(e) => setDeltaCarta(e.target.value)}
                className="w-16 rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto"
              />
            </div>
            <button
              disabled={aplicando}
              onClick={() =>
                aplicar(() =>
                  supabase.rpc("admin_ajustar_carta", {
                    p_usuario: seleccionado.id,
                    p_carta_id: cartaId,
                    p_cantidad: Number(deltaCarta) || 0,
                  })
                )
              }
              className="w-full rounded-xl bg-cian py-2 font-titulo text-sm text-fondo active:scale-95 disabled:opacity-50"
            >
              Aplicar
            </button>
          </section>

          <section className="rounded-2xl border border-borde bg-tarjeta p-4">
            <p className="mb-2 font-titulo text-sm text-texto">📦 Cofres</p>
            <div className="mb-2 flex gap-2">
              <select
                value={cofreId}
                onChange={(e) => setCofreId(e.target.value)}
                className="flex-1 rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto"
              >
                {COFRES_TIPOS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={deltaCofre}
                onChange={(e) => setDeltaCofre(e.target.value)}
                className="w-16 rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto"
              />
            </div>
            <button
              disabled={aplicando}
              onClick={() =>
                aplicar(() =>
                  supabase.rpc("admin_ajustar_cofre", {
                    p_usuario: seleccionado.id,
                    p_cofre_id: cofreId,
                    p_cantidad: Number(deltaCofre) || 0,
                  })
                )
              }
              className="w-full rounded-xl bg-cian py-2 font-titulo text-sm text-fondo active:scale-95 disabled:opacity-50"
            >
              Aplicar
            </button>
          </section>

          <section className="rounded-2xl border border-borde bg-tarjeta p-4">
            <p className="mb-2 font-titulo text-sm text-texto">🏅 Medallas</p>
            <select
              value={logroSlug}
              onChange={(e) => setLogroSlug(e.target.value)}
              className="mb-2 w-full rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto"
            >
              {logros.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.icono} {l.nombre} ({l.rareza})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                disabled={aplicando}
                onClick={() =>
                  aplicar(() =>
                    supabase.rpc("admin_otorgar_logro", {
                      p_usuario: seleccionado.id,
                      p_logro_slug: logroSlug,
                    })
                  )
                }
                className="flex-1 rounded-xl bg-lima py-2 font-titulo text-sm text-fondo active:scale-95 disabled:opacity-50"
              >
                Otorgar
              </button>
              <button
                disabled={aplicando}
                onClick={() =>
                  aplicar(() =>
                    supabase.rpc("admin_quitar_logro", {
                      p_usuario: seleccionado.id,
                      p_logro_slug: logroSlug,
                    })
                  )
                }
                className="flex-1 rounded-xl border border-rosa py-2 font-titulo text-sm text-rosa active:scale-95 disabled:opacity-50"
              >
                Quitar
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

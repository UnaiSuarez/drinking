"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export type Bebida = {
  id: number;
  nombre: string;
  icono: string;
  puntos: number;
};
export type Jugador = { id: string; nombre: string };
export type Registro = {
  id: string;
  usuario_id: string;
  bebida_tipo_id: number;
  ts: string;
};

type Noche = {
  id: string;
  sala_id: string;
  estado: string;
  inicio: string;
  fin_programado: string;
};

function formatearRestante(ms: number): string {
  if (ms <= 0) return "¡Tiempo!";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatearMMSS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function NocheLive({
  noche,
  salaNombre,
  bebidas,
  jugadoresIniciales,
  registrosIniciales,
  userId,
  esAdmin,
}: {
  noche: Noche;
  salaNombre: string;
  bebidas: Bebida[];
  jugadoresIniciales: Jugador[];
  registrosIniciales: Registro[];
  userId: string;
  esAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [jugadores, setJugadores] = useState<Jugador[]>(jugadoresIniciales);
  const [registros, setRegistros] = useState<Registro[]>(registrosIniciales);
  const [bloqueada, setBloqueada] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const [masUnos, setMasUnos] = useState<{ id: number; icono: string }[]>([]);
  const [cerrando, setCerrando] = useState(false);
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const contadorMasUno = useRef(0);

  const unido = jugadores.some((j) => j.id === userId);
  const finMs = new Date(noche.fin_programado).getTime();
  const terminada = ahora >= finMs;

  const bebidasMap = useMemo(
    () => new Map(bebidas.map((b) => [b.id, b])),
    [bebidas]
  );
  const jugadoresMap = useMemo(
    () => new Map(jugadores.map((j) => [j.id, j.nombre])),
    [jugadores]
  );

  // Reloj: se acelera a cada segundo en los últimos 5 minutos para la cuenta atrás
  useEffect(() => {
    const restante = finMs - ahora;
    const intervalo = restante <= 5 * 60 * 1000 ? 1000 : 15000;
    const t = setInterval(() => setAhora(Date.now()), intervalo);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ahora >= finMs, finMs - ahora <= 5 * 60 * 1000]);

  const cargarJugador = useCallback(
    async (usuarioId: string) => {
      const { data } = await supabase
        .from("perfiles")
        .select("id, nombre")
        .eq("id", usuarioId)
        .single();
      if (data) {
        setJugadores((prev) =>
          prev.some((j) => j.id === data.id)
            ? prev
            : [...prev, { id: data.id, nombre: data.nombre }]
        );
      }
    },
    [supabase]
  );

  // Realtime
  useEffect(() => {
    const canal = supabase
      .channel(`noche-${noche.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "registros",
          filter: `noche_id=eq.${noche.id}`,
        },
        (payload) => {
          const nuevo = payload.new as Registro & { anulado: boolean };
          if (nuevo.anulado) return;
          setRegistros((prev) =>
            prev.some((r) => r.id === nuevo.id) ? prev : [...prev, nuevo]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "registros",
        },
        (payload) => {
          const borrado = payload.old as { id: string };
          setRegistros((prev) => prev.filter((r) => r.id !== borrado.id));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "noche_jugadores",
          filter: `noche_id=eq.${noche.id}`,
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
          filter: `id=eq.${noche.id}`,
        },
        (payload) => {
          const actualizada = payload.new as { estado: string };
          if (actualizada.estado === "cerrada") {
            router.push(`/noche/${noche.id}/podio`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [supabase, noche.id, router, cargarJugador]);

  async function unirme() {
    const { error } = await supabase
      .from("noche_jugadores")
      .insert({ noche_id: noche.id, usuario_id: userId });
    if (!error) {
      setJugadores((prev) =>
        prev.some((j) => j.id === userId)
          ? prev
          : [...prev, { id: userId, nombre: "Tú" }]
      );
      cargarJugador(userId);
    }
  }

  async function registrarBebida(bebida: Bebida) {
    if (!unido || terminada || bloqueada) return;
    const { error } = await supabase.from("registros").insert({
      noche_id: noche.id,
      usuario_id: userId,
      bebida_tipo_id: bebida.id,
    });
    if (error) {
      // La noche se cerró (o el tiempo venció) antes de que llegara este registro:
      // la política de la base de datos lo ha rechazado. Bloqueamos y refrescamos
      // para que el servidor nos redirija al podio si corresponde.
      setBloqueada(true);
      router.refresh();
      return;
    }
    if (navigator.vibrate) navigator.vibrate(40);
    const idAnim = contadorMasUno.current++;
    setMasUnos((prev) => [...prev, { id: idAnim, icono: bebida.icono }]);
    setTimeout(
      () => setMasUnos((prev) => prev.filter((m) => m.id !== idAnim)),
      900
    );
  }

  async function deshacerUltima() {
    const miUltimo = [...registros]
      .reverse()
      .find((r) => r.usuario_id === userId);
    if (!miUltimo) return;
    await supabase.from("registros").delete().eq("id", miUltimo.id);
    setRegistros((prev) => prev.filter((r) => r.id !== miUltimo.id));
  }

  async function cerrarNoche() {
    setCerrando(true);
    const { error } = await supabase.rpc("cerrar_noche", {
      p_noche: noche.id,
    });
    if (!error) {
      router.push(`/noche/${noche.id}/podio`);
    } else {
      setCerrando(false);
      setConfirmandoCierre(false);
    }
  }

  const misRegistros = registros.filter((r) => r.usuario_id === userId);
  const miUltimoRegistro = misRegistros[misRegistros.length - 1];
  const puedoDeshacer =
    miUltimoRegistro &&
    ahora - new Date(miUltimoRegistro.ts).getTime() < 30000;

  const ranking = useMemo(() => {
    const totales = new Map<string, { bebidas: number; puntos: number }>();
    for (const j of jugadores) totales.set(j.id, { bebidas: 0, puntos: 0 });
    for (const r of registros) {
      const t = totales.get(r.usuario_id);
      const b = bebidasMap.get(r.bebida_tipo_id);
      if (t) {
        t.bebidas += 1;
        t.puntos += b?.puntos ?? 0;
      }
    }
    return [...totales.entries()]
      .map(([id, t]) => ({
        id,
        nombre: jugadoresMap.get(id) ?? "???",
        ...t,
      }))
      .sort((a, b) => b.puntos - a.puntos || b.bebidas - a.bebidas);
  }, [jugadores, registros, bebidasMap, jugadoresMap]);

  const feed = useMemo(() => [...registros].reverse().slice(0, 20), [registros]);
  const misPuntos =
    ranking.find((r) => r.id === userId) ?? { bebidas: 0, puntos: 0 };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-32 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <Link href={`/sala/${noche.sala_id}`} className="text-sm text-texto2">
            ← {salaNombre}
          </Link>
          <h1 className="font-titulo text-2xl text-ambar">🌙 Noche en curso</h1>
        </div>
        <div className="rounded-xl border border-borde bg-tarjeta px-3 py-2 text-center">
          <p className="text-[10px] uppercase text-texto2">Queda</p>
          <p className="font-titulo text-cian">
            {formatearRestante(finMs - ahora)}
          </p>
        </div>
      </header>

      {!terminada && finMs - ahora <= 5 * 60 * 1000 && (
        <div className="pulso-neon mb-6 rounded-3xl border-2 border-rosa bg-tarjeta p-4 text-center">
          <p className="font-titulo text-lg text-rosa">
            ⏳ ¡Últimos minutos!
          </p>
          <p className="font-titulo text-4xl text-rosa">
            {formatearMMSS(finMs - ahora)}
          </p>
          <p className="text-xs text-texto2">
            Al llegar a 0 se bloquean los registros y cualquiera podrá
            revelar el podio
          </p>
        </div>
      )}

      {!unido ? (
        <button
          onClick={unirme}
          className="mb-6 w-full rounded-3xl bg-lima p-8 font-titulo text-3xl text-fondo transition active:scale-95"
        >
          🍻 ¡UNIRME A LA NOCHE!
        </button>
      ) : (
        <>
          {/* Mi contador */}
          <div className="relative mb-5 rounded-3xl border border-borde bg-tarjeta p-5 text-center glow-ambar">
            {masUnos.map((m) => (
              <span
                key={m.id}
                className="mas-uno pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-3xl"
              >
                {m.icono} +1
              </span>
            ))}
            <p className="text-xs uppercase tracking-wide text-texto2">
              Tus bebidas esta noche
            </p>
            <p className="font-titulo text-7xl text-ambar">
              {misPuntos.bebidas}
            </p>
            <p className="text-sm text-texto2">{misPuntos.puntos} puntos</p>
            {puedoDeshacer && (
              <button
                onClick={deshacerUltima}
                className="mt-2 rounded-xl border border-rosa px-4 py-2 text-sm text-rosa active:scale-95"
              >
                ↩️ Deshacer última
              </button>
            )}
          </div>

          {/* Botones de bebida */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            {bebidas.map((b) => (
              <button
                key={b.id}
                onClick={() => registrarBebida(b)}
                disabled={terminada || bloqueada}
                className="flex min-h-28 flex-col items-center justify-center rounded-3xl border border-borde bg-tarjeta py-4 transition active:scale-90 active:border-ambar disabled:opacity-40"
              >
                <span className="text-5xl">{b.icono}</span>
                <span className="mt-1 font-titulo text-sm text-texto">
                  {b.nombre}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {terminada && (
        <div className="mb-6 rounded-3xl border-2 border-rosa bg-tarjeta p-5 text-center glow-rosa">
          <p className="font-titulo text-xl text-rosa">⏰ ¡Se acabó el tiempo!</p>
          <p className="text-sm text-texto2">
            Cualquiera puede cerrar la noche y revelar el podio.
          </p>
        </div>
      )}

      {bloqueada && !terminada && (
        <div className="mb-6 rounded-3xl border-2 border-rosa bg-tarjeta p-5 text-center glow-rosa">
          <p className="font-titulo text-xl text-rosa">🔒 Noche cerrada</p>
          <p className="text-sm text-texto2">
            Un admin ha cerrado la noche. Cargando el podio…
          </p>
        </div>
      )}

      {/* Ranking en vivo */}
      <section className="mb-6">
        <h2 className="mb-3 font-titulo text-lg text-texto">
          📊 Ranking en vivo
        </h2>
        {ranking.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-4 text-center text-sm text-texto2">
            Nadie se ha unido todavía…
          </p>
        ) : (
          <ul className="space-y-2">
            {ranking.map((j, i) => (
              <li
                key={j.id}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                  i === 0 && j.puntos > 0
                    ? "border-oro bg-tarjeta"
                    : "border-borde bg-tarjeta"
                }`}
              >
                <span className="text-texto">
                  <span className="mr-2 font-titulo text-texto2">
                    {i + 1}.
                  </span>
                  {j.nombre}
                  {j.id === userId && (
                    <span className="ml-1 text-xs text-texto2">(tú)</span>
                  )}
                  {i === 0 && j.puntos > 0 && " 👑"}
                </span>
                <span className="font-titulo text-ambar">
                  {j.puntos} pts
                  <span className="ml-2 text-xs text-texto2">
                    ({j.bebidas} 🍺)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Feed en vivo */}
      <section className="mb-6">
        <h2 className="mb-3 font-titulo text-lg text-texto">💬 Feed</h2>
        {feed.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-4 text-center text-sm text-texto2">
            El primer trago inaugura la noche 🥂
          </p>
        ) : (
          <ul className="space-y-1.5">
            {feed.map((r) => {
              const b = bebidasMap.get(r.bebida_tipo_id);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-tarjeta px-4 py-2 text-sm"
                >
                  <span className="text-texto">
                    <span className="text-cian">
                      {jugadoresMap.get(r.usuario_id) ?? "???"}
                    </span>{" "}
                    {b?.icono} {b?.nombre}
                  </span>
                  <span className="text-xs text-texto2">
                    {new Date(r.ts).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Cierre (admin siempre; cualquiera si el tiempo acabó) */}
      {(esAdmin || terminada) && unido && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-fondo via-fondo to-transparent px-5 pb-5 pt-8">
          {confirmandoCierre ? (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmandoCierre(false)}
                className="flex-1 rounded-2xl border border-borde bg-tarjeta py-4 text-texto2 active:scale-95"
              >
                Aún no
              </button>
              <button
                onClick={cerrarNoche}
                disabled={cerrando}
                className="flex-1 rounded-2xl bg-rosa py-4 font-titulo text-fondo active:scale-95 disabled:opacity-50"
              >
                {cerrando ? "Cerrando…" : "¡Revelar podio! 🏆"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmandoCierre(true)}
              className="w-full rounded-2xl border-2 border-rosa bg-tarjeta py-4 font-titulo text-lg text-rosa active:scale-95"
            >
              🏁 Cerrar la noche
            </button>
          )}
        </div>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";

export type ResultadoJugador = {
  id: string;
  nombre: string;
  posicion: number;
  bebidas: number;
  puntos: number;
  pl: number;
  desglose: { nombre: string; icono: string; cantidad: number }[];
  logros: { icono: string; nombre: string; descripcion: string }[];
};

export type ResultadoVotacion = {
  categoria: string;
  ganadores: { nombre: string; votos: number }[];
  totalVotos: number;
};

const ALTURAS: Record<number, string> = {
  1: "h-36",
  2: "h-24",
  3: "h-16",
};
const COLORES: Record<number, string> = {
  1: "bg-oro",
  2: "bg-plata",
  3: "bg-bronce",
};
const MEDALLAS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

type Fase = "countdown" | "votacion" | "revelado";

export default function PodioReveal({
  resultados,
  salaId,
  fecha,
  vistaHistorica,
  votacion,
}: {
  resultados: ResultadoJugador[];
  salaId: string;
  fecha: string;
  vistaHistorica: boolean;
  votacion: ResultadoVotacion | null;
}) {
  const ordenados = [...resultados].sort((a, b) => a.posicion - b.posicion);
  const total = ordenados.length;

  // Si es una visita al historial, nos saltamos toda la ceremonia.
  const [fase, setFase] = useState<Fase>(
    vistaHistorica ? "revelado" : "countdown"
  );
  const [cuenta, setCuenta] = useState(3);
  const [revelados, setRevelados] = useState(vistaHistorica ? total : 0);
  const [logroInfo, setLogroInfo] = useState<{
    icono: string;
    nombre: string;
    descripcion: string;
  } | null>(null);
  const [compartido, setCompartido] = useState(false);

  async function compartirResumen() {
    const medalla = (pos: number) =>
      pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : ` ${pos}.`;
    const lineas = [
      `🍻 EL RANKING — ${new Date(fecha).toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}`,
      "",
      ...ordenados.map(
        (j) =>
          `${medalla(j.posicion)} ${j.nombre} — ${j.puntos} pts (${
            j.bebidas
          } bebidas) · +${j.pl} PL`
      ),
    ];
    if (votacion) {
      lineas.push(
        "",
        `🗳️ ${votacion.categoria}: ${votacion.ganadores
          .map((g) => g.nombre)
          .join(" y ")}`
      );
    }
    const conLogros = ordenados.filter((j) => j.logros.length > 0);
    if (conLogros.length > 0) {
      lineas.push("", "🏅 Logros:");
      for (const j of conLogros) {
        lineas.push(
          `${j.nombre}: ${j.logros.map((l) => `${l.icono} ${l.nombre}`).join(", ")}`
        );
      }
    }
    const texto = lineas.join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ text: texto });
        return;
      } catch {
        // cancelado
      }
    } else {
      await navigator.clipboard.writeText(texto);
      setCompartido(true);
      setTimeout(() => setCompartido(false), 2000);
    }
  }

  const terminado = revelados >= total;

  // Cuenta atrás → aperitivo de votación (si hubo votos) → revelado
  useEffect(() => {
    if (fase !== "countdown") return;
    if (navigator.vibrate) navigator.vibrate(100);
    const t = setTimeout(() => {
      if (cuenta > 1) {
        setCuenta((c) => c - 1);
      } else {
        setFase(votacion ? "votacion" : "revelado");
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [cuenta, fase, votacion]);

  // El aperitivo de la votación se muestra unos segundos y pasa al podio
  useEffect(() => {
    if (fase !== "votacion") return;
    if (navigator.vibrate) navigator.vibrate([60, 40, 120]);
    const t = setTimeout(() => setFase("revelado"), 4000);
    return () => clearTimeout(t);
  }, [fase]);

  // Revelado escalonado: del último al primero, con pausa dramática antes del 1º
  useEffect(() => {
    if (fase !== "revelado" || vistaHistorica || terminado) return;
    const siguiente = total - revelados; // posición que toca revelar
    const pausa = siguiente === 1 ? 2200 : siguiente <= 3 ? 1400 : 700;
    const t = setTimeout(() => {
      setRevelados((r) => r + 1);
      if (siguiente === 1) {
        confetti({
          particleCount: 160,
          spread: 80,
          origin: { y: 0.35 },
          colors: ["#ffb627", "#ff2e93", "#2de2e6", "#9bf00b", "#ffd54a"],
        });
        if (navigator.vibrate) navigator.vibrate([100, 60, 100, 60, 300]);
      }
    }, pausa);
    return () => clearTimeout(t);
  }, [fase, revelados, terminado, total, vistaHistorica]);

  const esVisible = (posicion: number) => posicion > total - revelados;

  if (fase === "countdown") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center">
        <p className="mb-4 font-titulo text-2xl text-texto2">
          Y el podio de la noche es…
        </p>
        <p
          key={cuenta}
          className="subir-podio font-titulo text-9xl text-ambar drop-shadow-[0_0_24px_rgba(255,182,39,0.6)]"
        >
          {cuenta}
        </p>
      </main>
    );
  }

  if (fase === "votacion" && votacion) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6">
        <p className="mb-2 font-titulo text-sm uppercase tracking-wide text-texto2">
          🗳️ El grupo ha votado…
        </p>
        <p className="mb-6 text-center font-titulo text-2xl text-cian">
          {votacion.categoria}
        </p>
        <div className="subir-podio rounded-3xl border-2 border-cian bg-tarjeta px-10 py-8 text-center glow-cian">
          {votacion.ganadores.map((g) => (
            <p key={g.nombre} className="font-titulo text-4xl text-texto">
              {g.nombre}
            </p>
          ))}
          <p className="mt-2 text-sm text-texto2">
            con {votacion.ganadores[0]?.votos} de {votacion.totalVotos} votos
            {votacion.ganadores.length > 1 && " (¡empate!)"}
          </p>
        </div>
      </main>
    );
  }

  const podio = ordenados.filter((j) => j.posicion <= 3);
  const resto = ordenados.filter((j) => j.posicion > 3);
  const ganador = ordenados.find((j) => j.posicion === 1);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-10">
      {logroInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
          onClick={() => setLogroInfo(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border-2 border-ambar bg-tarjeta p-6 text-center glow-ambar"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-5xl">{logroInfo.icono}</p>
            <p className="mb-2 font-titulo text-xl text-ambar">
              {logroInfo.nombre}
            </p>
            <p className="mb-5 text-sm text-texto2">{logroInfo.descripcion}</p>
            <button
              onClick={() => setLogroInfo(null)}
              className="w-full rounded-2xl bg-ambar py-3 font-titulo text-fondo active:scale-95"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <h1 className="mb-2 text-center font-titulo text-3xl text-ambar">
        🏆 EL PODIO
      </h1>
      <p className="mb-8 text-center text-sm text-texto2">
        {new Date(fecha).toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>

      {/* Escalones: 2º - 1º - 3º */}
      <div className="mb-8 flex items-end justify-center gap-3">
        {[2, 1, 3].map((pos) => {
          const j = podio.find((p) => p.posicion === pos);
          if (!j) return <div key={pos} className="w-24" />;
          const mostrado = esVisible(pos);
          return (
            <div key={pos} className="flex w-24 flex-col items-center">
              {mostrado ? (
                <div className="subir-podio mb-2 text-center">
                  <p className="text-4xl">{MEDALLAS[pos]}</p>
                  <p className="font-titulo text-sm text-texto">{j.nombre}</p>
                  <p className="text-xs text-texto2">
                    {j.puntos} pts · {j.bebidas} 🍺
                  </p>
                </div>
              ) : (
                <div className="mb-2 text-center">
                  <p className="text-4xl opacity-30">❓</p>
                </div>
              )}
              <div
                className={`w-full rounded-t-2xl ${ALTURAS[pos]} ${
                  mostrado ? COLORES[pos] : "bg-tarjeta"
                } flex items-start justify-center pt-2 transition-colors duration-500`}
              >
                <span className="font-titulo text-2xl text-fondo">{pos}</span>
              </div>
            </div>
          );
        })}
      </div>

      {terminado && ganador && (
        <p className="subir-podio mb-8 text-center font-titulo text-xl text-oro drop-shadow-[0_0_16px_rgba(255,213,74,0.5)]">
          👑 ¡{ganador.nombre} gana la noche!
        </p>
      )}

      {/* Resto de posiciones */}
      {resto.length > 0 && (
        <ul className="mb-8 space-y-2">
          {resto.map((j) => (
            <li
              key={j.id}
              className={`flex items-center justify-between rounded-2xl border border-borde bg-tarjeta px-4 py-3 transition-opacity duration-500 ${
                esVisible(j.posicion) ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="text-texto">
                <span className="mr-2 font-titulo text-texto2">
                  {j.posicion}.
                </span>
                {j.nombre}
              </span>
              <span className="text-sm text-texto2">
                {j.puntos} pts · {j.bebidas} 🍺
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Resultado de la votación (sección estática) */}
      {terminado && votacion && (
        <section className="subir-podio mb-8 rounded-3xl border border-cian/40 bg-tarjeta p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-texto2">
            🗳️ {votacion.categoria}
          </p>
          <p className="font-titulo text-xl text-cian">
            {votacion.ganadores.map((g) => g.nombre).join(" y ")}
          </p>
          <p className="text-xs text-texto2">
            {votacion.ganadores[0]?.votos}/{votacion.totalVotos} votos · +5 PL
            por voto recibido
          </p>
        </section>
      )}

      {/* Puntos de Liga ganados */}
      {terminado && (
        <section className="subir-podio mb-8">
          <h2 className="mb-3 font-titulo text-lg text-texto">
            📈 Puntos de Liga de la noche
          </h2>
          <ul className="space-y-2">
            {ordenados.map((j) => (
              <li
                key={j.id}
                className="flex items-center justify-between rounded-2xl border border-borde bg-tarjeta px-4 py-3"
              >
                <span className="text-texto">
                  <span className="mr-2 font-titulo text-texto2">
                    {j.posicion}.
                  </span>
                  {j.nombre}
                </span>
                <span className="font-titulo text-lima">+{j.pl} PL</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {terminado && (
        <section className="subir-podio mb-8">
          <h2 className="mb-3 font-titulo text-lg text-texto">
            🍹 Quién bebió qué
          </h2>
          <ul className="space-y-2">
            {ordenados.map((j) => (
              <li
                key={j.id}
                className="rounded-2xl border border-borde bg-tarjeta p-4"
              >
                <p className="mb-2 font-titulo text-texto">
                  {j.posicion}. {j.nombre}
                </p>
                {j.desglose.length === 0 ? (
                  <p className="text-xs text-texto2">Sin registros esta noche</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {j.desglose.map((d) => (
                      <span
                        key={d.nombre}
                        className="rounded-full bg-fondo px-3 py-1 text-sm text-texto2"
                      >
                        {d.icono} {d.nombre} × {d.cantidad}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {terminado && ordenados.some((j) => j.logros.length > 0) && (
        <section className="subir-podio mb-8">
          <h2 className="mb-3 font-titulo text-lg text-texto">
            🏅 Logros de la noche
          </h2>
          <p className="mb-3 text-xs text-texto2">
            Toca un logro para ver cómo se consigue.
          </p>
          <ul className="space-y-2">
            {ordenados
              .filter((j) => j.logros.length > 0)
              .map((j) => (
                <li
                  key={j.id}
                  className="rounded-2xl border border-ambar/40 bg-tarjeta p-4 glow-ambar"
                >
                  <p className="mb-2 font-titulo text-texto">{j.nombre}</p>
                  <div className="flex flex-wrap gap-2">
                    {j.logros.map((l) => (
                      <button
                        key={l.nombre}
                        onClick={() => setLogroInfo(l)}
                        className="flex items-center gap-1 rounded-full border border-ambar/50 bg-fondo px-3 py-1.5 text-sm text-ambar active:scale-95"
                      >
                        <span className="text-lg">{l.icono}</span>
                        {l.nombre}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}

      {terminado && (
        <div className="subir-podio mt-auto space-y-2">
          <button
            onClick={compartirResumen}
            className="w-full rounded-2xl border-2 border-lima bg-tarjeta py-4 font-titulo text-lg text-lima active:scale-95"
          >
            {compartido ? "¡Copiado! 📋" : "📤 Compartir resumen"}
          </button>
          <Link
            href={`/sala/${salaId}`}
            className="block rounded-2xl bg-ambar py-4 text-center font-titulo text-lg text-fondo active:scale-95"
          >
            Volver a la sala
          </Link>
        </div>
      )}
    </main>
  );
}

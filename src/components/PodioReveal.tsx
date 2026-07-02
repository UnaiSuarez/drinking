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

export default function PodioReveal({
  resultados,
  salaId,
  fecha,
}: {
  resultados: ResultadoJugador[];
  salaId: string;
  fecha: string;
}) {
  // Fases: countdown 3-2-1 → revelado de últimos a primeros → fin
  const [cuenta, setCuenta] = useState(3);
  const [revelados, setRevelados] = useState(0);

  const ordenados = [...resultados].sort((a, b) => a.posicion - b.posicion);
  const total = ordenados.length;
  const enCountdown = cuenta > 0;
  const terminado = revelados >= total;

  // Cuenta atrás
  useEffect(() => {
    if (!enCountdown) return;
    if (navigator.vibrate) navigator.vibrate(100);
    const t = setTimeout(() => setCuenta((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cuenta, enCountdown]);

  // Revelado escalonado: del último al primero, con pausa dramática antes del 1º
  useEffect(() => {
    if (enCountdown || terminado) return;
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
  }, [enCountdown, revelados, terminado, total]);

  const esVisible = (posicion: number) => posicion > total - revelados;

  if (enCountdown) {
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

  const podio = ordenados.filter((j) => j.posicion <= 3);
  const resto = ordenados.filter((j) => j.posicion > 3);
  const ganador = ordenados.find((j) => j.posicion === 1);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-10">
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

      {terminado && (
        <Link
          href={`/sala/${salaId}`}
          className="subir-podio mt-auto block rounded-2xl bg-ambar py-4 text-center font-titulo text-lg text-fondo active:scale-95"
        >
          Volver a la sala
        </Link>
      )}
    </main>
  );
}

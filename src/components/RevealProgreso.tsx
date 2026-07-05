"use client";

import { useEffect, useMemo, useState } from "react";
import AvatarFrame from "@/components/AvatarFrame";
import { type AvatarConfig } from "@/lib/avatar";
import { calcularDivision } from "@/lib/liga";
import { MARCO_INFO, marcoPorLiga, marcoPorNivel } from "@/lib/marcos";
import { progresoNivel, xpTotalParaNivel } from "@/lib/niveles";

type Tramo = {
  nivel: number;
  fracInicio: number;
  fracFin: number;
  subeNivel: boolean;
};

function tramosNivel(xpAntes: number, xpDespues: number): Tramo[] {
  const nivelAntes = progresoNivel(xpAntes).nivel;
  const nivelDespues = progresoNivel(xpDespues).nivel;
  const tramos: Tramo[] = [];
  for (let nivel = nivelAntes; nivel <= nivelDespues; nivel++) {
    const base = xpTotalParaNivel(nivel);
    const siguiente = xpTotalParaNivel(nivel + 1);
    const necesario = Math.max(1, siguiente - base);
    const inicioXp = nivel === nivelAntes ? xpAntes : base;
    const finXp = nivel === nivelDespues ? xpDespues : siguiente;
    tramos.push({
      nivel,
      fracInicio: Math.min(1, Math.max(0, (inicioXp - base) / necesario)),
      fracFin: Math.min(1, Math.max(0, (finXp - base) / necesario)),
      subeNivel: nivel < nivelDespues,
    });
  }
  return tramos;
}

/** Barra de progreso de nivel animada: recorre, uno a uno, cada nivel que
 * se cruza esta noche, mostrando un destello de "¡Subes a nivel N!" en cada
 * salto antes de continuar con el siguiente tramo. */
function BarraNivel({ xpAntes, xpDespues }: { xpAntes: number; xpDespues: number }) {
  const tramos = useMemo(() => tramosNivel(xpAntes, xpDespues), [xpAntes, xpDespues]);
  const [paso, setPaso] = useState(0);
  const [ancho, setAncho] = useState(() => tramos[0]?.fracInicio ?? 0);
  const [subioFlash, setSubioFlash] = useState(false);

  useEffect(() => {
    const tramo = tramos[paso];
    if (!tramo) return;
    const t1 = setTimeout(() => setAncho(tramo.fracFin), 250);
    let t2: ReturnType<typeof setTimeout> | undefined;
    let t3: ReturnType<typeof setTimeout> | undefined;
    if (tramo.subeNivel) {
      t2 = setTimeout(() => {
        setSubioFlash(true);
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
      }, 1400);
      t3 = setTimeout(() => {
        setSubioFlash(false);
        setPaso((p) => p + 1);
      }, 2600);
    }
    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
    };
  }, [paso, tramos]);

  const nivelActual = tramos[paso]?.nivel ?? tramos[tramos.length - 1]?.nivel ?? 1;
  const marco = marcoPorNivel(nivelActual);

  return (
    <div className="text-center">
      <p className="mb-2 font-titulo text-sm uppercase tracking-wide text-texto2">
        Nivel {nivelActual}
      </p>
      <div className="relative h-5 w-full overflow-hidden rounded-full border border-borde bg-fondo">
        <div
          className="h-full rounded-full bg-gradient-to-r from-ambar to-oro transition-[width] duration-[1100ms] ease-out"
          style={{ width: `${ancho * 100}%` }}
        />
      </div>
      {subioFlash && (
        <p className="subir-podio mt-3 font-titulo text-2xl text-oro drop-shadow-[0_0_16px_rgba(255,213,74,0.6)]">
          🎉 ¡Subes a nivel {nivelActual + 1}!
        </p>
      )}
      <p className="mt-2 text-xs text-texto2">Marco actual: {MARCO_INFO[marco].nombre}</p>
    </div>
  );
}

export function RevealXp({
  avatarConfig,
  xp,
  onSiguiente,
}: {
  avatarConfig: AvatarConfig;
  xp: {
    ganada: number;
    antes: number;
    despues: number;
    desglose: { concepto: string; xp: number }[];
  };
  onSiguiente: () => void;
}) {
  const marcoDespues = marcoPorNivel(progresoNivel(xp.despues).nivel);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10">
      <p className="mb-1 text-center font-titulo text-sm uppercase tracking-wide text-texto2">
        Experiencia ganada
      </p>
      <p className="subir-podio mb-6 text-center font-titulo text-5xl text-ambar drop-shadow-[0_0_20px_rgba(255,182,39,0.5)]">
        +{xp.ganada} XP
      </p>

      <AvatarFrame config={avatarConfig} marco={marcoDespues} className="mb-6 h-20 w-20" imageSizes="80px" />

      <div className="mb-6 w-full rounded-3xl border border-borde bg-tarjeta p-5">
        <BarraNivel xpAntes={xp.antes} xpDespues={xp.despues} />
      </div>

      <ul className="mb-8 w-full space-y-2">
        {xp.desglose.map((d, i) => (
          <li
            key={i}
            className="animate-[fadeIn_0.4s_ease-out_forwards] rounded-2xl border border-borde bg-tarjeta px-4 py-3 opacity-0"
            style={{ animationDelay: `${i * 180}ms` }}
          >
            <span className="flex items-center justify-between text-sm">
              <span className="text-texto">{d.concepto}</span>
              <span className="font-titulo text-ambar">+{d.xp} XP</span>
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSiguiente}
        className="w-full rounded-2xl bg-ambar py-4 font-titulo text-lg text-fondo active:scale-95"
      >
        Siguiente ▶
      </button>
    </main>
  );
}

export function RevealLiga({
  avatarConfig,
  liga,
  onSiguiente,
}: {
  avatarConfig: AvatarConfig;
  liga: {
    pl: number;
    antes: number;
    despues: number;
    posicionDespues: number;
    totalLiga: number;
    esTop1Antes: boolean;
    esTop1Despues: boolean;
  };
  onSiguiente: () => void;
}) {
  const [ancho, setAncho] = useState(0);
  const [mostrarSalto, setMostrarSalto] = useState(false);

  const divisionAntes = calcularDivision(liga.antes, liga.esTop1Antes);
  const divisionDespues = calcularDivision(liga.despues, liga.esTop1Despues);
  const cambioDivision = divisionAntes.nombre !== divisionDespues.nombre;
  const marcoDespues = marcoPorLiga(liga.despues, liga.esTop1Despues);

  // Tramo de PL dentro de la división actual: usamos los mismos umbrales que
  // calcularDivision para mostrar cuánto falta para el siguiente escalón.
  const UMBRALES = [0, 50, 125, 210, 300];
  const techoDivision = (pl: number) => UMBRALES.find((u) => pl < u) ?? pl + 50;
  const sueloDivision = (pl: number) => [...UMBRALES].reverse().find((u) => pl >= u) ?? 0;
  const suelo = sueloDivision(liga.despues);
  const techo = techoDivision(liga.despues);
  const fraccionFinal = Math.min(1, (liga.despues - suelo) / Math.max(1, techo - suelo));

  useEffect(() => {
    const t1 = setTimeout(() => setAncho(fraccionFinal), 300);
    let t2: ReturnType<typeof setTimeout> | undefined;
    if (cambioDivision) {
      t2 = setTimeout(() => setMostrarSalto(true), 1500);
    }
    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [fraccionFinal, cambioDivision]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10">
      <p className="mb-1 text-center font-titulo text-sm uppercase tracking-wide text-texto2">
        Puntos de Liga ganados
      </p>
      <p className="subir-podio mb-6 text-center font-titulo text-5xl text-lima drop-shadow-[0_0_20px_rgba(155,240,11,0.5)]">
        +{liga.pl} PL
      </p>

      <AvatarFrame config={avatarConfig} marco={marcoDespues} className="mb-6 h-20 w-20" imageSizes="80px" />

      <div className="mb-6 w-full rounded-3xl border border-borde bg-tarjeta p-5 text-center">
        <p className={`mb-2 font-titulo text-lg ${divisionDespues.color}`}>
          {divisionDespues.icono} {divisionDespues.nombre}
        </p>
        <div className="relative h-5 w-full overflow-hidden rounded-full border border-borde bg-fondo">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cian to-lima transition-[width] duration-[1100ms] ease-out"
            style={{ width: `${ancho * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-texto2">
          {liga.despues} PL · {liga.posicionDespues}º de {liga.totalLiga}
        </p>
        {mostrarSalto && (
          <p className="subir-podio mt-3 font-titulo text-xl text-lima drop-shadow-[0_0_16px_rgba(155,240,11,0.6)]">
            🎉 ¡Subes a {divisionDespues.nombre}!
          </p>
        )}
      </div>

      <button
        onClick={onSiguiente}
        className="w-full rounded-2xl bg-lima py-4 font-titulo text-lg text-fondo active:scale-95"
      >
        Siguiente ▶
      </button>
    </main>
  );
}

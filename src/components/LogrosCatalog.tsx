"use client";

import { useState } from "react";
import MedalIcon from "@/components/MedalIcon";

export type LogroCatalogo = {
  id: number;
  slug: string;
  nombre: string;
  icono: string;
  descripcion: string;
  rareza: string;
  pl: number;
  secreto: boolean;
  n: number;
};

export type LogroFase = LogroCatalogo & {
  etiqueta: string;
  umbral: number;
  conseguida: boolean;
};

export type LogroProgreso = {
  id: string;
  titulo: string;
  descripcion: string;
  unidad: string;
  valor: number;
  fases: LogroFase[];
  faseActual: LogroFase | null;
  objetivo: LogroFase;
  medalla: LogroFase;
  completado: boolean;
  progresoBase: number;
  progresoActual: number;
  progresoMaximo: number;
  progresoPct: number;
  faltan: number;
};

const RAREZA_ESTILO: Record<string, string> = {
  comun: "border-borde text-texto2",
  rara: "border-cian/60 text-cian",
  epica: "border-rosa/60 text-rosa",
  legendaria: "border-oro text-oro",
};

const RAREZA_NOMBRE: Record<string, string> = {
  comun: "Común",
  rara: "Rara",
  epica: "Épica",
  legendaria: "Legendaria",
};

function textoLogro(logro: LogroCatalogo, oculto: boolean) {
  return {
    nombre: oculto ? "???" : logro.nombre,
    descripcion: oculto
      ? "Logro secreto — consíguelo para descubrir cómo."
      : logro.descripcion,
  };
}

function textoNumero(valor: number) {
  return new Intl.NumberFormat("es-ES").format(valor);
}

function colorRareza(rareza: string) {
  return RAREZA_ESTILO[rareza]?.split(" ")[1] ?? "text-texto2";
}

function colorBarra(rareza: string) {
  if (rareza === "legendaria") return "bg-oro";
  if (rareza === "epica") return "bg-rosa";
  if (rareza === "rara") return "bg-cian";
  return "bg-lima";
}

export default function LogrosCatalog({
  logros,
  progresos = [],
}: {
  logros: LogroCatalogo[];
  progresos?: LogroProgreso[];
}) {
  const [seleccionado, setSeleccionado] = useState<LogroCatalogo | null>(null);
  const [progresoSeleccionado, setProgresoSeleccionado] =
    useState<LogroProgreso | null>(null);
  const ocultoSeleccionado =
    !!seleccionado && seleccionado.secreto && seleccionado.n === 0;
  const textoSeleccionado = seleccionado
    ? textoLogro(seleccionado, ocultoSeleccionado)
    : null;

  return (
    <>
      {progresos.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-titulo text-xl text-texto">
              Progreso por fases
            </h2>
            <p className="text-[11px] uppercase text-texto2">
              Medalla evolutiva
            </p>
          </div>
          <ul className="space-y-3">
            {progresos.map((progreso) => {
              const rarezaObjetivo = progreso.objetivo.rareza;
              const faseTexto = progreso.completado
                ? "Colección completa"
                : progreso.faseActual
                  ? `Siguiente: ${progreso.objetivo.nombre}`
                  : `Objetivo: ${progreso.objetivo.nombre}`;

              return (
                <li key={progreso.id}>
                  <button
                    type="button"
                    onClick={() => setProgresoSeleccionado(progreso)}
                    aria-label={`Ver progreso de ${progreso.titulo}`}
                    className={`w-full rounded-2xl border bg-tarjeta p-4 text-left transition active:scale-[0.99] ${
                      RAREZA_ESTILO[rarezaObjetivo] ?? "border-borde"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <MedalIcon
                        icono={progreso.medalla.icono}
                        nombre={progreso.medalla.nombre}
                        slug={progreso.medalla.slug}
                        rareza={progreso.medalla.rareza}
                        className={`h-16 w-16 ${
                          progreso.faseActual ? "" : "opacity-70 grayscale"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-titulo text-texto">
                              {progreso.titulo}
                            </p>
                            <p className="text-xs text-texto2">{faseTexto}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={`font-titulo text-[10px] uppercase ${colorRareza(
                                rarezaObjetivo
                              )}`}
                            >
                              {progreso.completado
                                ? "Completo"
                                : RAREZA_NOMBRE[rarezaObjetivo]}
                            </p>
                            <p className="text-xs text-texto">
                              {textoNumero(progreso.valor)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-[11px] text-texto2">
                            <span>
                              {textoNumero(progreso.progresoActual)}
                              {" / "}
                              {textoNumero(progreso.progresoMaximo)}
                            </span>
                            <span>
                              {progreso.completado
                                ? "al máximo"
                                : `faltan ${textoNumero(progreso.faltan)}`}
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-fondo">
                            <div
                              className={`h-full rounded-full transition-all ${colorBarra(
                                rarezaObjetivo
                              )}`}
                              style={{ width: `${progreso.progresoPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex gap-1.5">
                          {progreso.fases.map((fase) => {
                            const activa = fase.slug === progreso.objetivo.slug;
                            return (
                              <span
                                key={fase.slug}
                                className={`flex h-6 min-w-8 items-center justify-center rounded-full border px-2 font-titulo text-[10px] ${
                                  fase.conseguida
                                    ? "border-lima bg-lima/10 text-lima"
                                    : activa
                                      ? "border-ambar bg-ambar/10 text-ambar"
                                      : "border-borde text-texto2"
                                }`}
                              >
                                {fase.etiqueta}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <ul className="space-y-3">
        {logros.map((l) => {
          const oculto = l.secreto && l.n === 0;
          const tengo = l.n > 0;
          const texto = textoLogro(l, oculto);
          return (
            <li key={l.slug}>
              <button
                type="button"
                onClick={() => setSeleccionado(l)}
                aria-label={`Ver detalle de logro ${texto.nombre}`}
                className={`flex w-full items-center gap-4 rounded-2xl border bg-tarjeta p-4 text-left transition active:scale-[0.99] ${
                  tengo
                    ? RAREZA_ESTILO[l.rareza] ?? "border-borde"
                    : "border-borde opacity-60"
                }`}
              >
                <MedalIcon
                  icono={l.icono}
                  nombre={l.nombre}
                  slug={l.slug}
                  rareza={l.rareza}
                  secreto={oculto}
                  contador={l.n}
                  className="h-16 w-16"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-titulo text-texto">
                    {texto.nombre}
                    {l.n > 1 && <span className="ml-1 text-ambar">×{l.n}</span>}
                    {tengo && l.n === 1 && <span className="ml-1">✓</span>}
                  </p>
                  <p className="text-xs text-texto2">{texto.descripcion}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-titulo text-[10px] uppercase ${
                      colorRareza(l.rareza)
                    }`}
                  >
                    {RAREZA_NOMBRE[l.rareza]}
                  </p>
                  <p className="text-xs text-lima">+{l.pl} PL</p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {progresoSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-6"
          onClick={() => setProgresoSeleccionado(null)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border bg-tarjeta p-6 text-center shadow-2xl ${
              RAREZA_ESTILO[progresoSeleccionado.objetivo.rareza] ??
              "border-borde"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`progreso-modal-${progresoSeleccionado.id}`}
            aria-describedby={`progreso-modal-desc-${progresoSeleccionado.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex justify-center">
              <MedalIcon
                icono={progresoSeleccionado.medalla.icono}
                nombre={progresoSeleccionado.medalla.nombre}
                slug={progresoSeleccionado.medalla.slug}
                rareza={progresoSeleccionado.medalla.rareza}
                className="h-40 w-40"
              />
            </div>
            <p
              className={`mb-1 font-titulo text-xs uppercase ${colorRareza(
                progresoSeleccionado.objetivo.rareza
              )}`}
            >
              {progresoSeleccionado.completado
                ? "Completado"
                : `Objetivo: ${progresoSeleccionado.objetivo.nombre}`}
            </p>
            <h2
              id={`progreso-modal-${progresoSeleccionado.id}`}
              className="mb-2 font-titulo text-2xl text-texto"
            >
              {progresoSeleccionado.titulo}
            </h2>
            <p
              id={`progreso-modal-desc-${progresoSeleccionado.id}`}
              className="mb-4 text-sm text-texto2"
            >
              {progresoSeleccionado.descripcion}
            </p>

            <div className="mb-4 rounded-2xl border border-borde bg-fondo/60 p-4 text-left">
              <div className="mb-2 flex justify-between text-xs text-texto2">
                <span>
                  {textoNumero(progresoSeleccionado.valor)}{" "}
                  {progresoSeleccionado.unidad}
                </span>
                <span>
                  {textoNumero(progresoSeleccionado.progresoMaximo)}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-fondo">
                <div
                  className={`h-full rounded-full ${colorBarra(
                    progresoSeleccionado.objetivo.rareza
                  )}`}
                  style={{ width: `${progresoSeleccionado.progresoPct}%` }}
                />
              </div>
              {!progresoSeleccionado.completado && (
                <p className="mt-2 text-xs text-texto2">
                  Faltan {textoNumero(progresoSeleccionado.faltan)}{" "}
                  {progresoSeleccionado.unidad} para la siguiente medalla.
                </p>
              )}
            </div>

            <ul className="mb-5 grid grid-cols-2 gap-2 text-left">
              {progresoSeleccionado.fases.map((fase) => (
                <li
                  key={fase.slug}
                  className={`rounded-2xl border p-2 ${
                    fase.conseguida
                      ? "border-lima bg-lima/10"
                      : "border-borde bg-fondo/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MedalIcon
                      icono={fase.icono}
                      nombre={fase.nombre}
                      slug={fase.slug}
                      rareza={fase.rareza}
                      className={`h-9 w-9 ${fase.conseguida ? "" : "opacity-50"}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-titulo text-xs text-texto">
                        {fase.nombre}
                      </p>
                      <p className="text-[10px] text-texto2">
                        {textoNumero(fase.umbral)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setProgresoSeleccionado(null)}
              className="w-full rounded-2xl bg-ambar py-3 font-titulo text-fondo active:scale-95"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {seleccionado && textoSeleccionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-6"
          onClick={() => setSeleccionado(null)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border bg-tarjeta p-6 text-center shadow-2xl ${
              RAREZA_ESTILO[seleccionado.rareza] ?? "border-borde"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`logro-modal-${seleccionado.slug}`}
            aria-describedby={`logro-modal-desc-${seleccionado.slug}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex justify-center">
              <MedalIcon
                icono={seleccionado.icono}
                nombre={seleccionado.nombre}
                slug={seleccionado.slug}
                rareza={seleccionado.rareza}
                secreto={ocultoSeleccionado}
                contador={seleccionado.n}
                className="h-40 w-40"
              />
            </div>
            <p
              className={`mb-1 font-titulo text-xs uppercase ${
                colorRareza(seleccionado.rareza)
              }`}
            >
              {RAREZA_NOMBRE[seleccionado.rareza]} · +{seleccionado.pl} PL
            </p>
            <h2
              id={`logro-modal-${seleccionado.slug}`}
              className="mb-2 font-titulo text-2xl text-texto"
            >
              {textoSeleccionado.nombre}
              {seleccionado.n > 1 && (
                <span className="ml-1 text-ambar">×{seleccionado.n}</span>
              )}
            </h2>
            <p
              id={`logro-modal-desc-${seleccionado.slug}`}
              className="mb-5 text-sm text-texto2"
            >
              {textoSeleccionado.descripcion}
            </p>
            <button
              type="button"
              onClick={() => setSeleccionado(null)}
              className="w-full rounded-2xl bg-ambar py-3 font-titulo text-fondo active:scale-95"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

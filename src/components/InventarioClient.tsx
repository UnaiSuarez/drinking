"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CARTAS_COFRES,
  COFRES_TIPOS,
  MONEDA_COFRES,
  REVERSOS_CARTA,
  type CartaCofre,
  type CartaRareza,
  type CofreTipo,
} from "@/lib/cofresDesign";
import CartaDetalleModal from "@/components/CartaDetalleModal";
import CofreAperturaModal from "@/components/CofreAperturaModal";
import {
  aplicarRecompensas,
  FRAGMENTOS_PERSONAJE_NECESARIOS,
  generarAperturaCofre,
  parseInventarioState,
  totalItems,
  type RecompensaCofre,
} from "@/lib/inventario";
import { createClient } from "@/lib/supabase/client";
import {
  PERSONAJES_OCULTOS,
  calcularChapasGanadas,
  calcularSaldoChapas,
  parseTiendaState,
} from "@/lib/tienda";

const RAREZA_ESTILO: Record<
  CartaRareza,
  { borde: string; texto: string; fondo: string; etiqueta: string; brillo: string }
> = {
  comun: {
    borde: "border-borde",
    texto: "text-texto2",
    fondo: "bg-fondo/70",
    etiqueta: "Comun",
    brillo: "",
  },
  rara: {
    borde: "border-cian/60",
    texto: "text-cian",
    fondo: "bg-cian/10",
    etiqueta: "Rara",
    brillo: "shadow-[0_0_18px_rgba(45,226,230,0.12)]",
  },
  epica: {
    borde: "border-rosa/70",
    texto: "text-rosa",
    fondo: "bg-rosa/10",
    etiqueta: "Epica",
    brillo: "shadow-[0_0_22px_rgba(255,46,147,0.14)]",
  },
  legendaria: {
    borde: "border-oro",
    texto: "text-oro",
    fondo: "bg-oro/10",
    etiqueta: "Legendaria",
    brillo: "shadow-[0_0_26px_rgba(255,213,74,0.18)]",
  },
};

function objetoConfig(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export default function InventarioClient({
  userId,
  nombre,
  avatarConfigRaw,
  xp,
  plHistoricos,
}: {
  userId: string;
  nombre: string;
  avatarConfigRaw: unknown;
  xp: number;
  plHistoricos: number;
}) {
  const router = useRouter();
  const [rawConfig, setRawConfig] = useState<unknown>(avatarConfigRaw);
  const [abriendo, setAbriendo] = useState<CofreTipo["id"] | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [apertura, setApertura] = useState<{
    cofre: CofreTipo;
    recompensas: RecompensaCofre[];
  } | null>(null);
  const [cartaAbierta, setCartaAbierta] = useState<CartaCofre | null>(null);
  const cerrarApertura = useCallback(() => setApertura(null), []);

  const inventario = useMemo(() => parseInventarioState(rawConfig), [rawConfig]);
  const tienda = useMemo(() => parseTiendaState(rawConfig), [rawConfig]);
  const chapasGanadas = calcularChapasGanadas({ xp, plHistoricos });
  const saldo = calcularSaldoChapas({ xp, plHistoricos, tienda });
  const cofresTotales = totalItems(inventario.cofres);
  const cartasTotales = totalItems(inventario.cartas);
  const cartasConseguidas = CARTAS_COFRES.filter(
    (carta) => (inventario.cartas[carta.id] ?? 0) > 0
  ).length;

  async function guardarConfig(nextConfig: Record<string, unknown>) {
    const supabase = createClient();
    const { error } = await supabase
      .from("perfiles")
      .update({ avatar_config: nextConfig })
      .eq("id", userId);

    if (error) {
      setMensaje("No se pudo guardar el inventario. Prueba otra vez.");
      return false;
    }

    setRawConfig(nextConfig);
    router.refresh();
    return true;
  }

  async function abrirCofre(cofreId: CofreTipo["id"]) {
    const cofre = COFRES_TIPOS.find((item) => item.id === cofreId);
    if (!cofre || (inventario.cofres[cofreId] ?? 0) <= 0) return;

    setAbriendo(cofreId);
    setMensaje(null);
    const recompensas = generarAperturaCofre(cofreId, inventario);
    const resultado = aplicarRecompensas({
      inventario,
      tienda,
      cofreId,
      recompensas,
    });
    const nextConfig = {
      ...objetoConfig(rawConfig),
      inventario: resultado.inventario,
      tienda: resultado.tienda,
    };
    const ok = await guardarConfig(nextConfig);
    if (ok) {
      setApertura({ cofre, recompensas });
    }
    setAbriendo(null);
  }

  return (
    <>
      <header className="mb-6">
        <p className="font-titulo text-3xl text-ambar">Inventario</p>
        <p className="mt-2 text-sm text-texto2">
          Cofres, cartas acumuladas, recompensas ocultas y chapas de {nombre}.
        </p>
      </header>

      <section className="mb-6 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-borde bg-tarjeta p-3">
          <Image
            src={MONEDA_COFRES.imagen}
            alt={MONEDA_COFRES.nombre}
            width={768}
            height={768}
            className="mx-auto h-12 w-12 object-contain"
            sizes="48px"
          />
          <p className="mt-1 font-titulo text-2xl text-ambar">{saldo}</p>
          <p className="text-[10px] uppercase text-texto2">Chapas</p>
        </div>
        <div className="rounded-2xl border border-borde bg-tarjeta p-3">
          <p className="font-titulo text-4xl text-cian">{cofresTotales}</p>
          <p className="text-[10px] uppercase text-texto2">Cofres</p>
        </div>
        <div className="rounded-2xl border border-borde bg-tarjeta p-3">
          <p className="font-titulo text-4xl text-rosa">{cartasTotales}</p>
          <p className="text-[10px] uppercase text-texto2">Cartas</p>
        </div>
      </section>

      <p className="mb-4 text-xs text-texto2">
        Base: {chapasGanadas} · Bonus de cofres: {tienda.bonus} · Gastadas:{" "}
        {tienda.gastadas}
      </p>
      {mensaje && <p className="mb-4 text-sm text-cian">{mensaje}</p>}

      <div className="mb-8 grid grid-cols-2 gap-3">
        <Link
          href="/tienda"
          className="rounded-2xl border border-ambar bg-ambar/10 px-4 py-3 text-center font-titulo text-sm text-ambar active:scale-95"
        >
          Comprar cofres
        </Link>
        <Link
          href="/cofres"
          className="rounded-2xl border border-cian bg-cian/10 px-4 py-3 text-center font-titulo text-sm text-cian active:scale-95"
        >
          Ver catalogo
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 font-titulo text-xl text-texto">Mis cofres</h2>
        <ul className="grid grid-cols-3 gap-3">
          {COFRES_TIPOS.map((cofre) => {
            const cantidad = inventario.cofres[cofre.id] ?? 0;
            return (
              <li
                key={cofre.id}
                className={`rounded-2xl border bg-tarjeta p-3 text-center ${
                  cantidad > 0 ? "border-ambar/70" : "border-borde opacity-70"
                }`}
              >
                <div className="relative mx-auto mb-2 aspect-square overflow-hidden rounded-2xl bg-fondo/70">
                  {cantidad > 0 && <span className="cofre-reward-aura" />}
                  <Image
                    src={cofre.imagen}
                    alt={cofre.nombre}
                    width={768}
                    height={768}
                    className={`relative z-10 h-full w-full object-contain p-1 ${
                      abriendo === cofre.id ? "cofre-open-chest" : ""
                    }`}
                    sizes="120px"
                  />
                </div>
                <p className="font-titulo text-xs text-texto">{cofre.nombre}</p>
                <p className="mb-2 font-titulo text-lg text-ambar">x{cantidad}</p>
                <button
                  type="button"
                  disabled={cantidad <= 0 || abriendo !== null}
                  onClick={() => abrirCofre(cofre.id)}
                  className="w-full rounded-xl bg-cian px-2 py-2 font-titulo text-xs text-fondo active:scale-95 disabled:opacity-45"
                >
                  {abriendo === cofre.id ? "Abriendo..." : "Abrir"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-titulo text-xl text-texto">
          Personajes ocultos
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          {PERSONAJES_OCULTOS.map((personaje) => {
            const desbloqueado = inventario.personajesOcultos.includes(personaje.id);
            const fragmentos = Math.min(
              FRAGMENTOS_PERSONAJE_NECESARIOS,
              inventario.personajeFragmentos[personaje.id] ?? 0
            );
            return (
              <li
                key={personaje.id}
                className={`rounded-2xl border bg-tarjeta p-3 ${
                  desbloqueado
                    ? "cofre-card-secret border-purple-400/70"
                    : "border-borde opacity-70"
                }`}
              >
                <div className="relative mb-2 overflow-hidden rounded-xl bg-fondo/70">
                  {desbloqueado && <span className="cofre-reward-aura" />}
                  <Image
                    src={desbloqueado ? personaje.imagen : personaje.placeholderImagen}
                    alt={desbloqueado ? personaje.nombre : "Personaje oculto"}
                    width={1024}
                    height={1024}
                    className="relative z-10 aspect-square w-full object-cover"
                    sizes="180px"
                  />
                </div>
                <p className="font-titulo text-sm text-texto">
                  {desbloqueado ? personaje.nombre : "???"}
                </p>
                <p className="text-[11px] text-texto2">
                  {desbloqueado
                    ? "Desbloqueado"
                    : `${fragmentos}/${FRAGMENTOS_PERSONAJE_NECESARIOS} fragmentos`}
                </p>
                {!desbloqueado && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fondo">
                    <div
                      className="h-full rounded-full bg-purple-300"
                      style={{
                        width: `${
                          (fragmentos / FRAGMENTOS_PERSONAJE_NECESARIOS) * 100
                        }%`,
                      }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-titulo text-xl text-texto">Cartas</h2>
            <p className="text-xs text-texto2">
              {cartasConseguidas}/{CARTAS_COFRES.length} descubiertas
            </p>
          </div>
          <span className="rounded-full border border-borde bg-tarjeta px-3 py-1 font-titulo text-xs text-texto2">
            Acumulables
          </span>
        </div>

        <ul className="grid grid-cols-2 gap-3">
          {CARTAS_COFRES.map((carta) => {
            const cantidad = inventario.cartas[carta.id] ?? 0;
            const conseguida = cantidad > 0;
            const ocultaBloqueada = carta.oculta && !conseguida;
            const rareza = RAREZA_ESTILO[carta.rareza];
            const imagen = ocultaBloqueada ? REVERSOS_CARTA.legendaria : carta.imagen;
            const titulo = ocultaBloqueada ? "???" : carta.nombre;
            const descripcion = ocultaBloqueada
              ? "Carta exclusiva oculta. Se revelara al conseguirla en cofres."
              : carta.descripcion;

            return (
              <li
                key={carta.id}
                role="button"
                tabIndex={0}
                onClick={() => setCartaAbierta(carta)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setCartaAbierta(carta);
                  }
                }}
                className={`relative cursor-pointer rounded-2xl border bg-tarjeta p-3 outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-cian ${
                  carta.oculta
                    ? "cofre-card-secret border-purple-400/70"
                    : rareza.borde
                } ${conseguida ? rareza.brillo : "opacity-70"}`}
              >
                <div className="relative mb-3 overflow-hidden rounded-xl bg-fondo/70">
                  {carta.oculta && <span className="cofre-reward-aura" />}
                  <Image
                    src={imagen}
                    alt={titulo}
                    width={768}
                    height={768}
                    className={`relative z-10 aspect-square w-full object-cover ${
                      conseguida || carta.oculta ? "" : "grayscale"
                    }`}
                    sizes="180px"
                  />
                  <span className="absolute right-2 top-2 z-20 rounded-full bg-fondo/85 px-2 py-1 font-titulo text-xs text-ambar">
                    x{cantidad}
                  </span>
                </div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-titulo text-sm leading-tight text-texto">
                    {titulo}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                      carta.oculta ? "bg-purple-400/15 text-purple-200" : rareza.fondo
                    } ${carta.oculta ? "" : rareza.texto}`}
                  >
                    {ocultaBloqueada
                      ? "Oculta"
                      : conseguida
                        ? "Tienes"
                        : rareza.etiqueta}
                  </span>
                </div>
                <p className="min-h-10 text-[11px] leading-snug text-texto2">
                  {descripcion}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {apertura && (
        <CofreAperturaModal
          cofre={apertura.cofre}
          recompensas={apertura.recompensas}
          onClose={cerrarApertura}
        />
      )}

      {cartaAbierta && (
        <CartaDetalleModal
          carta={cartaAbierta}
          cantidad={inventario.cartas[cartaAbierta.id] ?? 0}
          bloqueada={
            !!cartaAbierta.oculta && (inventario.cartas[cartaAbierta.id] ?? 0) <= 0
          }
          onClose={() => setCartaAbierta(null)}
        />
      )}
    </>
  );
}

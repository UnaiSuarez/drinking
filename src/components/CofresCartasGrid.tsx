"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CARTAS_COFRES,
  REVERSOS_CARTA,
  type CartaCofre,
  type CartaRareza,
} from "@/lib/cofresDesign";
import CartaDetalleModal from "@/components/CartaDetalleModal";

const RAREZA_ESTILO: Record<
  CartaRareza,
  { borde: string; texto: string; fondo: string; etiqueta: string; reverso: string }
> = {
  comun: {
    borde: "border-borde",
    texto: "text-texto2",
    fondo: "bg-fondo/60",
    etiqueta: "Comun",
    reverso: REVERSOS_CARTA.comun,
  },
  rara: {
    borde: "border-cian/60",
    texto: "text-cian",
    fondo: "bg-cian/10",
    etiqueta: "Rara",
    reverso: REVERSOS_CARTA.comun,
  },
  epica: {
    borde: "border-rosa/70",
    texto: "text-rosa",
    fondo: "bg-rosa/10",
    etiqueta: "Epica",
    reverso: REVERSOS_CARTA.epica,
  },
  legendaria: {
    borde: "border-oro",
    texto: "text-oro",
    fondo: "bg-oro/10",
    etiqueta: "Legendaria",
    reverso: REVERSOS_CARTA.legendaria,
  },
};

export default function CofresCartasGrid({
  cartasPoseidas,
}: {
  cartasPoseidas: Record<string, number>;
}) {
  const [cartaAbierta, setCartaAbierta] = useState<CartaCofre | null>(null);

  return (
    <>
      <ul className="grid grid-cols-2 gap-3">
        {CARTAS_COFRES.map((carta) => {
          const cantidad = cartasPoseidas[carta.id] ?? 0;
          const conseguida = cantidad > 0;
          const bloqueada = !!carta.oculta && !conseguida;
          const rareza = RAREZA_ESTILO[carta.rareza];
          const secreta = carta.oculta
            ? "cofre-card-secret border-purple-400/70"
            : rareza.borde;
          const imagen = bloqueada ? REVERSOS_CARTA.legendaria : carta.imagen;
          const titulo = bloqueada ? "???" : carta.nombre;
          const descripcion = bloqueada
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
              className="cofre-card-scene cursor-pointer outline-none"
            >
              <article
                className={`cofre-card-inner min-h-[274px] rounded-2xl border bg-tarjeta ${secreta}`}
              >
                <div className="cofre-card-face cofre-card-back-face rounded-2xl bg-tarjeta p-3">
                  <Image
                    src={carta.oculta ? REVERSOS_CARTA.legendaria : rareza.reverso}
                    alt={`Reverso de ${carta.nombre}`}
                    width={768}
                    height={768}
                    className="aspect-[3/4] w-full rounded-xl object-cover"
                    sizes="180px"
                  />
                  <p className="mt-3 text-center font-titulo text-sm text-texto2">
                    ?
                  </p>
                </div>

                <div className="cofre-card-face cofre-card-front-face rounded-2xl bg-tarjeta p-3">
                  <div className="relative mb-3 overflow-hidden rounded-xl bg-fondo/70">
                    {!bloqueada && carta.oculta && (
                      <span className="cofre-reward-aura" />
                    )}
                    <Image
                      src={imagen}
                      alt={titulo}
                      width={768}
                      height={768}
                      className="relative z-10 aspect-square w-full object-cover"
                      sizes="180px"
                    />
                  </div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-titulo text-sm leading-tight text-texto">
                      {titulo}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${rareza.fondo} ${rareza.texto}`}
                    >
                      {carta.oculta ? "Oculta" : rareza.etiqueta}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-texto2">
                    {descripcion}
                  </p>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {cartaAbierta && (
        <CartaDetalleModal
          carta={cartaAbierta}
          cantidad={cartasPoseidas[cartaAbierta.id] ?? 0}
          bloqueada={
            !!cartaAbierta.oculta && (cartasPoseidas[cartaAbierta.id] ?? 0) <= 0
          }
          onClose={() => setCartaAbierta(null)}
        />
      )}
    </>
  );
}

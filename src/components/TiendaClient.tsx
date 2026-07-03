"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AvatarFramePreview from "@/components/AvatarFramePreview";
import { createClient } from "@/lib/supabase/client";
import { parseAvatarConfig } from "@/lib/avatar";
import { COFRES_TIPOS } from "@/lib/cofresDesign";
import { parseInventarioState, type InventarioState } from "@/lib/inventario";
import {
  PERSONAJES_OCULTOS,
  TIENDA_AVATARES,
  TIENDA_MARCOS,
  calcularChapasGanadas,
  calcularSaldoChapas,
  parseTiendaState,
  type TiendaRareza,
  type TiendaState,
} from "@/lib/tienda";
import { type MarcoPerfil } from "@/lib/marcos";

function objetoConfig(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function saldoDisponible(params: {
  xp: number;
  plHistoricos: number;
  tienda: TiendaState;
}) {
  return calcularSaldoChapas(params);
}

const RAREZA_ESTILO: Record<
  TiendaRareza,
  { borde: string; texto: string; fondo: string; boton: string; etiqueta: string }
> = {
  comun: {
    borde: "border-borde",
    texto: "text-texto2",
    fondo: "bg-fondo/60",
    boton: "bg-ambar text-fondo",
    etiqueta: "Común",
  },
  rara: {
    borde: "border-cian/60",
    texto: "text-cian",
    fondo: "bg-cian/10",
    boton: "bg-cian text-fondo",
    etiqueta: "Rara",
  },
  epica: {
    borde: "border-rosa/70",
    texto: "text-rosa",
    fondo: "bg-rosa/10",
    boton: "bg-rosa text-fondo",
    etiqueta: "Épica",
  },
  legendaria: {
    borde: "border-oro",
    texto: "text-oro",
    fondo: "bg-oro/10",
    boton: "bg-oro text-fondo",
    etiqueta: "Legendaria",
  },
  unica: {
    borde: "border-oro shadow-[0_0_24px_rgba(255,213,74,0.12)]",
    texto: "text-oro",
    fondo: "bg-gradient-to-r from-oro/15 via-cian/10 to-rosa/15",
    boton: "bg-oro/25 text-oro",
    etiqueta: "Única",
  },
};

export default function TiendaClient({
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
  const [comprando, setComprando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const avatar = useMemo(() => parseAvatarConfig(rawConfig), [rawConfig]);
  const tienda = useMemo(() => parseTiendaState(rawConfig), [rawConfig]);
  const inventario = useMemo(() => parseInventarioState(rawConfig), [rawConfig]);
  const chapasGanadas = calcularChapasGanadas({ xp, plHistoricos });
  const saldo = saldoDisponible({ xp, plHistoricos, tienda });

  async function guardarConfig(nextConfig: Record<string, unknown>) {
    const supabase = createClient();
    const { error } = await supabase
      .from("perfiles")
      .update({ avatar_config: nextConfig })
      .eq("id", userId);

    if (error) {
      setMensaje("No se pudo guardar la compra. Prueba otra vez.");
      return false;
    }

    setRawConfig(nextConfig);
    router.refresh();
    return true;
  }

  async function comprarMarco(id: MarcoPerfil, precio: number) {
    setComprando(id);
    setMensaje(null);
    const yaComprado = tienda.marcos.includes(id);
    if (!yaComprado && saldo < precio) {
      setMensaje("Te faltan chapas para ese marco.");
      setComprando(null);
      return;
    }

    const nextTienda: TiendaState = {
      ...tienda,
      gastadas: yaComprado ? tienda.gastadas : tienda.gastadas + precio,
      marcos: yaComprado ? tienda.marcos : [...tienda.marcos, id],
      marcoEquipado: id,
    };
    const nextConfig = {
      ...objetoConfig(rawConfig),
      tienda: nextTienda,
    };
    const ok = await guardarConfig(nextConfig);
    if (ok) setMensaje(yaComprado ? "Marco equipado." : "Marco comprado y equipado.");
    setComprando(null);
  }

  async function comprarAvatar(id: string, precio: number) {
    const item = TIENDA_AVATARES.find((avatarItem) => avatarItem.id === id);
    if (!item) return;

    setComprando(id);
    setMensaje(null);
    const yaComprado = tienda.avatares.includes(id);
    if (!yaComprado && saldo < precio) {
      setMensaje("Te faltan chapas para ese avatar.");
      setComprando(null);
      return;
    }

    const nextTienda: TiendaState = {
      ...tienda,
      gastadas: yaComprado ? tienda.gastadas : tienda.gastadas + precio,
      avatares: yaComprado ? tienda.avatares : [...tienda.avatares, id],
      avatarEquipado: id,
    };
    const nextConfig = {
      ...objetoConfig(rawConfig),
      ...item.config,
      avatarImagen: item.imagen,
      tienda: nextTienda,
    };
    const ok = await guardarConfig(nextConfig);
    if (ok) setMensaje(yaComprado ? "Avatar equipado." : "Avatar comprado y equipado.");
    setComprando(null);
  }

  async function comprarCofre(id: string, precio: number) {
    const item = COFRES_TIPOS.find((cofre) => cofre.id === id);
    if (!item) return;

    setComprando(`cofre-${id}`);
    setMensaje(null);
    if (saldo < precio) {
      setMensaje("Te faltan chapas para ese cofre.");
      setComprando(null);
      return;
    }

    const nextTienda: TiendaState = {
      ...tienda,
      gastadas: tienda.gastadas + precio,
    };
    const nextInventario: InventarioState = {
      ...inventario,
      cofres: {
        ...inventario.cofres,
        [id]: (inventario.cofres[id] ?? 0) + 1,
      },
    };
    const nextConfig = {
      ...objetoConfig(rawConfig),
      tienda: nextTienda,
      inventario: nextInventario,
    };
    const ok = await guardarConfig(nextConfig);
    if (ok) setMensaje(`${item.nombre} añadido al inventario.`);
    setComprando(null);
  }

  return (
    <div>
      <header className="mb-6">
        <p className="font-titulo text-3xl text-ambar">Tienda del Bar</p>
        <p className="text-sm text-texto2">
          Compra cosméticos para {nombre}. Las chapas se ganan jugando.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-borde bg-tarjeta p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-titulo text-sm uppercase text-texto2">
              Tus chapas
            </p>
            <p className="font-titulo text-4xl text-ambar">{saldo}</p>
          </div>
          <AvatarFramePreview
            config={avatar}
            marco={tienda.marcoEquipado ?? "madera"}
            titulo={nombre}
            subtitulo="Tu aspecto equipado"
            triggerClassName="h-20 w-20"
            previewClassName="h-72 w-72"
          />
        </div>
        <p className="mt-3 text-xs text-texto2">
          Generadas: {chapasGanadas} · Bonus: {tienda.bonus} · Gastadas: {tienda.gastadas}. Fórmula:
          XP/50 + PL histórico/10.
        </p>
        {mensaje && <p className="mt-3 text-sm text-cian">{mensaje}</p>}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-titulo text-xl text-texto">
          Cofres
        </h2>
        <ul className="grid grid-cols-3 gap-3">
          {COFRES_TIPOS.map((item) => {
            const cantidad = inventario.cofres[item.id] ?? 0;
            const comprandoCofre = comprando === `cofre-${item.id}`;
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-borde bg-tarjeta p-3 text-center"
              >
                <div className="relative mx-auto mb-2 aspect-square overflow-hidden rounded-2xl bg-fondo/70">
                  <span className="cofre-reward-aura" />
                  <Image
                    src={item.imagen}
                    alt={item.nombre}
                    width={768}
                    height={768}
                    className="relative z-10 h-full w-full object-contain p-1"
                    sizes="120px"
                  />
                </div>
                <p className="font-titulo text-sm leading-tight text-texto">
                  {item.nombre}
                </p>
                <p className="mb-1 text-[11px] text-texto2">
                  {item.cartas} recompensa{item.cartas > 1 ? "s" : ""}
                </p>
                <p className="mb-2 font-titulo text-xs text-cian">
                  Tienes x{cantidad}
                </p>
                <button
                  type="button"
                  disabled={comprandoCofre || saldo < item.precio}
                  onClick={() => comprarCofre(item.id, item.precio)}
                  className="w-full rounded-xl bg-ambar px-2 py-2 font-titulo text-xs text-fondo active:scale-95 disabled:opacity-50"
                >
                  {comprandoCofre ? "Comprando..." : `${item.precio} chapas`}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-titulo text-xl text-texto">
          Marcos personales
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          {TIENDA_MARCOS.map((item) => {
            const comprado = tienda.marcos.includes(item.id);
            const equipado = tienda.marcoEquipado === item.id;
            const rareza = RAREZA_ESTILO[item.rareza];
            return (
              <li
                key={item.id}
                className={`rounded-2xl border bg-tarjeta p-4 ${rareza.borde}`}
              >
                <div className="mb-3 flex justify-center">
                  <AvatarFramePreview
                    config={avatar}
                    marco={item.id}
                    titulo={item.nombre}
                    subtitulo={`${rareza.etiqueta} · ${item.precio} chapas`}
                    triggerClassName="h-20 w-20"
                    previewClassName="h-72 w-72"
                  />
                </div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-titulo text-texto">{item.nombre}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${rareza.fondo} ${rareza.texto}`}
                  >
                    {rareza.etiqueta}
                  </span>
                </div>
                <p className="mb-3 min-h-10 text-xs text-texto2">
                  {item.descripcion}
                </p>
                <button
                  type="button"
                  disabled={comprando === item.id || equipado}
                  onClick={() => comprarMarco(item.id, item.precio)}
                  className={`w-full rounded-xl px-3 py-2 font-titulo text-sm active:scale-95 disabled:opacity-50 ${rareza.boton}`}
                >
                  {equipado
                    ? "Equipado"
                    : comprado
                      ? "Equipar"
                      : `${item.precio} chapas`}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-titulo text-xl text-texto">
          Avatares IA
        </h2>
        <ul className="grid grid-cols-2 gap-3">
          {TIENDA_AVATARES.map((item) => {
            const comprado = tienda.avatares.includes(item.id);
            const equipado = tienda.avatarEquipado === item.id;
            const rareza = RAREZA_ESTILO[item.rareza];
            return (
              <li
                key={item.id}
                className={`rounded-2xl border bg-tarjeta p-4 ${rareza.borde}`}
              >
                <div className="mb-3 flex justify-center rounded-2xl bg-fondo/60 p-2">
                  <AvatarFramePreview
                    config={{ ...item.config, avatarImagen: item.imagen }}
                    marco="madera"
                    titulo={item.nombre}
                    subtitulo={`${rareza.etiqueta} · ${item.precio} chapas`}
                    triggerClassName="h-24 w-24"
                    previewClassName="h-72 w-72"
                  />
                </div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-titulo text-texto">{item.nombre}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${rareza.fondo} ${rareza.texto}`}
                  >
                    {rareza.etiqueta}
                  </span>
                </div>
                <p className="mb-3 min-h-12 text-xs text-texto2">
                  {item.descripcion}
                </p>
                <button
                  type="button"
                  disabled={comprando === item.id || equipado}
                  onClick={() => comprarAvatar(item.id, item.precio)}
                  className={`w-full rounded-xl px-3 py-2 font-titulo text-sm active:scale-95 disabled:opacity-50 ${rareza.boton}`}
                >
                  {equipado
                    ? "Equipado"
                    : comprado
                      ? "Equipar"
                      : `${item.precio} chapas`}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-titulo text-xl text-texto">
              Personajes ocultos
            </h2>
            <p className="text-xs text-texto2">
              Reservados para cofres. Por ahora solo se puede ver su silueta.
            </p>
          </div>
          <span className="rounded-full border border-oro/40 bg-oro/10 px-3 py-1 font-titulo text-xs text-oro">
            Próximamente
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-3">
          {PERSONAJES_OCULTOS.map((item) => {
            const rareza = RAREZA_ESTILO[item.rareza];
            const lockedConfig = {
              ...item.config,
              avatarImagen: item.placeholderImagen,
            };

            return (
              <li
                key={item.id}
                className={`rounded-2xl border bg-tarjeta p-4 ${rareza.borde}`}
              >
                <div className="mb-3 flex justify-center rounded-2xl bg-fondo/60 p-2">
                  <AvatarFramePreview
                    config={lockedConfig}
                    marco="portal"
                    titulo={item.nombre}
                    subtitulo={`${rareza.etiqueta} · ${item.desbloqueo}`}
                    triggerClassName="h-24 w-24"
                    previewClassName="h-72 w-72"
                  />
                </div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-titulo text-texto">{item.nombre}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${rareza.fondo} ${rareza.texto}`}
                  >
                    {rareza.etiqueta}
                  </span>
                </div>
                <p className="mb-2 min-h-12 text-xs text-texto2">
                  {item.descripcion}
                </p>
                <p className="mb-3 min-h-10 text-[11px] text-oro">
                  {item.desbloqueo}
                </p>
                <button
                  type="button"
                  disabled
                  className={`w-full rounded-xl px-3 py-2 font-titulo text-sm opacity-70 ${rareza.boton}`}
                >
                  Próximamente en cofres
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

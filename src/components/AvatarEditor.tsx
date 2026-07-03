"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AvatarSVG from "@/components/AvatarSVG";
import {
  ACCESORIOS,
  BARBAS,
  CEJAS,
  COLORES_PELO,
  COLORES_ROPA,
  ESTILOS_PELO,
  ESTILOS_ROPA,
  FORMAS_CARA,
  GESTOS,
  MARCAS,
  NARICES,
  OJOS,
  TONOS_PIEL,
  parseAvatarConfig,
  type AvatarConfig,
} from "@/lib/avatar";

const NOMBRE_CARA: Record<AvatarConfig["caraForma"], string> = {
  redonda: "Redonda",
  cuadrada: "Cuadrada",
  afilada: "Afilada",
};

const NOMBRE_ROPA: Record<AvatarConfig["ropaEstilo"], string> = {
  camiseta: "Camiseta",
  camisa: "Camisa",
  sudadera: "Sudadera",
  chaqueta: "Chaqueta",
};

const NOMBRE_ACCESORIO: Record<AvatarConfig["accesorio"], string> = {
  ninguno: "Nada",
  gafas: "Gafas 🕶️",
  gorro: "Gorro 🎉",
  sombrero: "Sombrero",
  pajarita: "Pajarita 🎀",
  corona: "Corona 👑",
  parche: "Parche 🏴‍☠️",
  diadema: "Diadema ✨",
  auriculares: "Cascos",
  pendiente: "Pendiente",
};

const NOMBRE_OJOS: Record<AvatarConfig["ojos"], string> = {
  puntos: "Puntos",
  feliz: "Felices",
  cansado: "Cansados",
  guino: "Guiño",
  estrella: "Estrella",
};

const NOMBRE_CEJAS: Record<AvatarConfig["cejas"], string> = {
  normal: "Normal",
  gruesa: "Gruesa",
  enfadada: "Intensa",
  triste: "Caída",
};

const NOMBRE_NARIZ: Record<AvatarConfig["nariz"], string> = {
  suave: "Suave",
  recta: "Recta",
  boton: "Botón",
};

const NOMBRE_GESTO: Record<AvatarConfig["gesto"], string> = {
  sonrisa: "Sonrisa",
  picaro: "Pícaro",
  serio: "Serio",
  lengua: "Lengua",
  risa: "Risa",
};

const NOMBRE_BARBA: Record<AvatarConfig["barba"], string> = {
  ninguna: "Sin barba",
  bigote: "Bigote",
  perilla: "Perilla",
  barba: "Barba",
};

const NOMBRE_MARCA: Record<AvatarConfig["marca"], string> = {
  ninguna: "Nada",
  pecas: "Pecas",
  cicatriz: "Cicatriz",
  ojeras: "Ojeras",
};

function objetoConfig(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function limpiarAvatarPremium(raw: Record<string, unknown>) {
  const tienda = raw.tienda;
  if (!tienda || typeof tienda !== "object" || Array.isArray(tienda)) {
    return undefined;
  }
  return {
    ...tienda,
    avatarEquipado: null,
  };
}

export default function AvatarEditor({ actual }: { actual: unknown }) {
  const router = useRouter();
  const [config, setConfig] = useState<AvatarConfig>(parseAvatarConfig(actual));
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function set<K extends keyof AvatarConfig>(clave: K, valor: AvatarConfig[K]) {
    setConfig((prev) => ({ ...prev, [clave]: valor }));
  }

  function botonOpcion<T extends keyof AvatarConfig>(
    clave: T,
    valor: AvatarConfig[T],
    etiqueta: string,
    tono: "ambar" | "cian" = "cian"
  ) {
    const activo = config[clave] === valor;
    const activoClase =
      tono === "ambar"
        ? "border-ambar bg-ambar text-fondo"
        : "border-cian bg-cian text-fondo";

    return (
      <button
        key={String(valor)}
        type="button"
        onClick={() => set(clave, valor)}
        className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
          activo ? activoClase : "border-borde text-texto"
        }`}
      >
        {etiqueta}
      </button>
    );
  }

  async function guardar() {
    setGuardando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const nextAvatarConfig = {
        ...objetoConfig(actual),
        ...config,
        avatarImagen: null,
        avatarAnimacion: "ninguna",
        tienda: limpiarAvatarPremium(objetoConfig(actual)) ?? objetoConfig(actual).tienda,
      };
      await supabase
        .from("perfiles")
        .update({ avatar_config: nextAvatarConfig })
        .eq("id", user.id);
    }
    setGuardando(false);
    setAbierto(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mx-auto mb-2 block rounded-xl border border-borde px-4 py-2 text-xs text-texto2 active:scale-95"
      >
        ✏️ Personalizar avatar
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-3xl border border-borde bg-tarjeta p-5 text-left">
      <div className="mb-4 flex justify-center">
        <div className="rounded-3xl border border-borde bg-fondo/60 p-3">
          <AvatarSVG config={config} className="h-36 w-36" />
        </div>
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">Piel</p>
      <div className="mb-4 flex gap-2">
        {TONOS_PIEL.map((c) => (
          <button
            key={c}
            onClick={() => set("piel", c)}
            className={`h-8 w-8 rounded-full transition active:scale-90 ${
              config.piel === c ? "ring-2 ring-texto ring-offset-2 ring-offset-tarjeta" : ""
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Forma de cara
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {FORMAS_CARA.map((forma) =>
          botonOpcion("caraForma", forma, NOMBRE_CARA[forma])
        )}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">Pelo</p>
      <div className="mb-2 grid grid-cols-5 gap-2">
        {ESTILOS_PELO.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => set("peloEstilo", e)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-90 ${
              config.peloEstilo === e ? "border-ambar bg-fondo" : "border-borde"
            }`}
          >
            <AvatarSVG
              config={{ ...config, peloEstilo: e }}
              className="h-8 w-8"
            />
          </button>
        ))}
      </div>
      <div className="mb-4 flex gap-2">
        {COLORES_PELO.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => set("peloColor", c)}
            className={`h-7 w-7 rounded-full transition active:scale-90 ${
              config.peloColor === c ? "ring-2 ring-texto ring-offset-2 ring-offset-tarjeta" : ""
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">Ropa</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {ESTILOS_ROPA.map((estilo) =>
          botonOpcion("ropaEstilo", estilo, NOMBRE_ROPA[estilo])
        )}
      </div>
      <div className="mb-4 flex gap-2">
        {COLORES_ROPA.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => set("ropaColor", c)}
            className={`h-8 w-8 rounded-full transition active:scale-90 ${
              config.ropaColor === c ? "ring-2 ring-texto ring-offset-2 ring-offset-tarjeta" : ""
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Ojos
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {OJOS.map((ojos) => botonOpcion("ojos", ojos, NOMBRE_OJOS[ojos]))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Cejas
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {CEJAS.map((cejas) => botonOpcion("cejas", cejas, NOMBRE_CEJAS[cejas]))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Nariz
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {NARICES.map((nariz) => botonOpcion("nariz", nariz, NOMBRE_NARIZ[nariz]))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Boca
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {GESTOS.map((g) => botonOpcion("gesto", g, NOMBRE_GESTO[g]))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Barba y bigote
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {BARBAS.map((b) => botonOpcion("barba", b, NOMBRE_BARBA[b]))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Marca facial
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {MARCAS.map((m) => botonOpcion("marca", m, NOMBRE_MARCA[m]))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Accesorio
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        {ACCESORIOS.map((a) =>
          botonOpcion("accesorio", a, NOMBRE_ACCESORIO[a], "ambar")
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="flex-1 rounded-2xl border border-borde py-3 text-texto2 active:scale-95"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="flex-1 rounded-2xl bg-ambar py-3 font-titulo text-fondo active:scale-95 disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

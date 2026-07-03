"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AvatarSVG from "@/components/AvatarSVG";
import {
  ACCESORIOS,
  BARBAS,
  COLORES_PELO,
  COLORES_ROPA,
  ESTILOS_PELO,
  GESTOS,
  TONOS_PIEL,
  parseAvatarConfig,
  type AvatarConfig,
} from "@/lib/avatar";

const NOMBRE_ACCESORIO: Record<AvatarConfig["accesorio"], string> = {
  ninguno: "Nada",
  gafas: "Gafas 🕶️",
  gorro: "Gorro 🎉",
  pajarita: "Pajarita 🎀",
  corona: "Corona 👑",
  parche: "Parche 🏴‍☠️",
  diadema: "Diadema ✨",
};

const NOMBRE_GESTO: Record<AvatarConfig["gesto"], string> = {
  sonrisa: "Sonrisa",
  picaro: "Pícaro",
  serio: "Serio",
  lengua: "Lengua",
};

const NOMBRE_BARBA: Record<AvatarConfig["barba"], string> = {
  ninguna: "Sin barba",
  bigote: "Bigote",
  perilla: "Perilla",
  barba: "Barba",
};

export default function AvatarEditor({ actual }: { actual: unknown }) {
  const router = useRouter();
  const [config, setConfig] = useState<AvatarConfig>(parseAvatarConfig(actual));
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function set<K extends keyof AvatarConfig>(clave: K, valor: AvatarConfig[K]) {
    setConfig((prev) => ({ ...prev, [clave]: valor }));
  }

  async function guardar() {
    setGuardando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("perfiles")
        .update({ avatar_config: config })
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
        <AvatarSVG config={config} className="h-28 w-28" />
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

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">Pelo</p>
      <div className="mb-2 flex gap-2">
        {ESTILOS_PELO.map((e) => (
          <button
            key={e}
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
            onClick={() => set("peloColor", c)}
            className={`h-7 w-7 rounded-full transition active:scale-90 ${
              config.peloColor === c ? "ring-2 ring-texto ring-offset-2 ring-offset-tarjeta" : ""
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">Ropa</p>
      <div className="mb-4 flex gap-2">
        {COLORES_ROPA.map((c) => (
          <button
            key={c}
            onClick={() => set("ropaColor", c)}
            className={`h-8 w-8 rounded-full transition active:scale-90 ${
              config.ropaColor === c ? "ring-2 ring-texto ring-offset-2 ring-offset-tarjeta" : ""
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Cara
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {GESTOS.map((g) => (
          <button
            key={g}
            onClick={() => set("gesto", g)}
            className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
              config.gesto === g
                ? "border-cian bg-cian text-fondo"
                : "border-borde text-texto"
            }`}
          >
            {NOMBRE_GESTO[g]}
          </button>
        ))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Barba y bigote
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {BARBAS.map((b) => (
          <button
            key={b}
            onClick={() => set("barba", b)}
            className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
              config.barba === b
                ? "border-cian bg-cian text-fondo"
                : "border-borde text-texto"
            }`}
          >
            {NOMBRE_BARBA[b]}
          </button>
        ))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Accesorio
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        {ACCESORIOS.map((a) => (
          <button
            key={a}
            onClick={() => set("accesorio", a)}
            className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
              config.accesorio === a
                ? "border-ambar bg-ambar text-fondo"
                : "border-borde text-texto"
            }`}
          >
            {NOMBRE_ACCESORIO[a]}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setAbierto(false)}
          className="flex-1 rounded-2xl border border-borde py-3 text-texto2 active:scale-95"
        >
          Cancelar
        </button>
        <button
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

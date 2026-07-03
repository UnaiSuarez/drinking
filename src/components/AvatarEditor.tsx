"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const EMOJIS_AVATAR = [
  "🦊", "🐸", "🐵", "🦁", "🐯", "🐼", "🐨", "🐷",
  "🐙", "🦄", "🐳", "🦖", "🍄", "👽", "🤖", "👻",
  "🎃", "🦈", "🐺", "🥷", "🧙", "🦉", "🐔", "🍺",
];

const COLORES_AVATAR = [
  "#ffb627", "#2de2e6", "#ff2e93", "#9bf00b",
  "#a78bfa", "#fb7185", "#38bdf8", "#f5f1e8",
];

export type AvatarConfig = { emoji?: string; color?: string };

export default function AvatarEditor({
  actual,
}: {
  actual: AvatarConfig | null;
}) {
  const router = useRouter();
  const [emoji, setEmoji] = useState(actual?.emoji ?? "🍺");
  const [color, setColor] = useState(actual?.color ?? "#ffb627");
  const [abierto, setAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("perfiles")
        .update({ avatar_config: { emoji, color } })
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
    <div className="mb-6 rounded-3xl border border-borde bg-tarjeta p-5">
      <div className="mb-4 flex justify-center">
        <span
          className="flex h-20 w-20 items-center justify-center rounded-full text-5xl"
          style={{ backgroundColor: `${color}33`, border: `3px solid ${color}` }}
        >
          {emoji}
        </span>
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Tu personaje
      </p>
      <div className="mb-4 grid grid-cols-8 gap-1">
        {EMOJIS_AVATAR.map((e) => (
          <button
            key={e}
            onClick={() => setEmoji(e)}
            className={`rounded-xl py-1.5 text-2xl transition active:scale-90 ${
              emoji === e ? "bg-fondo ring-2 ring-ambar" : ""
            }`}
          >
            {e}
          </button>
        ))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">Color</p>
      <div className="mb-5 flex justify-between">
        {COLORES_AVATAR.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-9 w-9 rounded-full transition active:scale-90 ${
              color === c ? "ring-2 ring-texto ring-offset-2 ring-offset-tarjeta" : ""
            }`}
            style={{ backgroundColor: c }}
          />
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

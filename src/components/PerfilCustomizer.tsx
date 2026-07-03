"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MedalIcon from "@/components/MedalIcon";

export type MedallaDisponible = {
  slug: string;
  nombre: string;
  icono: string;
  rareza: string;
};

export default function PerfilCustomizer({
  tituloActual,
  vitrinaActual,
  medallas,
}: {
  tituloActual: string | null;
  vitrinaActual: string[];
  medallas: MedallaDisponible[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState<string | null>(tituloActual);
  const [vitrina, setVitrina] = useState<string[]>(vitrinaActual);
  const [guardando, setGuardando] = useState(false);

  function alternarVitrina(slug: string) {
    setVitrina((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : prev.length < 3
        ? [...prev, slug]
        : prev
    );
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
        .update({ titulo, vitrina: vitrina.length > 0 ? vitrina : null })
        .eq("id", user.id);
    }
    setGuardando(false);
    setAbierto(false);
    router.refresh();
  }

  if (medallas.length === 0) return null;

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="mx-auto mb-2 block rounded-xl border border-borde px-4 py-2 text-xs text-texto2 active:scale-95"
      >
        🏅 Título y vitrina
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-3xl border border-borde bg-tarjeta p-5 text-left">
      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Tu título (se muestra bajo tu nombre)
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setTitulo(null)}
          className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
            titulo === null
              ? "border-ambar bg-ambar text-fondo"
              : "border-borde text-texto2"
          }`}
        >
          Sin título
        </button>
        {medallas.map((m) => (
          <button
            key={m.slug}
            onClick={() => setTitulo(m.nombre)}
            className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
              titulo === m.nombre
                ? "border-ambar bg-ambar text-fondo"
                : "border-borde text-texto"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <MedalIcon icono={m.icono} rareza={m.rareza} className="h-6 w-6" />
              {m.nombre}
            </span>
          </button>
        ))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Tu vitrina (elige hasta 3 medallas para presumir)
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        {medallas.map((m) => {
          const elegida = vitrina.includes(m.slug);
          return (
            <button
              key={m.slug}
              onClick={() => alternarVitrina(m.slug)}
              className={`rounded-full border px-3 py-1.5 text-sm transition active:scale-95 ${
                elegida
                  ? "border-cian bg-cian text-fondo"
                  : "border-borde text-texto"
              }`}
            >
              {elegida && "✓ "}
              <span className="inline-flex items-center gap-1.5">
                <MedalIcon icono={m.icono} rareza={m.rareza} className="h-6 w-6" />
                {m.nombre}
              </span>
            </button>
          );
        })}
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

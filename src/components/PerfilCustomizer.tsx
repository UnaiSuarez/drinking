"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MedalIcon from "@/components/MedalIcon";
import { normalizarVitrina } from "@/lib/prestigio";

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
  titulosPrestigio = [],
}: {
  tituloActual: string | null;
  vitrinaActual: string[];
  medallas: MedallaDisponible[];
  titulosPrestigio?: string[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState<string | null>(tituloActual);
  const [vitrina, setVitrina] = useState<string[]>(normalizarVitrina(vitrinaActual, medallas.map((m) => m.slug)));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Inicia sesión de nuevo para guardar.");
      const { error: fallo } = await supabase
        .from("perfiles")
        .update({ titulo, vitrina: normalizarVitrina(vitrina, medallas.map((m) => m.slug)) })
        .eq("id", user.id).select("id").single();
      if (fallo) throw new Error(fallo.message);
      setAbierto(false);
      router.refresh();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo guardar la vitrina.");
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <button
        onClick={() => {
          setTitulo(tituloActual);
          setVitrina(normalizarVitrina(vitrinaActual, medallas.map((m) => m.slug)));
          setError(null);
          setAbierto(true);
        }}
        className="mx-auto mb-2 block rounded-xl border border-borde px-4 py-2 text-xs text-texto2 active:scale-95"
      >
        🏅 Título y vitrina
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-borde bg-tarjeta p-5 text-left">
      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Tu título (se muestra bajo tu nombre)
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {titulosPrestigio.map((nombre) => <button type="button" key={nombre} aria-pressed={titulo === nombre} onClick={() => setTitulo(nombre)} className={`rounded-lg border px-3 py-2 text-sm ${titulo === nombre ? "border-ambar bg-ambar text-fondo" : "border-borde text-texto"}`}>{nombre}</button>)}
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
              <MedalIcon
                icono={m.icono}
                nombre={m.nombre}
                slug={m.slug}
                rareza={m.rareza}
                className="h-6 w-6"
              />
              {m.nombre}
            </span>
          </button>
        ))}
      </div>

      <p className="mb-2 font-titulo text-xs uppercase text-texto2">
        Tu vitrina · {vitrina.length}/3
      </p>
      <div className="mb-5 flex flex-wrap gap-2">
        {medallas.map((m) => {
          const elegida = vitrina.includes(m.slug);
          return (
            <label
              key={m.slug}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                elegida
                  ? "border-cian bg-cian text-fondo"
                  : "border-borde text-texto"
              }`}
            >
              <input type="checkbox" checked={elegida} disabled={guardando || (!elegida && vitrina.length >= 3)} onChange={() => alternarVitrina(m.slug)} aria-label={`Mostrar ${m.nombre} en la vitrina`} className="h-4 w-4 shrink-0 accent-cian" />
              <span className="inline-flex items-center gap-1.5">
                <MedalIcon
                  icono={m.icono}
                  nombre={m.nombre}
                  slug={m.slug}
                  rareza={m.rareza}
                  className="h-6 w-6"
                />
                {m.nombre}
              </span>
            </label>
          );
        })}
      </div>
      {medallas.length === 0 && <p className="mb-4 text-sm text-texto2">Cuando consigas medallas podrás escoger hasta tres para tu vitrina.</p>}

      {error && <p role="alert" className="mb-3 text-sm text-rosa">{error}</p>}
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

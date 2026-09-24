"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import MedalIcon from "@/components/MedalIcon";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

export type ProfileAchievement = {
  slug: string;
  nombre: string;
  icono: string;
  descripcion: string;
  rareza: string;
  n: number;
  fechas?: string[];
};

export default function ProfileAchievementDetails({
  achievement,
  variant,
}: {
  achievement: ProfileAchievement;
  variant: "title" | "medal";
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  useModalScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={variant === "title" ? "font-titulo text-sm text-ambar underline decoration-ambar/40 underline-offset-2" : "inline-flex cursor-zoom-in"}
        aria-label={`Ver cómo se consigue ${achievement.nombre}`}
      >
        {variant === "title" ? `« ${achievement.nombre} »` : (
          <MedalIcon
            icono={achievement.icono}
            nombre={achievement.nombre}
            slug={achievement.slug}
            rareza={achievement.rareza}
            className="h-16 w-16"
            contador={achievement.n}
          />
        )}
      </button>
      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-fondo/90 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-sm rounded-2xl border border-borde bg-tarjeta p-5 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="mb-3 ml-auto block rounded-lg border border-borde px-3 py-2 text-sm text-texto2" onClick={() => setOpen(false)}>Cerrar</button>
            <div className="mb-3 flex justify-center">
              <MedalIcon icono={achievement.icono} nombre={achievement.nombre} slug={achievement.slug} rareza={achievement.rareza} className="h-36 w-36" />
            </div>
            <h2 id={titleId} className="font-titulo text-xl text-texto">{achievement.nombre}</h2>
            <p className="mt-2 text-sm text-texto2">{achievement.descripcion}</p>
            <p className="mt-3 text-xs text-ambar">Conseguida {achievement.n} {achievement.n === 1 ? "vez" : "veces"}</p>
            {achievement.fechas && achievement.fechas.length > 0 && (
              <div className="mt-3 max-h-28 overflow-y-auto border-t border-borde pt-3 text-xs text-texto2">
                {achievement.fechas.map((fecha, index) => (
                  <p key={`${fecha}-${index}`}>
                    Noche del {new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

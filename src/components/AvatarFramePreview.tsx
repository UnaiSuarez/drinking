"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AvatarFrame from "@/components/AvatarFrame";
import { type AvatarConfig, type EstadoAvatar } from "@/lib/avatar";
import Link from "next/link";
import { personajePorImagen } from "@/lib/tienda";
import { MARCO_INFO, type MarcoPerfil } from "@/lib/marcos";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

export default function AvatarFramePreview({
  config,
  estado = "sobrio",
  marco = "madera",
  titulo,
  subtitulo,
  triggerClassName = "h-12 w-12",
  previewClassName = "h-64 w-64",
  asSpan = false,
  animateTrigger = true,
}: {
  config: AvatarConfig;
  estado?: EstadoAvatar;
  marco?: MarcoPerfil;
  titulo: string;
  subtitulo?: string;
  triggerClassName?: string;
  previewClassName?: string;
  asSpan?: boolean;
  animateTrigger?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [panelWidth, setPanelWidth] = useState(384);
  const tituloId = useId();
  const marcoInfo = MARCO_INFO[marco];
  const sinMovimiento = useReducedMotion();
  const personaje = personajePorImagen(config.avatarImagen);
  useModalScrollLock(abierto);

  useEffect(() => {
    if (!abierto) return;
    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAbierto(false);
    }
    window.addEventListener("keydown", cerrarConEscape);
    return () => {
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto]);

  function abrir(event: React.MouseEvent | React.KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    // Snapshot before locking scroll: animated overflow must not resize the dialog.
    setPanelWidth(Math.max(1, Math.min(384, document.documentElement.clientWidth - 40)));
    setAbierto(true);
  }

  const trigger = (
    <AvatarFrame
      config={config}
      estado={estado}
      marco={marco}
      className={triggerClassName}
      imageSizes="128px"
      animated={animateTrigger && !abierto}
    />
  );

  return (
    <>
      {asSpan ? (
        <span
          role="button"
          tabIndex={0}
          onClick={abrir}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") abrir(event);
          }}
          aria-label={`Ver ${titulo} en grande`}
          className="inline-flex cursor-zoom-in rounded-2xl outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-cian"
          title="Ver en grande"
        >
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          onClick={abrir}
          aria-label={`Ver ${titulo} en grande`}
          className="inline-flex cursor-zoom-in rounded-2xl outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-cian"
          title="Ver en grande"
        >
          {trigger}
        </button>
      )}

      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {abierto && (
            <motion.div
              key="avatar-preview"
              className="avatar-preview-overlay fixed inset-0 z-50 overflow-hidden bg-fondo/95"
              role="dialog"
              aria-modal="true"
              aria-labelledby={tituloId}
              onClick={() => setAbierto(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: sinMovimiento ? 0.12 : 0.25 }}
            >
              <div
                className="avatar-preview-panel overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border border-borde bg-tarjeta p-5 text-center shadow-2xl"
                style={{ width: panelWidth }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex justify-end">
                  <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-borde px-3 py-2 text-sm text-texto2 active:scale-95">
                    Cerrar
                  </button>
                </div>
                <div className="mb-4 flex justify-center">
                  <div className={`avatar-preview-stage relative shrink-0 ${previewClassName} max-w-full !h-auto aspect-square`}>
                    <div className="absolute inset-[10%]">
                      <AvatarFrame config={config} estado={estado} marco={marco} className="h-full w-full" imageSizes="(max-width: 400px) 60vw, 240px" />
                    </div>
                  </div>
                </div>
                <h2 id={tituloId} className="font-titulo text-2xl text-texto">{titulo}</h2>
                {subtitulo && <p className="mt-1 text-sm text-texto2">{subtitulo}</p>}
                <p className="mt-3 font-titulo text-sm text-ambar">{marcoInfo.nombre}</p>
                <p className="mt-1 text-xs text-texto2">{marcoInfo.descripcion}</p>
                {personaje && (
                  <Link
                    href={`/personaje/${personaje.id}`}
                    className="mt-4 block w-full rounded-xl border border-cian/60 bg-cian/10 px-3 py-2 font-titulo text-sm text-cian active:scale-95"
                  >
                    Ver ficha de {personaje.nombre}
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AvatarFrame from "@/components/AvatarFrame";
import { type AvatarConfig, type EstadoAvatar } from "@/lib/avatar";
import PersonajeFichaModal from "@/components/PersonajeFicha";
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
}: {
  config: AvatarConfig;
  estado?: EstadoAvatar;
  marco?: MarcoPerfil;
  titulo: string;
  subtitulo?: string;
  triggerClassName?: string;
  previewClassName?: string;
  asSpan?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [fichaAbierta, setFichaAbierta] = useState(false);
  const tituloId = useId();
  const marcoInfo = MARCO_INFO[marco];
  const sinMovimiento = useReducedMotion();
  const personaje = personajePorImagen(config.avatarImagen);
  const marcoLegendario = marco === "trono" || marco === "tormenta" || marco === "liga-challenger";
  const especial = marcoLegendario;
  useModalScrollLock(abierto);

  useEffect(() => {
    if (!abierto) return;
    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !fichaAbierta) setAbierto(false);
    }
    window.addEventListener("keydown", cerrarConEscape);
    return () => {
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto, fichaAbierta]);

  function abrir(event: React.MouseEvent | React.KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();
    setAbierto(true);
  }

  const trigger = (
    <AvatarFrame
      config={config}
      estado={estado}
      marco={marco}
      className={triggerClassName}
      imageSizes="128px"
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
              className="avatar-preview-overlay fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto bg-fondo/90 p-5 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-labelledby={tituloId}
              onClick={() => setAbierto(false)}
              style={fichaAbierta ? { display: "none" } : undefined}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: sinMovimiento ? 0.12 : 0.25 }}
            >
              <motion.div
                className="w-full max-w-sm rounded-lg border border-borde bg-tarjeta p-5 text-center shadow-2xl"
                onClick={(event) => event.stopPropagation()}
                initial={sinMovimiento ? { opacity: 0 } : { opacity: 0, y: especial ? 36 : 16, scale: especial ? 0.82 : 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={sinMovimiento ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
                transition={sinMovimiento ? { duration: 0.12 } : { type: "spring", stiffness: especial ? 230 : 320, damping: especial ? 20 : 28 }}
              >
                <div className="mb-4 flex justify-end">
                  <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-borde px-3 py-2 text-sm text-texto2 active:scale-95">
                    Cerrar
                  </button>
                </div>
                <div className="mb-4 flex justify-center">
                  <motion.div
                    className={`avatar-preview-stage relative flex max-w-full items-center justify-center`}
                    initial={sinMovimiento || !especial ? false : { opacity: 0, y: -42, rotate: -5, scale: 1.12 }}
                    animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                    transition={sinMovimiento ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 18, delay: especial ? 0.1 : 0 }}
                  >
                    <AvatarFrame config={config} estado={estado} marco={marco} className={previewClassName} imageSizes="(max-width: 768px) 80vw, 360px" />
                  </motion.div>
                </div>
                <h2 id={tituloId} className="font-titulo text-2xl text-texto">{titulo}</h2>
                {subtitulo && <p className="mt-1 text-sm text-texto2">{subtitulo}</p>}
                <p className="mt-3 font-titulo text-sm text-ambar">{marcoInfo.nombre}</p>
                <p className="mt-1 text-xs text-texto2">{marcoInfo.descripcion}</p>
                {personaje && (
                  <button
                    type="button"
                    onClick={() => setFichaAbierta(true)}
                    className="mt-4 w-full rounded-xl border border-cian/60 bg-cian/10 px-3 py-2 font-titulo text-sm text-cian active:scale-95"
                  >
                    Ver ficha de {personaje.nombre}
                  </button>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
      {personaje && (
        <PersonajeFichaModal personaje={personaje} abierto={fichaAbierta} onCerrar={() => setFichaAbierta(false)} />
      )}
    </>
  );
}

"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AvatarFrame from "@/components/AvatarFrame";
import AvatarElementalEffect, { type AvatarElement } from "@/components/AvatarElementalEffect";
import { type AvatarConfig, type EstadoAvatar } from "@/lib/avatar";
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
  portraitOnly = false,
}: {
  config: AvatarConfig;
  estado?: EstadoAvatar;
  marco?: MarcoPerfil;
  titulo: string;
  subtitulo?: string;
  triggerClassName?: string;
  previewClassName?: string;
  asSpan?: boolean;
  portraitOnly?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const tituloId = useId();
  const marcoInfo = MARCO_INFO[marco];
  const sinMovimiento = useReducedMotion();
  const personajeUnico = ["ronda", "jefe", "cronica", "letal", "guardian"].includes(config.avatarAnimacion);
  const personajeLegendario = config.avatarAnimacion === "celestial" || config.avatarAnimacion === "deidad";
  const marcoLegendario = marco === "trono" || marco === "tormenta" || marco === "liga-challenger";
  const especial = personajeUnico || personajeLegendario || marcoLegendario;
  const elementoMarco: AvatarElement | null =
    marco === "llamas" || marco === "magma" || marco === "liga-maestro" ? "fire" :
    marco === "challenger" || marco === "tormenta" || marco === "liga-challenger" ? "lightning" :
    marco === "hielo" || marco === "liga-diamante" || marco === "reliquia" ? "ice" :
    marco === "trono" || marco === "aureola" || marco === "liga-oro" ? "light" :
    marco === "portal" ? "portal" : null;
  const elementoPersonaje: AvatarElement | null =
    config.avatarAnimacion === "deidad" || config.avatarAnimacion === "letal" ? "lightning" :
    config.avatarAnimacion === "celestial" || config.avatarAnimacion === "guardian" ? "ice" :
    config.avatarAnimacion === "jefe" || config.avatarAnimacion === "ronda" ? "fire" :
    config.avatarAnimacion === "cronica" ? "light" : null;
  const marcoTieneAnimacion = ["disco", "prisma", "glitch", "cosmico", "aureola", "reliquia", "liga-plata"].includes(marco);
  const elemento = elementoMarco ?? (marcoTieneAnimacion ? null : elementoPersonaje);
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
    setAbierto(true);
  }

  const trigger = portraitOnly && config.avatarImagen ? (
    <span className={`relative inline-flex overflow-hidden ${triggerClassName}`}>
      <Image src={config.avatarImagen} alt="" fill sizes="128px" className="object-contain" />
    </span>
  ) : (
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
                    className={`avatar-preview-stage relative flex max-w-full items-center justify-center ${elemento ? "avatar-preview-has-element" : ""}`}
                    initial={sinMovimiento || !especial ? false : { opacity: 0, y: -42, rotate: -5, scale: 1.12 }}
                    animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
                    transition={sinMovimiento ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 18, delay: especial ? 0.1 : 0 }}
                  >
                    {elemento && <AvatarElementalEffect element={elemento} />}
                    {portraitOnly && config.avatarImagen ? (
                      <div className={`relative max-h-[50dvh] max-w-full ${previewClassName}`}>
                        <Image src={config.avatarImagen} alt={titulo} fill sizes="(max-width: 768px) 80vw, 360px" className="object-contain" />
                      </div>
                    ) : (
                      <AvatarFrame config={config} estado={estado} marco={marco} className={previewClassName} imageSizes="(max-width: 768px) 80vw, 360px" />
                    )}
                  </motion.div>
                </div>
                <h2 id={tituloId} className="font-titulo text-2xl text-texto">{titulo}</h2>
                {subtitulo && <p className="mt-1 text-sm text-texto2">{subtitulo}</p>}
                {!portraitOnly && (
                  <>
                    <p className="mt-3 font-titulo text-sm text-ambar">{marcoInfo.nombre}</p>
                    <p className="mt-1 text-xs text-texto2">{marcoInfo.descripcion}</p>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

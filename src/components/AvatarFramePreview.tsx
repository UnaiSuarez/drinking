"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import AvatarFrame from "@/components/AvatarFrame";
import { type AvatarConfig, type EstadoAvatar } from "@/lib/avatar";
import { MARCO_INFO, type MarcoPerfil } from "@/lib/marcos";

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
  const tituloId = useId();
  const marcoInfo = MARCO_INFO[marco];

  useEffect(() => {
    if (!abierto) return;
    function cerrarConEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAbierto(false);
    }
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [abierto]);

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

      {abierto && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-fondo/90 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby={tituloId}
          onClick={() => setAbierto(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-borde bg-tarjeta p-5 text-center shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="rounded-xl border border-borde px-3 py-2 text-sm text-texto2 active:scale-95"
              >
                Cerrar
              </button>
            </div>
            <div className="mb-4 flex justify-center">
              <AvatarFrame
                config={config}
                estado={estado}
                marco={marco}
                className={previewClassName}
                imageSizes="(max-width: 768px) 80vw, 360px"
              />
            </div>
            <h2 id={tituloId} className="font-titulo text-2xl text-texto">
              {titulo}
            </h2>
            {subtitulo && (
              <p className="mt-1 text-sm text-texto2">{subtitulo}</p>
            )}
            <p className="mt-3 font-titulo text-sm text-ambar">
              {marcoInfo.nombre}
            </p>
            <p className="mt-1 text-xs text-texto2">{marcoInfo.descripcion}</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

export default function CodigoQrModal({
  codigo,
  salaNombre,
  onCerrar,
}: {
  codigo: string;
  salaNombre: string;
  onCerrar: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useModalScrollLock(true);

  useEffect(() => {
    let activo = true;
    const url = `${window.location.origin}/?codigo=${encodeURIComponent(codigo)}`;
    QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: "#0d0e1a", light: "#f5f1e8" } })
      .then((img) => {
        if (activo) setDataUrl(img);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [codigo]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCerrar}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
    >
      <div
        className="w-full max-w-sm rounded-3xl border-2 border-cian bg-tarjeta p-6 text-center glow-cian"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-1 font-titulo text-lg text-texto">{salaNombre}</p>
        <p className="mb-4 text-xs text-texto2">
          Escanea para unirte directamente
        </p>
        <div className="mx-auto flex aspect-square w-full max-w-64 items-center justify-center overflow-hidden rounded-2xl bg-[#f5f1e8]">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={`Código QR para unirse a ${salaNombre}`} className="h-full w-full" />
          ) : (
            <p className="text-sm text-fondo/60">Generando…</p>
          )}
        </div>
        <p className="mt-4 font-titulo text-2xl tracking-widest text-cian">{codigo}</p>
        <button
          type="button"
          onClick={onCerrar}
          className="mt-5 w-full rounded-2xl bg-cian py-3 font-titulo text-fondo active:scale-95"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

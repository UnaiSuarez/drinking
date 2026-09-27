"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { comprimirImagen, formatoMB } from "@/lib/momentos";

type Foto = {
  id: string;
  usuario_id: string;
  storage_path: string;
  descripcion: string | null;
  creado_en: string;
  url?: string;
};

type Cuota = {
  usado_bytes: number;
  limite_bytes: number;
  aviso: boolean;
  bloqueado: boolean;
};

export default function MomentosAlbumClient({
  salaId,
  userId,
  esAdmin,
  miembros,
}: {
  salaId: string;
  userId: string;
  esAdmin: boolean;
  miembros: { id: string; nombre: string }[];
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [cuota, setCuota] = useState<Cuota | null>(null);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [descripcionSubida, setDescripcionSubida] = useState("");
  const [fotoGrande, setFotoGrande] = useState<Foto | null>(null);

  const nombreDe = (id: string) => miembros.find((m) => m.id === id)?.nombre ?? "alguien";

  const cargar = useCallback(async () => {
    const [{ data: filas }, { data: estado }] = await Promise.all([
      supabase
        .from("fotos_sala")
        .select("id, usuario_id, storage_path, descripcion, creado_en")
        .eq("sala_id", salaId)
        .order("creado_en", { ascending: false }),
      supabase.rpc("estado_almacenamiento_fotos"),
    ]);
    const lista = filas ?? [];
    if (lista.length > 0) {
      const { data: firmadas } = await supabase.storage
        .from("momentos")
        .createSignedUrls(
          lista.map((f) => f.storage_path),
          3600
        );
      const urlPorPath = new Map(
        (firmadas ?? []).map((f) => [f.path, f.signedUrl])
      );
      setFotos(lista.map((f) => ({ ...f, url: urlPorPath.get(f.storage_path) ?? undefined })));
    } else {
      setFotos([]);
    }
    setCuota((estado as Cuota | null) ?? null);
    setCargando(false);
  }, [supabase, salaId]);

  useEffect(() => {
    const t = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(t);
  }, [cargar]);

  async function subir(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setMensaje(null);
    setSubiendo(true);
    const lote = Array.from(archivos).slice(0, 5);
    for (const archivo of lote) {
      try {
        const blob = await comprimirImagen(archivo);
        const path = `${salaId}/${crypto.randomUUID()}.webp`;
        const { error: errorSubida } = await supabase.storage
          .from("momentos")
          .upload(path, blob, { contentType: "image/webp" });
        if (errorSubida) throw errorSubida;
        const { error: errorRpc } = await supabase.rpc("registrar_foto_sala", {
          p_sala: salaId,
          p_noche: null,
          p_storage_path: path,
          p_tamano_bytes: blob.size,
          p_descripcion: descripcionSubida || null,
        });
        if (errorRpc) {
          await supabase.storage.from("momentos").remove([path]);
          throw errorRpc;
        }
      } catch (err) {
        setMensaje(err instanceof Error ? err.message : "No se pudo subir la foto.");
        break;
      }
    }
    if (inputRef.current) inputRef.current.value = "";
    setDescripcionSubida("");
    setSubiendo(false);
    await cargar();
  }

  async function borrar(foto: Foto) {
    if (!(foto.usuario_id === userId || esAdmin)) return;
    if (!window.confirm("¿Borrar esta foto?")) return;
    const { data, error } = await supabase.rpc("borrar_foto_sala", { p_foto_id: foto.id });
    if (error) {
      setMensaje(error.message);
      return;
    }
    const path = (data as { storage_path?: string } | null)?.storage_path;
    if (path) {
      await supabase.storage.from("momentos").remove([path]);
    }
    setFotos((prev) => prev.filter((f) => f.id !== foto.id));
    setFotoGrande((actual) => (actual?.id === foto.id ? null : actual));
  }

  if (cargando) return null;

  return (
    <details className="group mb-8">
      <summary className="mb-3 flex cursor-pointer list-none items-center justify-between font-titulo text-xl text-texto focus-visible:outline-cian">
        📸 Álbum de la sala ({fotos.length})
        <span aria-hidden="true" className="text-base text-texto2 group-open:rotate-180">⌄</span>
      </summary>

      {cuota?.bloqueado && (
        <p className="mb-3 rounded-xl bg-rosa/10 px-3 py-2 text-xs text-rosa">
          El álbum ha llegado a su límite de espacio por ahora. No se pueden subir más fotos hasta que se borre alguna.
        </p>
      )}
      {!cuota?.bloqueado && cuota?.aviso && (
        <p className="mb-3 rounded-xl bg-ambar/10 px-3 py-2 text-xs text-ambar">
          Quedan pocas fotos posibles en total ({formatoMB(cuota.usado_bytes)} de {formatoMB(cuota.limite_bytes)} usados entre todas las salas).
        </p>
      )}
      {mensaje && (
        <p role="alert" className="mb-3 rounded-xl bg-fondo px-3 py-2 text-sm text-texto2">{mensaje}</p>
      )}

      {!cuota?.bloqueado && (
        <div className="mb-3 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => void subir(event.target.files)}
            className="w-full text-sm text-texto2"
            disabled={subiendo}
          />
          <input
            type="text"
            value={descripcionSubida}
            onChange={(event) => setDescripcionSubida(event.target.value)}
            placeholder="Descripción (opcional)"
            disabled={subiendo}
            className="w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-sm text-texto"
          />
          {subiendo && <p className="text-xs text-texto2">Subiendo...</p>}
        </div>
      )}

      {fotos.length === 0 ? (
        <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
          Aún no hay fotos de esta sala. 📷
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {fotos.map((foto) => (
            <li key={foto.id} className="group/foto relative aspect-square overflow-hidden rounded-xl bg-tarjeta">
              {foto.url && (
                <button type="button" onClick={() => setFotoGrande(foto)} className="block h-full w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foto.url} alt={foto.descripcion ?? ""} className="h-full w-full object-cover" loading="lazy" />
                </button>
              )}
              {(foto.usuario_id === userId || esAdmin) && (
                <button
                  type="button"
                  onClick={() => void borrar(foto)}
                  aria-label="Borrar foto"
                  className="absolute right-1 top-1 rounded-full bg-fondo/80 px-2 py-0.5 text-xs text-rosa opacity-0 transition group-hover/foto:opacity-100"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {fotoGrande && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setFotoGrande(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-fondo/95 p-5"
        >
          {fotoGrande.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fotoGrande.url}
              alt={fotoGrande.descripcion ?? ""}
              onClick={(event) => event.stopPropagation()}
              className="max-h-[75vh] max-w-full rounded-2xl object-contain"
            />
          )}
          <div className="w-full max-w-sm text-center" onClick={(event) => event.stopPropagation()}>
            {fotoGrande.descripcion && (
              <p className="mb-1 text-sm text-texto">{fotoGrande.descripcion}</p>
            )}
            <p className="text-xs text-texto2">
              {nombreDe(fotoGrande.usuario_id)} ·{" "}
              {new Date(fotoGrande.creado_en).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <button
              type="button"
              onClick={() => setFotoGrande(null)}
              className="mt-3 rounded-xl border border-borde px-4 py-2 text-sm text-texto2 active:scale-95"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </details>
  );
}

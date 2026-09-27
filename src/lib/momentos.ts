/** Redimensiona y comprime una imagen en el propio navegador antes de
 * subirla (WebP, máx. 1600px de lado). Así una foto de móvil de varios MB
 * se queda en ~150-250KB, que es lo que hace viable guardar fotos en el
 * plan gratuito de Supabase Storage (1GB) sin acercarse al límite. */
export async function comprimirImagen(
  file: File,
  maxLado = 1600,
  calidad = 0.75
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.max(1, Math.round(bitmap.width * escala));
  const alto = Math.max(1, Math.round(bitmap.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la imagen"))),
      "image/webp",
      calidad
    );
  });
}

export function formatoMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

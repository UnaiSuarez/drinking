"use client";

import { useState } from "react";

export default function ExportarSalaControl({ salaId }: { salaId: string }) {
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportar() {
    setExportando(true);
    setError(null);
    try {
      const res = await fetch(`/api/exportar-sala?sala=${salaId}`);
      if (!res.ok) {
        const cuerpo = await res.json().catch(() => null);
        throw new Error(cuerpo?.error ?? "No se pudo exportar el historial.");
      }
      const blob = await res.blob();
      const cabecera = res.headers.get("Content-Disposition") ?? "";
      const nombre = /filename="([^"]+)"/.exec(cabecera)?.[1] ?? "historial.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo exportar el historial.");
    }
    setExportando(false);
  }

  return (
    <section className="mt-8 border-t border-borde pt-6">
      <h2 className="font-titulo text-xl text-texto">Exportar historial</h2>
      <p className="mt-2 text-sm text-texto2">
        Descarga un CSV con todas las noches cerradas: fecha, jugador,
        posición, PL ganados y bebidas registradas.
      </p>
      <button
        type="button"
        onClick={() => void exportar()}
        disabled={exportando}
        className="mt-3 rounded-lg border border-cian px-4 py-2 text-sm text-cian disabled:opacity-40"
      >
        {exportando ? "Generando…" : "📥 Descargar CSV"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-rosa">{error}</p>}
    </section>
  );
}

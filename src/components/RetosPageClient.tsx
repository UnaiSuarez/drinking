"use client";

import { useState } from "react";
import RetosClient from "@/components/RetosClient";
import RetosDiariosClient from "@/components/RetosDiariosClient";

type EstadoSemanal = {
  slug: string;
  actual: number;
  umbral: number;
  reclamado: boolean;
};

export default function RetosPageClient({ estadoSemanal }: { estadoSemanal: EstadoSemanal[] }) {
  const [vista, setVista] = useState<"diarios" | "semanales">("diarios");

  return (
    <>
      <div className="mb-6 grid grid-cols-2 rounded-lg border border-borde bg-tarjeta p-1" aria-label="Tipo de retos">
        {(["diarios", "semanales"] as const).map((opcion) => (
          <button
            key={opcion}
            type="button"
            aria-pressed={vista === opcion}
            onClick={() => setVista(opcion)}
            className={`min-h-10 rounded-md text-sm font-bold capitalize ${vista === opcion ? "bg-cian text-fondo" : "text-texto2"}`}
          >
            {opcion}
          </button>
        ))}
      </div>
      {vista === "diarios" ? <RetosDiariosClient /> : <RetosClient estadoInicial={estadoSemanal} />}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MedalIcon from "@/components/MedalIcon";

type Progreso = {
  cervezas: number;
  chupitos: number;
  cubatas: number;
  total: number;
  tipos: number;
  cervezasCatalogo: number;
  rarasOMas: number;
  legendarias: number;
  diasSala: number;
  comentariosSala: number;
  madrugadaSala: boolean;
  obtenidos: string[];
};

type Tramo = { slug: string; umbral: number; icono: string; nombre: string; rareza: string };
type Familia = { statKey: keyof Progreso; titulo: string; unidad: string; tramos: Tramo[] };

const RAREZA_ESTILO: Record<string, string> = {
  comun: "text-texto2",
  rara: "text-cian",
  epica: "text-rosa",
  legendaria: "text-oro",
};

const RAREZA_BARRA: Record<string, string> = {
  comun: "bg-texto2",
  rara: "bg-cian",
  epica: "bg-rosa",
  legendaria: "bg-oro",
};

/** Mismos slugs y umbrales que otorgar_logros_lifetime en Supabase (ver
 * supabase/migrations/20260927100000_...): si cambian ahí, cambian aquí. */
const FAMILIAS: Familia[] = [
  {
    statKey: "cervezas",
    titulo: "Cervecero",
    unidad: "cervezas/pintas",
    tramos: [
      { slug: "cervecero_1", umbral: 50, icono: "🍺", nombre: "Cervecero I", rareza: "comun" },
      { slug: "cervecero_2", umbral: 250, icono: "🍺", nombre: "Cervecero II", rareza: "rara" },
      { slug: "cervecero_3", umbral: 1000, icono: "🍺", nombre: "Cervecero III", rareza: "epica" },
      { slug: "cervecero_4", umbral: 5000, icono: "🍺", nombre: "Cervecero IV", rareza: "legendaria" },
    ],
  },
  {
    statKey: "chupitos",
    titulo: "Centurión del Chupito",
    unidad: "chupitos/shots",
    tramos: [
      { slug: "centurion_1", umbral: 25, icono: "🥃", nombre: "Centurión I", rareza: "comun" },
      { slug: "centurion_2", umbral: 100, icono: "🥃", nombre: "Centurión II", rareza: "rara" },
      { slug: "centurion_3", umbral: 500, icono: "🥃", nombre: "Centurión III", rareza: "epica" },
      { slug: "centurion_4", umbral: 1000, icono: "🥃", nombre: "Centurión IV", rareza: "legendaria" },
    ],
  },
  {
    statKey: "cubatas",
    titulo: "Coctelero",
    unidad: "cubatas",
    tramos: [
      { slug: "coctelero_1", umbral: 25, icono: "🍹", nombre: "Coctelero I", rareza: "comun" },
      { slug: "coctelero_2", umbral: 100, icono: "🍹", nombre: "Coctelero II", rareza: "rara" },
      { slug: "coctelero_3", umbral: 500, icono: "🍹", nombre: "Coctelero III", rareza: "epica" },
      { slug: "coctelero_4", umbral: 1000, icono: "🍹", nombre: "Coctelero IV", rareza: "legendaria" },
    ],
  },
  {
    statKey: "total",
    titulo: "Volumen de por vida",
    unidad: "bebidas",
    tramos: [
      { slug: "oceano", umbral: 1000, icono: "🌊", nombre: "El Océano", rareza: "epica" },
      { slug: "monumento", umbral: 5000, icono: "🗿", nombre: "Monumento Nacional", rareza: "legendaria" },
    ],
  },
  {
    statKey: "tipos",
    titulo: "Enciclopedia Etílica",
    unidad: "tipos distintos",
    tramos: [{ slug: "enciclopedia", umbral: 8, icono: "🌈", nombre: "Enciclopedia Etílica", rareza: "rara" }],
  },
  {
    statKey: "cervezasCatalogo",
    titulo: "Sumiller",
    unidad: "cervezas distintas",
    tramos: [
      { slug: "sumiller_1", umbral: 10, icono: "🍺", nombre: "Sumiller I", rareza: "rara" },
      { slug: "sumiller_2", umbral: 25, icono: "🍺", nombre: "Sumiller II", rareza: "epica" },
    ],
  },
  {
    statKey: "diasSala",
    titulo: "Constancia en sala",
    unidad: "días distintos",
    tramos: [
      { slug: "sala_ritual", umbral: 7, icono: "🕯️", nombre: "Ritual de Sala", rareza: "rara" },
      { slug: "sala_constancia", umbral: 30, icono: "⚙️", nombre: "Constancia de Hierro", rareza: "epica" },
      { slug: "sala_leyenda", umbral: 100, icono: "🏛️", nombre: "Leyenda del Barrio", rareza: "legendaria" },
    ],
  },
  {
    statKey: "comentariosSala",
    titulo: "Cronista",
    unidad: "comentarios",
    tramos: [{ slug: "sala_cronista", umbral: 20, icono: "📓", nombre: "Cronista de Sala", rareza: "rara" }],
  },
];

/** Exclusiva de sala (registros.noche_id is null): nunca se consigue en una
 * noche formal. Un solo botón basta, no tiene tramos numéricos. */
const MEDALLA_UNICA = { slug: "sala_madrugada", icono: "🌌", nombre: "Sesión de Madrugada", rareza: "rara", descripcion: "Registra una bebida suelta entre las 00:00 y las 06:00." };

/** Progreso de medallas de por vida, pensado para una sala permanente (donde
 * no hay un cierre de noche que las muestre): siguiente tramo pendiente de
 * cada familia, más las medallas exclusivas de sala. Colapsable: se puede
 * ver y ocultar, y recuerda el estado entre visitas. */
export default function AvanceMedallasSala({ salaId, userId }: { salaId: string; userId: string }) {
  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [abierto, setAbierto] = useState(false);

  // Carga el progreso al entrar y lo vuelve a pedir solo cuando cae una
  // medalla nueva (de esta sala o de cualquier otra), en vez de sondear.
  useEffect(() => {
    let activo = true;
    const supabase = createClient();
    async function cargar() {
      const { data } = await supabase.rpc("progreso_medallas_sala", { p_sala: salaId });
      if (activo && data) setProgreso(data as Progreso);
    }
    void cargar();
    const canal = supabase
      .channel(`avance-medallas-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logros_usuario", filter: `usuario_id=eq.${userId}` },
        () => void cargar()
      )
      .subscribe();
    return () => {
      activo = false;
      void supabase.removeChannel(canal);
    };
  }, [salaId, userId]);

  if (!progreso) return null;

  const madrugadaLista = progreso.obtenidos.includes(MEDALLA_UNICA.slug);
  const familias = FAMILIAS.map((familia) => {
    const valor = progreso[familia.statKey] as number;
    const siguiente = familia.tramos.find((tramo) => !progreso.obtenidos.includes(tramo.slug));
    return { familia, valor, siguiente };
  }).filter((item) => item.siguiente);

  return (
    <details
      className="group mb-8 rounded-2xl border border-borde bg-tarjeta p-4"
      open={abierto}
      onToggle={(event) => setAbierto(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between font-titulo text-lg text-texto focus-visible:outline-cian">
        📈 Avance de medallas
        <span aria-hidden="true" className="text-base text-texto2 group-open:rotate-180">⌄</span>
      </summary>

      {familias.length === 0 && madrugadaLista ? (
        <p className="mt-3 text-center text-sm text-texto2">
          Ya tienes todas las medallas de esta lista. 🏆
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {familias.map(({ familia, valor, siguiente }) => {
            if (!siguiente) return null;
            const fraccion = Math.min(1, valor / siguiente.umbral);
            return (
              <li key={familia.titulo}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className={`font-titulo ${RAREZA_ESTILO[siguiente.rareza]}`}>
                    {siguiente.icono} {siguiente.nombre}
                  </span>
                  <span className="text-texto2">
                    {valor}/{siguiente.umbral} {familia.unidad}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-fondo">
                  <div
                    className={`h-full rounded-full ${RAREZA_BARRA[siguiente.rareza]}`}
                    style={{ width: `${fraccion * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
          {!madrugadaLista && (
            <li className="flex items-center gap-3 rounded-xl border border-borde bg-fondo/60 p-2">
              <MedalIcon icono={MEDALLA_UNICA.icono} nombre={MEDALLA_UNICA.nombre} rareza={MEDALLA_UNICA.rareza} className="h-9 w-9 shrink-0" />
              <div className="text-xs">
                <p className={`font-titulo ${RAREZA_ESTILO[MEDALLA_UNICA.rareza]}`}>{MEDALLA_UNICA.nombre}</p>
                <p className="text-texto2">{MEDALLA_UNICA.descripcion}</p>
              </div>
            </li>
          )}
        </ul>
      )}
    </details>
  );
}

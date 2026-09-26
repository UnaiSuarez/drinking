"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import MedalIcon from "@/components/MedalIcon";
import SitioPicker from "@/components/SitioPicker";

export type BebidaTipo = {
  id: number;
  nombre: string;
  icono: string;
};

export type BebidaCatalogo = {
  id: string;
  nombre: string;
  rareza: string;
  categoriaId: number;
};

type LogroNuevo = {
  slug: string;
  nombre: string;
  icono: string;
  rareza: string;
};

const RAREZA_ESTILO: Record<string, string> = {
  comun: "border-borde text-texto2",
  rara: "border-cian/60 text-cian",
  epica: "border-rosa/60 text-rosa",
  legendaria: "border-oro text-oro",
};

const RAREZA_NOMBRE: Record<string, string> = {
  comun: "Común",
  rara: "Rara",
  epica: "Épica",
  legendaria: "Legendaria",
};

const XP_BASE = 5;
/** Bonus que se suma la primera vez que se registra esa bebida concreta. */
const XP_BONUS_RAREZA: Record<string, number> = {
  comun: 0,
  rara: 5,
  epica: 15,
  legendaria: 30,
};

export default function BebidaSueltaLogger({
  salaId,
  bebidas,
  catalogo,
}: {
  salaId: string;
  bebidas: BebidaTipo[];
  catalogo: BebidaCatalogo[];
}) {
  const supabase = createClient();
  const [ultimo, setUltimo] = useState<{ id: string; ts: number; xp: number } | null>(
    null
  );
  const [ahora, setAhora] = useState(() => Date.now());
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masUnos, setMasUnos] = useState<
    { id: number; icono: string; texto: string }[]
  >([]);
  const contador = useRef(0);

  const [catalogoLocal, setCatalogoLocal] = useState(catalogo);
  const [vista, setVista] = useState<"rapido" | "concreta">("rapido");
  const [busqueda, setBusqueda] = useState("");
  const [anadiendo, setAnadiendo] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState<number | "">("");

  const [colaLogros, setColaLogros] = useState<LogroNuevo[]>([]);
  const [logroActual, setLogroActual] = useState<LogroNuevo | null>(null);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Encola los logros que van llegando y los muestra de uno en uno.
  useEffect(() => {
    if (logroActual || colaLogros.length === 0) return;
    const t = setTimeout(() => {
      setColaLogros((prev) => {
        const [siguiente, ...resto] = prev;
        if (siguiente) setLogroActual(siguiente);
        return resto;
      });
    }, 0);
    return () => clearTimeout(t);
  }, [colaLogros, logroActual]);

  useEffect(() => {
    if (!logroActual) return;
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    const t = setTimeout(() => setLogroActual(null), 3200);
    return () => clearTimeout(t);
  }, [logroActual]);

  const categoriaPorId = useMemo(
    () => new Map(bebidas.map((b) => [b.id, b])),
    [bebidas]
  );

  const resultadosBusqueda = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const lista = q
      ? catalogoLocal.filter((c) => c.nombre.toLowerCase().includes(q))
      : catalogoLocal;
    return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [catalogoLocal, busqueda]);

  function procesarRespuesta(
    data: {
      registro: { id: string; ts: string };
      xp_ganada: number;
      descubierta: boolean;
      logros_nuevos: LogroNuevo[];
    },
    icono: string
  ) {
    setUltimo({
      id: data.registro.id,
      ts: new Date(data.registro.ts).getTime(),
      xp: data.xp_ganada,
    });
    if (navigator.vibrate) navigator.vibrate(40);
    const idAnim = contador.current++;
    const texto = data.descubierta
      ? `🆕 +${data.xp_ganada} XP`
      : `+${data.xp_ganada} XP`;
    setMasUnos((prev) => [...prev, { id: idAnim, icono, texto }]);
    setTimeout(
      () => setMasUnos((prev) => prev.filter((m) => m.id !== idAnim)),
      900
    );

    if (data.logros_nuevos?.length > 0) {
      setColaLogros((prev) => [...prev, ...data.logros_nuevos]);
      const notable = data.logros_nuevos.find((l) =>
        ["rara", "epica", "legendaria"].includes(l.rareza)
      );
      if (notable) {
        fetch("/api/notificar-logro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Solo la sala: el servidor comprueba en la base qué logro se
          // acaba de conceder y saca los textos de ahí.
          body: JSON.stringify({ salaId }),
        }).catch((err) => console.error("notificar-logro:", err));
      }
    }
  }

  async function registrar(bebida: BebidaTipo) {
    setCargando(true);
    setError(null);
    const { data, error } = await supabase.rpc("registrar_bebida_suelta", {
      p_sala: salaId,
      p_bebida_tipo_id: bebida.id,
    });
    setCargando(false);
    if (error || !data) {
      setError("No se pudo registrar. Inténtalo otra vez.");
      return;
    }
    procesarRespuesta(data, bebida.icono);
  }

  async function registrarConcreta(item: BebidaCatalogo) {
    setCargando(true);
    setError(null);
    const { data, error } = await supabase.rpc("registrar_bebida_suelta", {
      p_sala: salaId,
      p_bebida_tipo_id: item.categoriaId,
      p_bebida_catalogo_id: item.id,
    });
    setCargando(false);
    if (error || !data) {
      setError("No se pudo registrar. Inténtalo otra vez.");
      return;
    }
    const icono = categoriaPorId.get(item.categoriaId)?.icono ?? "🥤";
    procesarRespuesta(data, icono);
  }

  async function anadirYRegistrar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoNombre.trim() || nuevaCategoria === "") return;
    setAnadiendo(true);
    setError(null);
    const { data: nueva, error: errorCrear } = await supabase.rpc(
      "crear_bebida_catalogo",
      {
        p_sala: salaId,
        p_nombre: nuevoNombre.trim(),
        p_categoria_id: nuevaCategoria,
      }
    );
    if (errorCrear || !nueva) {
      setAnadiendo(false);
      setError("No se pudo añadir esa bebida.");
      return;
    }
    const item: BebidaCatalogo = {
      id: nueva.id,
      nombre: nueva.nombre,
      rareza: nueva.rareza,
      categoriaId: nueva.categoria_id,
    };
    setCatalogoLocal((prev) =>
      prev.some((c) => c.id === item.id) ? prev : [...prev, item]
    );
    setNuevoNombre("");
    setNuevaCategoria("");
    setAnadiendo(false);
    await registrarConcreta(item);
  }

  async function deshacer() {
    if (!ultimo) return;
    const { error } = await supabase.rpc("anular_bebida_suelta", {
      p_registro_id: ultimo.id,
    });
    if (!error) setUltimo(null);
  }

  const puedoDeshacer = ultimo && ahora - ultimo.ts < 30000;

  return (
    <section className="relative mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
      {logroActual && (
        <div className="fixed inset-x-0 top-6 z-50 mx-auto flex max-w-md justify-center px-5">
          <div className="subir-podio flex items-center gap-3 rounded-2xl border-2 border-ambar bg-tarjeta px-5 py-4 glow-ambar">
            <MedalIcon
              icono={logroActual.icono}
              nombre={logroActual.nombre}
              rareza={logroActual.rareza}
              className="h-14 w-14"
            />
            <div>
              <p className="font-titulo text-xs text-texto2">
                ¡Logro desbloqueado!
              </p>
              <p className="font-titulo text-lg text-ambar">
                {logroActual.nombre}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {masUnos.map((m) => (
          <span
            key={m.id}
            className="mas-uno pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap text-2xl"
          >
            {m.icono} {m.texto}
          </span>
        ))}
        <h2 className="mb-1 font-titulo text-xl text-texto">
          🥤 Registrar una bebida
        </h2>
        <p className="mb-4 text-xs text-texto2">
          Se puede añadir en cualquier momento. Suma XP a tu nivel general,
          pero no cuenta para la liga: para eso hace falta iniciar una noche.
        </p>
      </div>

      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setVista("rapido")}
          className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition active:scale-95 ${
            vista === "rapido"
              ? "border-ambar bg-ambar/10 text-ambar"
              : "border-borde text-texto2"
          }`}
        >
          Rápido
        </button>
        <button
          onClick={() => setVista("concreta")}
          className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition active:scale-95 ${
            vista === "concreta"
              ? "border-ambar bg-ambar/10 text-ambar"
              : "border-borde text-texto2"
          }`}
        >
          🔍 Bebida concreta
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-rosa">{error}</p>}

      {vista === "rapido" ? (
        <div className="grid grid-cols-4 gap-2">
          {bebidas.map((b) => (
            <button
              key={b.id}
              onClick={() => registrar(b)}
              disabled={cargando}
              className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-borde bg-fondo py-3 transition active:scale-90 active:border-ambar disabled:opacity-40"
            >
              <span className="text-3xl">{b.icono}</span>
              <span className="mt-1 text-center text-[11px] leading-tight text-texto">
                {b.nombre}
              </span>
              <span className="text-[10px] text-texto2">+{XP_BASE} XP</span>
            </button>
          ))}
        </div>
      ) : (
        <div>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar (ej: Budweiser, Mahou…)"
            className="mb-3 w-full rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto placeholder-texto2 outline-none focus:border-ambar"
          />

          <div className="mb-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {resultadosBusqueda.map((c) => {
              const cat = categoriaPorId.get(c.categoriaId);
              const bonus = XP_BONUS_RAREZA[c.rareza] ?? 0;
              return (
                <button
                  key={c.id}
                  onClick={() => registrarConcreta(c)}
                  disabled={cargando}
                  className={`flex w-full items-center justify-between rounded-xl border bg-fondo px-3 py-2 text-left text-sm transition active:scale-[0.98] disabled:opacity-40 ${RAREZA_ESTILO[c.rareza] ?? "border-borde"}`}
                >
                  <span className="flex items-center gap-2 text-texto">
                    <span>{cat?.icono ?? "🥤"}</span>
                    {c.nombre}
                  </span>
                  <span className="text-right text-[11px]">
                    <span className="block">{RAREZA_NOMBRE[c.rareza] ?? c.rareza}</span>
                    <span className="block text-texto2">
                      +{XP_BASE} XP{bonus > 0 ? ` (+${XP_BASE + bonus} 1ª vez)` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
            {resultadosBusqueda.length === 0 && (
              <p className="py-3 text-center text-xs text-texto2">
                No hay ninguna así. ¡Añádela abajo!
              </p>
            )}
          </div>

          <form
            onSubmit={anadirYRegistrar}
            className="rounded-2xl border border-dashed border-borde p-3"
          >
            <p className="mb-2 text-xs font-semibold text-texto2">
              ➕ Añadir una nueva
            </p>
            <input
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Nombre (ej: Voll-Damm)"
              className="mb-2 w-full rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto placeholder-texto2 outline-none focus:border-ambar"
            />
            <select
              value={nuevaCategoria}
              onChange={(e) =>
                setNuevaCategoria(e.target.value ? Number(e.target.value) : "")
              }
              className="mb-2 w-full rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto outline-none focus:border-ambar"
            >
              <option value="">Tipo de bebida…</option>
              {bebidas.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.icono} {b.nombre}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={anadiendo || cargando || !nuevoNombre.trim() || nuevaCategoria === ""}
              className="w-full rounded-xl bg-ambar py-2 text-sm font-semibold text-fondo transition active:scale-95 disabled:opacity-40"
            >
              {anadiendo ? "Añadiendo…" : "Añadir y registrar"}
            </button>
          </form>
        </div>
      )}

      {ultimo && <SitioPicker key={ultimo.id} registroId={ultimo.id} />}

      {puedoDeshacer && (
        <button
          onClick={deshacer}
          className="mt-4 w-full rounded-xl border border-rosa py-2 text-sm text-rosa active:scale-95"
        >
          ↩️ Deshacer última
        </button>
      )}
    </section>
  );
}

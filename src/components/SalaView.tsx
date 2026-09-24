"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { calcularDivision } from "@/lib/liga";
import { marcoPorLiga } from "@/lib/marcos";
import { type AvatarConfig } from "@/lib/avatar";
import AvatarFramePreview from "@/components/AvatarFramePreview";
import BebidaSueltaLogger, {
  type BebidaTipo,
  type BebidaCatalogo,
} from "@/components/BebidaSueltaLogger";
import SojasLogger from "@/components/SojasLogger";
import { useModalScrollLock } from "@/lib/useModalScrollLock";

export type Miembro = {
  id: string;
  nombre: string;
  rol: string;
  avatarConfig: AvatarConfig;
};
export type NocheResumen = {
  id: string;
  inicio: string;
  ganador: string | null;
  jugadores: number;
};
export type EntradaLiga = {
  usuarioId: string;
  nombre: string;
  avatarConfig: AvatarConfig;
  pl: number;
};

const DURACIONES = [
  { horas: 4, etiqueta: "4 horas" },
  { horas: 6, etiqueta: "6 horas" },
  { horas: 8, etiqueta: "8 horas" },
  { horas: 12, etiqueta: "12 horas" },
];

export default function SalaView({
  sala,
  esTemporada,
  esPermanente,
  bebidasSueltas,
  catalogoBebidas,
  racha,
  miembros,
  miRol,
  userId,
  nocheActiva,
  nochesCerradas,
  temporada,
  liga,
}: {
  sala: { id: string; nombre: string; codigo: string };
  esTemporada: boolean;
  esPermanente: boolean;
  bebidasSueltas: BebidaTipo[];
  catalogoBebidas: BebidaCatalogo[];
  racha: { actual: number; mejor: number };
  miembros: Miembro[];
  miRol: string;
  userId: string;
  nocheActiva: { id: string; estado: "activa" | "cerrando" | "pendiente" } | null;
  nochesCerradas: NocheResumen[];
  temporada: { id: string; nombre: string; fin: string } | null;
  liga: EntradaLiga[];
}) {
  const router = useRouter();
  const [eligiendoDuracion, setEligiendoDuracion] = useState(false);
  const [hastaFecha, setHastaFecha] = useState("");
  const [minFecha, setMinFecha] = useState("");
  const [errorFecha, setErrorFecha] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [archivarAbierto, setArchivarAbierto] = useState(false);
  const [confirmacionSala, setConfirmacionSala] = useState("");
  const [archivando, setArchivando] = useState(false);
  const [errorArchivar, setErrorArchivar] = useState<string | null>(null);
  const esAdmin = miRol === "fundador" || miRol === "admin";
  useModalScrollLock(archivarAbierto);

  async function archivarSala(e: React.FormEvent) {
    e.preventDefault();
    if (confirmacionSala !== sala.nombre || archivando || nocheActiva) return;
    setArchivando(true);
    setErrorArchivar(null);
    const { error } = await createClient().rpc("archivar_sala", { p_sala: sala.id });
    setArchivando(false);
    if (error) {
      setErrorArchivar(error.message);
      return;
    }
    setArchivarAbierto(false);
    router.push("/");
    router.refresh();
  }

  async function compartirCodigo() {
    const texto = `¡Únete a "${sala.nombre}" en El Ranking! 🍻 Código: ${sala.codigo}`;
    if (navigator.share) {
      try {
        await navigator.share({ text: texto });
        return;
      } catch {
        // cancelado por el usuario
      }
    } else {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  async function iniciarNoche(horas: number) {
    setCargando(true);
    const supabase = createClient();
    const fin = new Date(new Date().getTime() + horas * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from("noches")
      .insert({ sala_id: sala.id, creada_por: userId, fin_programado: fin })
      .select("id")
      .single();
    setCargando(false);
    if (!error && data) {
      fetch("/api/notificar-noche", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salaId: sala.id,
          salaNombre: sala.nombre,
          nocheId: data.id,
          userId,
        }),
      })
        .then(async (r) => {
          if (!r.ok) console.error("notificar-noche:", await r.text());
        })
        .catch((err) => {
          // el push es un extra: si falla el envío, la noche ya se creó igualmente
          console.error("notificar-noche:", err);
        });
      router.push(`/noche/${data.id}`);
    }
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <header className="mb-6">
        <Link href="/" className="text-sm text-texto2">
          ← Tus salas
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="font-titulo text-3xl text-texto">{sala.nombre}</h1>
            {esTemporada && (
              <span className="mt-1 inline-block rounded-full border border-ambar/50 bg-ambar/10 px-2 py-0.5 text-xs text-ambar">
                🗓️ Sala de temporada
              </span>
            )}
            {esPermanente && (
              <span className="mt-1 inline-block rounded-full border border-cian/50 bg-cian/10 px-2 py-0.5 text-xs text-cian">
                ♾️ Sala permanente
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {esAdmin && (
              <Link
                href={`/sala/${sala.id}/ajustes`}
                className="rounded-xl border border-borde px-3 py-2 text-sm text-texto2 active:scale-95"
              >
                ⚖️
              </Link>
            )}
            <button
              onClick={compartirCodigo}
              className="rounded-xl border border-cian px-3 py-2 text-sm text-cian active:scale-95"
            >
              {copiado ? "¡Copiado!" : `${sala.codigo} 📤`}
            </button>
          </div>
        </div>
      </header>

      {esPermanente && racha.actual > 0 && (
        <div className="mb-4 flex items-center justify-center gap-2 rounded-2xl border border-ambar/50 bg-ambar/10 px-4 py-3 text-center">
          <span className="text-2xl">🔥</span>
          <span className="text-sm text-texto">
            <span className="font-titulo text-ambar">
              {racha.actual} día{racha.actual === 1 ? "" : "s"}
            </span>{" "}
            seguidos registrando algo
            {racha.mejor > racha.actual && (
              <span className="text-texto2"> · récord: {racha.mejor}</span>
            )}
          </span>
        </div>
      )}
      {esPermanente && racha.actual === 0 && racha.mejor > 0 && (
        <div className="mb-4 rounded-2xl border border-borde bg-tarjeta px-4 py-3 text-center text-sm text-texto2">
          Se te apagó la racha (llegaste a {racha.mejor} día
          {racha.mejor === 1 ? "" : "s"}). Registra algo hoy para empezar otra
          🔥
        </div>
      )}

      {esPermanente && (
        <>
          <BebidaSueltaLogger
            salaId={sala.id}
            bebidas={bebidasSueltas.filter((b) => b.nombre !== "Agua/Refresco")}
            catalogo={catalogoBebidas.filter((b) =>
              b.categoriaId !== bebidasSueltas.find((tipo) => tipo.nombre === "Agua/Refresco")?.id
            )}
          />
          <SojasLogger salaId={sala.id} />
        </>
      )}

      {nocheActiva && nocheActiva.estado === "pendiente" ? (
        <Link
          href={`/noche/${nocheActiva.id}`}
          className="mb-8 block rounded-3xl border-2 border-ambar bg-tarjeta p-6 text-center transition active:scale-[0.98]"
        >
          <span className="font-titulo text-2xl text-ambar">
            ⏳ NOCHE PENDIENTE
          </span>
          <p className="text-sm text-texto2">
            Esperando a que se una alguien más para arrancar
          </p>
        </Link>
      ) : nocheActiva ? (
        <Link
          href={`/noche/${nocheActiva.id}`}
          className="mb-8 block rounded-3xl bg-ambar p-6 text-center transition active:scale-[0.98] pulso-neon"
        >
          <span className="font-titulo text-2xl text-fondo">
            🌙 NOCHE EN CURSO
          </span>
          <p className="text-sm font-semibold text-fondo/70">
            Toca para entrar y registrar
          </p>
        </Link>
      ) : eligiendoDuracion ? (
        <div className="mb-8 rounded-3xl border border-borde bg-tarjeta p-6">
          {esTemporada ? (
            <>
              <h3 className="mb-4 font-titulo text-lg text-ambar">
                ¿Hasta cuándo dura la temporada?
              </h3>
              <input
                type="datetime-local"
                value={hastaFecha}
                min={minFecha}
                onChange={(e) => setHastaFecha(e.target.value)}
                className="mb-3 w-full rounded-2xl border border-borde bg-fondo px-4 py-3 text-texto outline-none focus:border-ambar"
              />
              {errorFecha && (
                <p className="mb-3 text-sm text-rosa">{errorFecha}</p>
              )}
              <button
                disabled={cargando}
                onClick={() => {
                  if (!hastaFecha) {
                    setErrorFecha("Elige una fecha y hora de fin.");
                    return;
                  }
                  const horas =
                    (new Date(hastaFecha).getTime() - Date.now()) /
                    (3600 * 1000);
                  if (!Number.isFinite(horas) || horas <= 0) {
                    setErrorFecha("La fecha de fin debe ser posterior a ahora.");
                    return;
                  }
                  setErrorFecha(null);
                  iniciarNoche(horas);
                }}
                className="w-full rounded-2xl border-2 border-ambar py-4 font-titulo text-lg text-ambar transition active:scale-95 disabled:opacity-50"
              >
                Empezar temporada
              </button>
              <p className="mt-3 text-center text-xs text-texto2">
                Se podrán registrar bebidas durante todo ese periodo. Se
                cierra sola al llegar la fecha, o antes si la cierra un admin.
              </p>
            </>
          ) : (
            <>
              <h3 className="mb-4 font-titulo text-lg text-ambar">
                ¿Cuánto va a durar la noche?
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {DURACIONES.map((d) => (
                  <button
                    key={d.horas}
                    disabled={cargando}
                    onClick={() => iniciarNoche(d.horas)}
                    className="rounded-2xl border-2 border-ambar py-4 font-titulo text-lg text-ambar transition active:scale-95 disabled:opacity-50"
                  >
                    {d.etiqueta}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-texto2">
                {esPermanente
                  ? "Se cierra sola al acabar el tiempo (que empieza a contar cuando arranque de verdad), o antes si la cierra un admin."
                  : "Se cierra sola al acabar el tiempo, o antes si la cierra un admin."}
              </p>
              {esPermanente && (
                <p className="mt-2 text-center text-xs text-cian">
                  ⏳ Con 2 o más miembros en la sala, la noche se queda
                  pendiente hasta que se una una segunda persona. Si sois solo
                  tú, arranca al momento.
                </p>
              )}
            </>
          )}
          <button
            onClick={() => setEligiendoDuracion(false)}
            className="mt-3 w-full rounded-2xl border border-borde py-3 text-texto2 active:scale-95"
          >
            Cancelar
          </button>
        </div>
      ) : esAdmin ? (
        <button
          onClick={() => {
            setMinFecha(
              new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)
            );
            setEligiendoDuracion(true);
          }}
          className="mb-8 w-full rounded-3xl bg-ambar p-6 font-titulo text-2xl text-fondo transition active:scale-[0.98] glow-ambar"
        >
          {esTemporada ? "🗓️ Iniciar temporada" : "🌙 Iniciar noche"}
        </button>
      ) : (
        <div className="mb-8 rounded-3xl border border-borde bg-tarjeta p-6 text-center">
          <p className="text-texto2">
            😴 No hay noche activa. Un admin puede iniciarla.
          </p>
        </div>
      )}

      {/* Liga de la temporada */}
      <section className="mb-8">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="font-titulo text-xl text-texto">🏆 Liga</h2>
          {temporada && (
            <span className="text-xs text-texto2">
              {temporada.nombre} · acaba el{" "}
              {new Date(temporada.fin).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
              })}
            </span>
          )}
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Link
            href={`/niveles?sala=${sala.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-cian/50 bg-cian/10 px-3 py-1.5 text-xs font-semibold text-cian transition active:scale-95"
          >
            📈 Ver niveles
          </Link>
          <Link
            href={`/sala/${sala.id}/estadisticas`}
            className="inline-flex items-center gap-1.5 rounded-full border border-lima/50 bg-lima/10 px-3 py-1.5 text-xs font-semibold text-lima transition active:scale-95"
          >
            📊 Estadísticas
          </Link>
          {esPermanente && (
            <Link
              href={`/sala/${sala.id}/registros`}
              className="inline-flex items-center gap-1.5 rounded-full border border-rosa/50 bg-rosa/10 px-3 py-1.5 text-xs font-semibold text-rosa transition active:scale-95"
            >
              🥤 Bebidas de la sala
            </Link>
          )}
        </div>
        {liga.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
            La liga arranca con vuestra primera noche 🌙
          </p>
        ) : (
          <ul className="space-y-2">
            {liga.map((e, i) => {
              const div = calcularDivision(e.pl, i === 0);
              return (
                <li key={e.usuarioId}>
                  <Link
                    href={`/perfil/${e.usuarioId}?sala=${sala.id}`}
                    className={`flex items-center justify-between rounded-2xl border bg-tarjeta px-4 py-3 transition active:scale-[0.98] ${
                      i === 0 && e.pl > 0 ? "border-oro" : "border-borde"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-texto">
                      <span className="font-titulo text-texto2">
                      {i + 1}.
                      </span>
                      <AvatarFramePreview
                        config={e.avatarConfig}
                        marco={marcoPorLiga(e.pl, i === 0)}
                        titulo={e.nombre}
                        subtitulo={`${div.nombre} · ${e.pl} PL`}
                        triggerClassName="h-9 w-9"
                        previewClassName="h-72 w-72"
                        asSpan
                      />
                      <span>
                        {e.nombre}
                        {e.usuarioId === userId && (
                          <span className="ml-1 text-xs text-texto2">(tú)</span>
                        )}
                        <span className={`ml-2 text-xs ${div.color}`}>
                          {div.icono} {div.nombre}
                        </span>
                      </span>
                    </span>
                    <span className="font-titulo text-lima">{e.pl} PL</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {miRol === "fundador" && (
        <section className="mt-10 border-t border-borde pt-6">
          <button
            type="button"
            onClick={() => { setConfirmacionSala(""); setErrorArchivar(null); setArchivarAbierto(true); }}
            disabled={Boolean(nocheActiva)}
            className="rounded-lg border border-rosa/50 px-3 py-2 text-sm text-rosa disabled:opacity-40"
          >
            Archivar sala
          </button>
          {nocheActiva && <p className="mt-2 text-xs text-texto2">Cierra la noche antes de archivar.</p>}
        </section>
      )}
      {archivarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setArchivarAbierto(false); }}>
          <form
            onSubmit={(e) => void archivarSala(e)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-archivar-sala"
            className="w-full max-w-sm rounded-lg border border-borde bg-tarjeta p-5"
          >
            <h2 id="titulo-archivar-sala" className="font-titulo text-xl text-texto">Archivar {sala.nombre}</h2>
            <p className="mt-2 text-sm text-texto2">La sala desaparecerá para los miembros, pero conservará sus noches y estadísticas. Podrás restaurarla desde Tus salas.</p>
            <label htmlFor="nombre-archivar-sala" className="mt-5 block text-sm text-texto">Escribe {sala.nombre} para confirmar</label>
            <input
              id="nombre-archivar-sala"
              autoFocus
              value={confirmacionSala}
              onChange={(e) => setConfirmacionSala(e.target.value)}
              className="mt-2 w-full rounded-lg border border-borde bg-fondo px-3 py-2 text-texto outline-none focus:border-rosa"
            />
            {errorArchivar && <p role="alert" className="mt-3 text-sm text-rosa">{errorArchivar}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setArchivarAbierto(false)} className="rounded-lg border border-borde px-3 py-2 text-sm text-texto2">Cancelar</button>
              <button type="submit" disabled={confirmacionSala !== sala.nombre || archivando} className="rounded-lg bg-rosa px-3 py-2 text-sm font-semibold text-fondo disabled:opacity-40">
                {archivando ? "Archivando…" : "Archivar"}
              </button>
            </div>
          </form>
        </div>
      )}

      <details className="group mb-8">
        <summary className="mb-3 flex cursor-pointer list-none items-center justify-between font-titulo text-xl text-texto focus-visible:outline-cian">
          Miembros ({miembros.length}) <span aria-hidden="true" className="text-base text-texto2 group-open:rotate-180">⌄</span>
        </summary>
        <ul className="space-y-2">
          {miembros.map((m) => (
            <li key={m.id}>
              <Link
                href={`/perfil/${m.id}?sala=${sala.id}`}
                className="flex items-center justify-between rounded-2xl border border-borde bg-tarjeta px-4 py-3 transition active:scale-[0.98]"
              >
                <span className="flex items-center gap-2 text-texto">
                  <AvatarFramePreview
                    config={m.avatarConfig}
                    titulo={m.nombre}
                    subtitulo={m.rol === "miembro" ? "Miembro" : m.rol}
                    triggerClassName="h-9 w-9"
                    previewClassName="h-72 w-72"
                    asSpan
                  />
                  <span>
                    {m.nombre}
                    {m.id === userId && (
                      <span className="ml-2 text-xs text-texto2">(tú)</span>
                    )}
                  </span>
                </span>
                {m.rol !== "miembro" && (
                  <span className="rounded-full bg-fondo px-2 py-1 text-xs text-ambar">
                    {m.rol === "fundador" ? "👑 fundador" : "⭐ admin"}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </details>

      <details className="group">
        <summary className="mb-3 flex cursor-pointer list-none items-center justify-between font-titulo text-xl text-texto focus-visible:outline-cian">
          Últimas noches <span aria-hidden="true" className="text-base text-texto2 group-open:rotate-180">⌄</span>
        </summary>
        {nochesCerradas.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-5 text-center text-sm text-texto2">
            Aún no hay historia que contar… 📖
          </p>
        ) : (
          <ul className="space-y-2">
            {nochesCerradas.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/noche/${n.id}/podio`}
                  className="flex items-center justify-between rounded-2xl border border-borde bg-tarjeta px-4 py-3 transition active:scale-[0.98]"
                >
                  <div>
                    <span className="text-sm text-texto">
                      {new Date(n.inicio).toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <p className="text-xs text-texto2">
                      {n.jugadores} jugadores
                    </p>
                  </div>
                  {n.ganador && (
                    <span className="text-sm text-oro">🏆 {n.ganador}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </details>
    </main>
  );
}

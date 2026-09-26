import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AvatarFramePreview from "@/components/AvatarFramePreview";
import MedalIcon from "@/components/MedalIcon";
import ProfileAchievementDetails from "@/components/ProfileAchievementDetails";
import PerfilCustomizer from "@/components/PerfilCustomizer";
import NombreEditor from "@/components/NombreEditor";
import BackButton from "@/components/BackButton";
import { progresoNivel } from "@/lib/niveles";
import { parseAvatarConfig } from "@/lib/avatar";
import { calcularDivision } from "@/lib/liga";
import { marcoPorLiga, marcoPorNivel } from "@/lib/marcos";
import { parseTiendaState } from "@/lib/tienda";

const RAREZA_ESTILO: Record<string, string> = {
  comun: "border-borde text-texto2",
  rara: "border-cian/60 text-cian",
  epica: "border-rosa/60 text-rosa",
  legendaria: "border-oro text-oro",
};

export default async function PerfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sala?: string }>;
}) {
  const { id } = await params;
  const { sala: salaParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, created_at, avatar_config, xp, titulo, vitrina")
    .eq("id", id)
    .single();

  if (!perfil) notFound();
  const avatar = parseAvatarConfig(perfil.avatar_config);
  const tienda = parseTiendaState(perfil.avatar_config);
  const nivel = progresoNivel(perfil.xp ?? 0);
  const marcoNivel = marcoPorNivel(nivel.nivel);
  const marcoPersonal = tienda.marcoEquipado ?? marcoNivel;
  const vitrinaSlugs = (perfil.vitrina ?? []) as string[];

  const { data: salasPerfilRaw } = await supabase
    .from("sala_miembros")
    .select("sala_id, salas(id, nombre)")
    .eq("usuario_id", id)
    .order("joined_at");
  const salasPerfil = (salasPerfilRaw ?? [])
    .map((m) => {
      const sala = m.salas as unknown as { id: string; nombre: string } | null;
      return sala ? { id: sala.id, nombre: sala.nombre } : null;
    })
    .filter((sala): sala is { id: string; nombre: string } => Boolean(sala));
  const salaContexto = salaParam
    ? salasPerfil.find((sala) => sala.id === salaParam) ?? null
    : null;

  // Noches jugadas (solo cerradas, visibles según salas compartidas)
  const { data: participaciones } = await supabase
    .from("noche_jugadores")
    .select("noche_id, posicion_final, pl_ganados, noches!inner(estado, inicio)")
    .eq("usuario_id", id)
    .eq("noches.estado", "cerrada");

  // Colección de medallas (repetibles: COUNT = contador ×N)
  const { data: medallas } = await supabase
    .from("logros_usuario")
    .select("noche_id, logros(slug, nombre, icono, descripcion, rareza, repetible)")
    .eq("usuario_id", id);

  const noches = participaciones ?? [];
  const fechasNoches = new Map(
    noches.map((n) => [
      n.noche_id,
      (n.noches as unknown as { inicio: string } | null)?.inicio ?? null,
    ])
  );

  let rankingSala:
    | {
        salaId: string;
        salaNombre: string;
        temporadaNombre: string | null;
        pl: number;
        posicion: number | null;
        jugadores: number;
        esTop1: boolean;
      }
    | null = null;

  if (salaContexto) {
    const { data: temporadaSala } = await supabase
      .from("temporadas")
      .select("id, nombre")
      .eq("sala_id", salaContexto.id)
      .eq("estado", "activa")
      .gt("fin", new Date().toISOString())
      .maybeSingle();

    if (temporadaSala) {
      const { data: ligaSalaRaw } = await supabase
        .from("liga")
        .select("usuario_id, pl")
        .eq("temporada_id", temporadaSala.id)
        .order("pl", { ascending: false });
      const ligaSala = ligaSalaRaw ?? [];
      const indice = ligaSala.findIndex((entrada) => entrada.usuario_id === id);
      const entrada = indice >= 0 ? ligaSala[indice] : null;
      rankingSala = {
        salaId: salaContexto.id,
        salaNombre: salaContexto.nombre,
        temporadaNombre: temporadaSala.nombre,
        pl: entrada?.pl ?? 0,
        posicion: indice >= 0 ? indice + 1 : null,
        jugadores: ligaSala.length,
        esTop1: indice === 0,
      };
    } else {
      rankingSala = {
        salaId: salaContexto.id,
        salaNombre: salaContexto.nombre,
        temporadaNombre: null,
        pl: 0,
        posicion: null,
        jugadores: 0,
        esTop1: false,
      };
    }
  }
  const divisionSala = rankingSala
    ? calcularDivision(rankingSala.pl, rankingSala.esTop1)
    : null;
  const marcoLigaSala = rankingSala
    ? marcoPorLiga(rankingSala.pl, rankingSala.esTop1)
    : "madera";

  // Medallas agrupadas con contador
  const coleccion = new Map<
    string,
    {
      slug: string;
      nombre: string;
      icono: string;
      descripcion: string;
      rareza: string;
      repetible: boolean;
      n: number;
      fechas: string[];
    }
  >();
  for (const m of medallas ?? []) {
    const l = m.logros as unknown as {
      slug: string;
      nombre: string;
      icono: string;
      descripcion: string;
      rareza: string;
      repetible: boolean;
    } | null;
    if (!l) continue;
    const e = coleccion.get(l.slug) ?? { ...l, n: 0, fechas: [] };
    e.n += 1;
    const fecha = m.noche_id ? fechasNoches.get(m.noche_id) : null;
    if (fecha) e.fechas.push(fecha);
    coleccion.set(l.slug, e);
  }
  const ordenRareza = ["legendaria", "epica", "rara", "comun"];
  const medallasOrdenadas = [...coleccion.values()].sort(
    (a, b) =>
      ordenRareza.indexOf(a.rareza) - ordenRareza.indexOf(b.rareza) || b.n - a.n
  );

  const esMiPerfil = user?.id === id;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <BackButton />

      <header className="mb-8 mt-4 text-center">
        <div className="mb-4 flex flex-col items-center">
          <AvatarFramePreview
            config={avatar}
            marco={marcoPersonal}
            titulo={perfil.nombre}
            subtitulo={`Nivel ${nivel.nivel}`}
            triggerClassName="h-32 w-32"
            previewClassName="h-80 w-80"
          />
          <p className="mt-3 font-titulo text-sm text-cian">
            Nivel {nivel.nivel}
          </p>
        </div>

        <h1 className="font-titulo text-3xl text-texto">
          {perfil.nombre}
          {esMiPerfil && (
            <span className="ml-2 text-sm text-texto2">(tú)</span>
          )}
        </h1>
        {perfil.titulo && (
          <div>
            {medallasOrdenadas.find((m) => m.nombre === perfil.titulo) ? (
              <ProfileAchievementDetails
                achievement={medallasOrdenadas.find((m) => m.nombre === perfil.titulo)!}
                variant="title"
              />
            ) : (
              <p className="font-titulo text-sm text-ambar">« {perfil.titulo} »</p>
            )}
          </div>
        )}
        {esMiPerfil && <NombreEditor actual={perfil.nombre} />}
        <p className="mb-3 text-xs text-texto2">
          En El Ranking desde{" "}
          {new Date(perfil.created_at).toLocaleDateString("es-ES", {
            month: "long",
            year: "numeric",
          })}
        </p>

        <div className={`mb-5 grid gap-3 text-left ${rankingSala ? "grid-cols-2" : "grid-cols-1"}`}>
          <section className="rounded-2xl border border-cian/50 bg-tarjeta p-3">
            <p className="mb-2 font-titulo text-xs uppercase text-cian">
              Nivel personal
            </p>
            <div className="mb-2 flex justify-center">
              <AvatarFramePreview
                config={avatar}
                marco={marcoPersonal}
                titulo={perfil.nombre}
                subtitulo={`Nivel personal ${nivel.nivel}`}
                triggerClassName="h-24 w-24"
                previewClassName="h-72 w-72"
              />
            </div>
            <p className="mb-2 text-center font-titulo text-xl text-texto">
              Nivel {nivel.nivel}
            </p>
            <div className="mb-1 flex justify-between text-[11px] text-texto2">
              <span>XP</span>
              <span>
                {nivel.actual}/{nivel.necesario}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-fondo">
              <div
                className="h-full rounded-full bg-cian transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((nivel.actual / nivel.necesario) * 100)
                  )}%`,
                }}
              />
            </div>
          </section>

          {rankingSala && <section className="rounded-2xl border border-ambar/50 bg-tarjeta p-3">
            <p className="mb-2 font-titulo text-xs uppercase text-ambar">
              Liga de sala
            </p>
            <div className="mb-2 flex justify-center">
              <AvatarFramePreview
                config={avatar}
                marco={marcoLigaSala}
                titulo={divisionSala?.nombre ?? "Liga de sala"}
                subtitulo={
                  rankingSala
                    ? `${rankingSala.salaNombre} · ${rankingSala.pl} PL`
                    : "Sin sala"
                }
                triggerClassName="h-24 w-24"
                previewClassName="h-72 w-72"
              />
            </div>
            {rankingSala && divisionSala ? (
              <>
                <p className="text-center font-titulo text-lg text-texto">
                  {rankingSala.posicion
                    ? `#${rankingSala.posicion}`
                    : "Sin puesto"}
                </p>
                <p className={`text-center font-titulo text-xs ${divisionSala.color}`}>
                  {divisionSala.icono} {divisionSala.nombre}
                </p>
                <p className="mt-1 truncate text-center text-[11px] text-texto2">
                  {rankingSala.salaNombre}
                </p>
                <p className="text-center font-titulo text-sm text-lima">
                  {rankingSala.pl} PL
                </p>
              </>
            ) : (
              <>
                <p className="text-center font-titulo text-lg text-texto">
                  Sin sala
                </p>
                <p className="text-center text-xs text-texto2">
                  Entra desde una sala para ver su ranking.
                </p>
              </>
            )}
          </section>}
        </div>

        {rankingSala && (
          <div className="mb-5 rounded-2xl border border-borde bg-tarjeta px-4 py-3 text-left">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-titulo text-sm text-texto">
                  Ranking en {rankingSala.salaNombre}
                </p>
                <p className="text-xs text-texto2">
                  {rankingSala.temporadaNombre
                    ? rankingSala.temporadaNombre
                    : "Sin temporada activa"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-titulo text-lg text-lima">
                  {rankingSala.pl} PL
                </p>
                <p className="text-xs text-texto2">
                  {rankingSala.posicion
                    ? `${rankingSala.posicion}/${rankingSala.jugadores}`
                    : "sin liga"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vitrina */}
        {vitrinaSlugs.length > 0 && (
          <div className="mb-3 flex justify-center gap-3">
            {vitrinaSlugs.map((slug) => {
              const m = coleccion.get(slug);
              if (!m) return null;
              return (
                <span
                  key={slug}
                  title={m.nombre}
                  className="inline-flex"
                >
                  <ProfileAchievementDetails achievement={m} variant="medal" />
                </span>
              );
            })}
          </div>
        )}

        <div className="mx-auto mb-2 flex flex-wrap justify-center gap-2">
          {esMiPerfil && <>
            <Link
              href="/tienda"
              className="rounded-xl border border-ambar px-4 py-2 text-xs text-ambar active:scale-95"
            >
              🪙 Tienda
            </Link>
            <Link
              href="/inventario"
              className="rounded-xl border border-cian px-4 py-2 text-xs text-cian active:scale-95"
            >
              🎴 Inventario
            </Link>
            <Link
              href="/mapa"
              className="rounded-xl border border-rosa px-4 py-2 text-xs text-rosa active:scale-95"
            >
              🗺️ Mapa de sitios
            </Link>
          </>}
          <Link
            href={`/perfil/${id}/estadisticas${salaContexto ? `?sala=${salaContexto.id}` : ""}`}
            className="rounded-xl border border-lima px-4 py-2 text-xs text-lima active:scale-95"
          >
            📊 Estadísticas
          </Link>
        </div>
        {esMiPerfil && (
          <PerfilCustomizer
            tituloActual={perfil.titulo}
            vitrinaActual={vitrinaSlugs}
            medallas={medallasOrdenadas.map((m) => ({
              slug: m.slug,
              nombre: m.nombre,
              icono: m.icono,
              rareza: m.rareza,
            }))}
          />
        )}
      </header>

      {/* Colección de medallas */}
      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-titulo text-xl text-texto">
            🏅 Medallas ({medallasOrdenadas.length})
          </h2>
          <Link href="/logros" className="text-xs text-cian underline">
            Ver catálogo completo
          </Link>
        </div>
        {medallasOrdenadas.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-tarjeta p-6 text-center text-sm text-texto2">
            Vitrina con telarañas… 🕸️ Las medallas se ganan saliendo.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {medallasOrdenadas.map((m) => (
              <li
                key={m.nombre}
                className={`rounded-2xl border bg-tarjeta p-4 text-center ${
                  RAREZA_ESTILO[m.rareza] ?? "border-borde"
                }`}
              >
                <div className="mb-1 flex justify-center">
                  <MedalIcon
                    icono={m.icono}
                    nombre={m.nombre}
                    slug={m.slug}
                    rareza={m.rareza}
                    className="h-16 w-16"
                    contador={m.n}
                  />
                </div>
                <p className="font-titulo text-sm text-texto">
                  {m.nombre}
                </p>
                <p className="mt-1 text-[10px] leading-tight text-texto2">
                  {m.descripcion}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

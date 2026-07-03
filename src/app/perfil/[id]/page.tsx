import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AvatarEditor from "@/components/AvatarEditor";
import AvatarFramePreview from "@/components/AvatarFramePreview";
import MedalIcon from "@/components/MedalIcon";
import PerfilCustomizer from "@/components/PerfilCustomizer";
import CumpleanosEditor from "@/components/CumpleanosEditor";
import BackButton from "@/components/BackButton";
import { progresoNivel } from "@/lib/niveles";
import { parseAvatarConfig } from "@/lib/avatar";
import { calcularDivision } from "@/lib/liga";
import { MARCO_INFO, marcoPorLiga, marcoPorNivel } from "@/lib/marcos";
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
    .select("id, nombre, created_at, avatar_config, xp, titulo, vitrina, cumpleanos")
    .eq("id", id)
    .single();

  if (!perfil) notFound();
  const avatar = parseAvatarConfig(perfil.avatar_config);
  const tienda = parseTiendaState(perfil.avatar_config);
  const nivel = progresoNivel(perfil.xp ?? 0);
  const marcoNivel = marcoPorNivel(nivel.nivel);
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
  const salaContexto =
    salasPerfil.find((sala) => sala.id === salaParam) ?? salasPerfil[0] ?? null;

  // Noches jugadas (solo cerradas, visibles según salas compartidas)
  const { data: participaciones } = await supabase
    .from("noche_jugadores")
    .select("noche_id, posicion_final, pl_ganados, noches!inner(estado, inicio)")
    .eq("usuario_id", id)
    .eq("noches.estado", "cerrada");

  // Registros históricos del usuario (en noches visibles)
  const { data: registros } = await supabase
    .from("registros")
    .select("noche_id, bebida_tipo_id, bebidas_tipo(nombre, icono)")
    .eq("usuario_id", id)
    .eq("anulado", false);

  // Colección de medallas (repetibles: COUNT = contador ×N)
  const { data: medallas } = await supabase
    .from("logros_usuario")
    .select("logros(slug, nombre, icono, descripcion, rareza)")
    .eq("usuario_id", id);

  const noches = participaciones ?? [];
  const nochesJugadas = noches.length;
  const victorias = noches.filter((n) => n.posicion_final === 1).length;
  const podios = noches.filter(
    (n) => n.posicion_final !== null && n.posicion_final! <= 3
  ).length;
  const plTotal = noches.reduce((acc, n) => acc + (n.pl_ganados ?? 0), 0);

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

  const regs = registros ?? [];
  const totalBebidas = regs.length;
  const dpn = nochesJugadas > 0 ? (totalBebidas / nochesJugadas).toFixed(1) : "—";
  const winrate =
    nochesJugadas > 0 ? Math.round((victorias / nochesJugadas) * 100) : 0;

  // Bebida favorita
  const porTipo = new Map<number, { nombre: string; icono: string; n: number }>();
  const porNoche = new Map<string, number>();
  for (const r of regs) {
    const bt = r.bebidas_tipo as unknown as {
      nombre: string;
      icono: string;
    } | null;
    if (bt) {
      const t = porTipo.get(r.bebida_tipo_id) ?? { ...bt, n: 0 };
      t.n += 1;
      porTipo.set(r.bebida_tipo_id, t);
    }
    porNoche.set(r.noche_id, (porNoche.get(r.noche_id) ?? 0) + 1);
  }
  const favorita = [...porTipo.values()].sort((a, b) => b.n - a.n)[0] ?? null;
  const record = porNoche.size > 0 ? Math.max(...porNoche.values()) : 0;

  // Medallas agrupadas con contador
  const coleccion = new Map<
    string,
    {
      slug: string;
      nombre: string;
      icono: string;
      descripcion: string;
      rareza: string;
      n: number;
    }
  >();
  for (const m of medallas ?? []) {
    const l = m.logros as unknown as {
      slug: string;
      nombre: string;
      icono: string;
      descripcion: string;
      rareza: string;
    } | null;
    if (!l) continue;
    const e = coleccion.get(l.slug) ?? { ...l, n: 0 };
    e.n += 1;
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
            marco={marcoNivel}
            titulo={perfil.nombre}
            subtitulo={`Nivel ${nivel.nivel} · ${MARCO_INFO[marcoNivel].nombre}`}
            triggerClassName="h-32 w-32"
            previewClassName="h-80 w-80"
          />
          <p className="mt-3 font-titulo text-sm text-cian">
            Nivel {nivel.nivel} · {MARCO_INFO[marcoNivel].nombre}
          </p>
          {tienda.marcoEquipado && tienda.marcoEquipado !== marcoNivel && (
            <p className="text-[11px] text-texto2">
              Marco cosmético equipado: {MARCO_INFO[tienda.marcoEquipado].nombre}
            </p>
          )}
        </div>

        <h1 className="font-titulo text-3xl text-texto">
          {perfil.nombre}
          {esMiPerfil && (
            <span className="ml-2 text-sm text-texto2">(tú)</span>
          )}
        </h1>
        {perfil.titulo && (
          <p className="font-titulo text-sm text-ambar">« {perfil.titulo} »</p>
        )}
        <p className="mb-3 text-xs text-texto2">
          En El Ranking desde{" "}
          {new Date(perfil.created_at).toLocaleDateString("es-ES", {
            month: "long",
            year: "numeric",
          })}
        </p>

        <div className="mb-5 grid grid-cols-2 gap-3 text-left">
          <section className="rounded-2xl border border-cian/50 bg-tarjeta p-3">
            <p className="mb-2 font-titulo text-xs uppercase text-cian">
              Nivel personal
            </p>
            <div className="mb-2 flex justify-center">
              <AvatarFramePreview
                config={avatar}
                marco={marcoNivel}
                titulo={perfil.nombre}
                subtitulo={`Nivel personal ${nivel.nivel}`}
                triggerClassName="h-24 w-24"
                previewClassName="h-72 w-72"
              />
            </div>
            <p className="text-center font-titulo text-xl text-texto">
              Nivel {nivel.nivel}
            </p>
            <p className="mb-2 text-center text-[11px] text-texto2">
              {MARCO_INFO[marcoNivel].nombre}
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

          <section className="rounded-2xl border border-ambar/50 bg-tarjeta p-3">
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
          </section>
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
                  <MedalIcon
                    icono={m.icono}
                    nombre={m.nombre}
                    slug={m.slug}
                    rareza={m.rareza}
                    className="h-16 w-16"
                    contador={m.n}
                  />
                </span>
              );
            })}
          </div>
        )}

        {esMiPerfil && (
          <div className="mx-auto mb-2 grid w-fit grid-cols-2 gap-2">
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
          </div>
        )}
        {esMiPerfil && <AvatarEditor actual={perfil.avatar_config} />}
        {esMiPerfil && <CumpleanosEditor actual={perfil.cumpleanos} />}
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

      {/* Stats principales */}
      <section className="mb-8 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-borde bg-tarjeta p-4">
          <p className="font-titulo text-3xl text-ambar">{dpn}</p>
          <p className="text-[10px] uppercase text-texto2">
            DPN (bebidas/noche)
          </p>
        </div>
        <div className="rounded-2xl border border-borde bg-tarjeta p-4">
          <p className="font-titulo text-3xl text-cian">{winrate}%</p>
          <p className="text-[10px] uppercase text-texto2">Winrate</p>
        </div>
        <div className="rounded-2xl border border-borde bg-tarjeta p-4">
          <p className="font-titulo text-3xl text-lima">{plTotal}</p>
          <p className="text-[10px] uppercase text-texto2">PL históricos</p>
        </div>
      </section>

      {/* Stats detalladas */}
      <section className="mb-8 rounded-3xl border border-borde bg-tarjeta p-5">
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between">
            <span className="text-texto2">Noches jugadas</span>
            <span className="font-titulo text-texto">{nochesJugadas}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-texto2">Victorias</span>
            <span className="font-titulo text-oro">🥇 {victorias}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-texto2">Podios</span>
            <span className="font-titulo text-texto">{podios}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-texto2">Bebidas totales</span>
            <span className="font-titulo text-texto">{totalBebidas}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-texto2">Récord en una noche</span>
            <span className="font-titulo text-rosa">{record}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-texto2">Bebida favorita</span>
            <span className="font-titulo text-texto">
              {favorita ? `${favorita.icono} ${favorita.nombre}` : "—"}
            </span>
          </li>
        </ul>
      </section>

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

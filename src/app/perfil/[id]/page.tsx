import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AvatarFramePreview from "@/components/AvatarFramePreview";
import MedalIcon from "@/components/MedalIcon";
import ProfileAchievementDetails from "@/components/ProfileAchievementDetails";
import ColeccionBebidas, { type BebidaCatalogoItem } from "@/components/ColeccionBebidas";
import PerfilCustomizer from "@/components/PerfilCustomizer";
import PrestigioPanel from "@/components/PrestigioPanel";
import { Backpack, ChartNoAxesCombined, ChevronRight, MapPinned, ShieldCheck, ShoppingBag } from "lucide-react";
import { tituloPrestigio } from "@/lib/prestigio";
import ProfileBanner from "@/components/ProfileBanner";
import BackButton from "@/components/BackButton";
import { progresoNivel } from "@/lib/niveles";
import { parseAvatarConfig } from "@/lib/avatar";
import { calcularDivision } from "@/lib/liga";
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
  const { data: banner } = await supabase.from("banner_equipado")
    .select("banner_id").eq("usuario_id", id).maybeSingle();
  const { data: titulosLiga } = user?.id === id
    ? await supabase.from("titulos_liga").select("titulo").eq("usuario_id", id)
    : { data: null };
  const avatar = parseAvatarConfig(perfil.avatar_config);
  const tienda = parseTiendaState(perfil.avatar_config);
  const nivel = progresoNivel(perfil.xp ?? 0);
  const marcoPersonal = tienda.marcoEquipado ?? "madera";
  const vitrinaSlugs = (perfil.vitrina ?? []) as string[];
  const { data: prestigios } = await supabase.from("prestigios")
    .select("ciclo").eq("usuario_id", id).order("ciclo", { ascending: false });
  const ciclo = prestigios?.[0]?.ciclo ?? 0;

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
        esTop1: indice === 0 && (ligaSala.length === 1 || ligaSala[0].pl > ligaSala[1].pl),
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
  let esAmigoAceptado = false;
  if (user && !esMiPerfil) {
    const { data: amistades } = await supabase.rpc("mis_amigos");
    esAmigoAceptado = ((amistades ?? []) as { amigo_id: string; estado: string }[]).some(
      (a) => a.amigo_id === id && a.estado === "aceptada"
    );
  }
  const puedeVerPrivado = esMiPerfil || esAmigoAceptado;

  // Bebidas concretas de por vida (solo el catálogo global; las
  // personalizadas de cada sala no se listan aquí para no exponer bebidas
  // de una sala a alguien que no es miembro de ella).
  let coleccionBebidas: BebidaCatalogoItem[] = [];
  if (puedeVerPrivado) {
    const [{ data: catalogoGlobal }, { data: misRegistrosCatalogo }] = await Promise.all([
      supabase
        .from("bebidas_catalogo")
        .select("id, nombre, rareza, bebidas_tipo(nombre, icono)")
        .is("sala_id", null)
        .order("nombre"),
      supabase
        .from("registros")
        .select("bebida_catalogo_id")
        .eq("usuario_id", id)
        .eq("anulado", false)
        .not("bebida_catalogo_id", "is", null),
    ]);
    const cantidadPorId = new Map<string, number>();
    for (const r of misRegistrosCatalogo ?? []) {
      if (!r.bebida_catalogo_id) continue;
      cantidadPorId.set(r.bebida_catalogo_id, (cantidadPorId.get(r.bebida_catalogo_id) ?? 0) + 1);
    }
    coleccionBebidas = (catalogoGlobal ?? []).map((b) => {
      const cat = b.bebidas_tipo as unknown as { nombre: string; icono: string } | { nombre: string; icono: string }[] | null;
      const catInfo = Array.isArray(cat) ? cat[0] : cat;
      return {
        id: b.id,
        nombre: b.nombre,
        rareza: b.rareza,
        categoriaNombre: catInfo?.nombre ?? "Otros",
        categoriaIcono: catInfo?.icono ?? "🥤",
        cantidad: cantidadPorId.get(b.id) ?? 0,
      };
    });
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <BackButton />

      <header className="mb-8 mt-4 text-center">
        <div className="mb-4 flex flex-col items-center">
          <ProfileBanner id={banner?.banner_id ?? "carbon"}>
          <AvatarFramePreview
            config={avatar}
            marco={marcoPersonal}
            titulo={perfil.nombre}
            subtitulo={`Nivel ${nivel.nivel}`}
            triggerClassName="h-full w-full"
            previewClassName="h-80 w-80"
          />
          </ProfileBanner>
          {!puedeVerPrivado && <p className="mt-3 font-titulo text-sm text-cian">
            Nivel {nivel.nivel}
          </p>}
        </div>

        <h1 className="font-titulo text-3xl text-texto">
          {perfil.nombre}
          {esMiPerfil && (
            <span className="ml-2 text-sm text-texto2">(tú)</span>
          )}
        </h1>
        {ciclo > 0 && <p className="my-1 flex items-center justify-center gap-1.5 text-sm text-oro"><ShieldCheck size={18} aria-hidden="true" />Prestigio {ciclo}</p>}
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
        {(esMiPerfil || vitrinaSlugs.some((slug) => coleccion.has(slug))) && (
          <div className="mx-auto my-3 max-w-sm" aria-label="Vitrina de medallas">
            <p className="mb-2 font-titulo text-xs text-texto2">Vitrina de medallas</p>
            <div className="flex justify-center gap-2">
            {vitrinaSlugs.slice(0, 3).map((slug) => {
              const m = coleccion.get(slug);
              if (!m) return null;
              return <div key={slug} className="w-1/3 min-w-0 text-center">
                <ProfileAchievementDetails achievement={m} variant="medal" />
                <p className="mt-1 break-words font-titulo text-xs text-texto">{m.nombre}</p>
                {m.repetible && <p className="text-xs text-ambar">×{m.n}</p>}
              </div>;
            })}
            {!vitrinaSlugs.some((slug) => coleccion.has(slug)) &&
              <p className="py-2 text-xs text-texto2">Aún no hay medallas expuestas.</p>}
            </div>
          </div>
        )}
        {esMiPerfil && <div className="my-3 flex flex-wrap justify-center gap-4 text-sm text-cian">
          <Link href="/banners" className="min-h-11 content-center underline">Personalizar banner</Link>
          <Link href="/liga/historial" className="min-h-11 content-center underline">Premios de liga</Link>
        </div>}
        <p className="mb-3 text-xs text-texto2">
          En El Ranking desde{" "}
          {new Date(perfil.created_at).toLocaleDateString("es-ES", {
            month: "long",
            year: "numeric",
          })}
        </p>

        {!puedeVerPrivado && (
          <p className="mb-5 rounded-2xl border border-borde bg-tarjeta p-4 text-center text-xs text-texto2">
            El nivel, la liga y las estadísticas de {perfil.nombre} solo se ven
            si acepta tu solicitud de amistad.
          </p>
        )}
        {puedeVerPrivado && <div className={`mb-5 grid gap-3 text-left ${rankingSala ? "grid-cols-2" : "grid-cols-1"}`}>
          <section className="min-w-0 border-y border-cian/30 py-3">
            <p className="mb-2 font-titulo text-lg text-cian">
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

          {rankingSala && <section className="min-w-0 border-y border-ambar/30 py-3">
            <p className="mb-2 font-titulo text-xs uppercase text-ambar">
              Liga de sala
            </p>
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
        </div>}

        {puedeVerPrivado && rankingSala && (
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

        {esMiPerfil && <details className="mb-4 text-left" open={nivel.nivel >= 50}>
          <summary className="min-h-11 cursor-pointer content-center text-sm text-ambar">Próximo prestigio · {tituloPrestigio(ciclo + 1)}</summary>
          <PrestigioPanel ciclo={ciclo} nivel={nivel.nivel} />
        </details>}

        <nav aria-label="Secciones del perfil" className="mb-4 grid grid-cols-2 gap-2 text-left">
          {esMiPerfil && <>
            <Link
              href="/tienda"
              className="flex min-h-12 items-center gap-2 rounded-lg border border-borde bg-tarjeta/50 px-3 text-sm text-texto transition hover:border-ambar focus-visible:outline-2 focus-visible:outline-ambar"
            >
              <ShoppingBag size={18} className="shrink-0 text-ambar" aria-hidden="true" /><span className="min-w-0 flex-1">Tienda</span><ChevronRight size={15} className="shrink-0 text-texto2" aria-hidden="true" />
            </Link>
            <Link
              href="/inventario"
              className="flex min-h-12 items-center gap-2 rounded-lg border border-borde bg-tarjeta/50 px-3 text-sm text-texto transition hover:border-cian focus-visible:outline-2 focus-visible:outline-cian"
            >
              <Backpack size={18} className="shrink-0 text-cian" aria-hidden="true" /><span className="min-w-0 flex-1">Inventario</span><ChevronRight size={15} className="shrink-0 text-texto2" aria-hidden="true" />
            </Link>
            <Link
              href="/mapa"
              className="flex min-h-12 items-center gap-2 rounded-lg border border-borde bg-tarjeta/50 px-3 text-sm text-texto transition hover:border-rosa focus-visible:outline-2 focus-visible:outline-rosa"
            >
              <MapPinned size={18} className="shrink-0 text-rosa" aria-hidden="true" /><span className="min-w-0 flex-1">Mapa de sitios</span><ChevronRight size={15} className="shrink-0 text-texto2" aria-hidden="true" />
            </Link>
          </>}
          {esAmigoAceptado && (
            <Link
              href={`/mapa/amigo/${id}`}
              className="flex min-h-12 items-center gap-2 rounded-lg border border-borde bg-tarjeta/50 px-3 text-sm text-texto transition hover:border-rosa focus-visible:outline-2 focus-visible:outline-rosa"
            >
              <MapPinned size={18} className="shrink-0 text-rosa" aria-hidden="true" /><span className="min-w-0 flex-1">Sus sitios</span><ChevronRight size={15} className="shrink-0 text-texto2" aria-hidden="true" />
            </Link>
          )}
          {puedeVerPrivado && (
            <Link
              href={`/perfil/${id}/estadisticas${salaContexto ? `?sala=${salaContexto.id}` : ""}`}
              className="flex min-h-12 items-center gap-2 rounded-lg border border-borde bg-tarjeta/50 px-3 text-sm text-texto transition hover:border-lima focus-visible:outline-2 focus-visible:outline-lima"
            >
              <ChartNoAxesCombined size={18} className="shrink-0 text-lima" aria-hidden="true" /><span className="min-w-0 flex-1">Estadísticas</span><ChevronRight size={15} className="shrink-0 text-texto2" aria-hidden="true" />
            </Link>
          )}
        </nav>
        {esMiPerfil && (
          <PerfilCustomizer
            titulosPrestigio={[...(prestigios ?? []).map((p) => tituloPrestigio(p.ciclo)), ...(titulosLiga ?? []).map((t) => t.titulo)]}
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
      {puedeVerPrivado && <details className="mb-8">
        <summary className="mb-3 min-h-11 cursor-pointer content-center font-titulo text-xl marker:text-cian">
          <span className="text-texto">
            🏅 Medallas ({medallasOrdenadas.length})
          </span>
        </summary>
          <Link href="/logros" className="mb-3 inline-flex min-h-11 items-center text-xs text-cian underline">
            Ver catálogo completo
          </Link>
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
      </details>}

      {puedeVerPrivado && <ColeccionBebidas items={coleccionBebidas} />}
    </main>
  );
}

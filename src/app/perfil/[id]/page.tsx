import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AvatarEditor from "@/components/AvatarEditor";
import AvatarSVG from "@/components/AvatarSVG";
import PerfilCustomizer from "@/components/PerfilCustomizer";
import CumpleanosEditor from "@/components/CumpleanosEditor";
import BackButton from "@/components/BackButton";
import { progresoNivel } from "@/lib/niveles";
import { parseAvatarConfig } from "@/lib/avatar";

const RAREZA_ESTILO: Record<string, string> = {
  comun: "border-borde text-texto2",
  rara: "border-cian/60 text-cian",
  epica: "border-rosa/60 text-rosa",
  legendaria: "border-oro text-oro",
};

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  const nivel = progresoNivel(perfil.xp ?? 0);
  const vitrinaSlugs = (perfil.vitrina ?? []) as string[];

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
        <div className="mb-2 flex justify-center">
          <AvatarSVG config={avatar} className="h-28 w-28" />
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

        {/* Nivel y barra de XP */}
        <div className="mx-auto mb-3 max-w-xs">
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-titulo text-cian">Nivel {nivel.nivel}</span>
            <span className="text-texto2">
              {nivel.actual}/{nivel.necesario} XP
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-fondo">
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
        </div>

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
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 bg-tarjeta text-3xl ${
                    RAREZA_ESTILO[m.rareza]?.split(" ")[0] ?? "border-borde"
                  }`}
                >
                  {m.icono}
                </span>
              );
            })}
          </div>
        )}

        {esMiPerfil && <AvatarEditor actual={avatar} />}
        {esMiPerfil && <CumpleanosEditor actual={perfil.cumpleanos} />}
        {esMiPerfil && (
          <PerfilCustomizer
            tituloActual={perfil.titulo}
            vitrinaActual={vitrinaSlugs}
            medallas={medallasOrdenadas.map((m) => ({
              slug: m.slug,
              nombre: m.nombre,
              icono: m.icono,
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
                <p className="text-3xl">{m.icono}</p>
                <p className="font-titulo text-sm text-texto">
                  {m.nombre}
                  {m.n > 1 && (
                    <span className="ml-1 text-ambar">×{m.n}</span>
                  )}
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

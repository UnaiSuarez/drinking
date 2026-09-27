import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";
import AvatarFramePreview from "@/components/AvatarFramePreview";
import { AVATAR_PREDETERMINADO, parseAvatarConfig } from "@/lib/avatar";
import { progresoNivel, xpTotalParaNivel } from "@/lib/niveles";
import { MARCO_INFO, MARCO_PRESTIGIO_HITOS, marcoPorLiga, marcosNivelHitos, type MarcoPerfil } from "@/lib/marcos";
import { parseTiendaState } from "@/lib/tienda";
import PrestigioPanel from "@/components/PrestigioPanel";
import { calcularDivision } from "@/lib/liga";

const LIGA_HITOS: { pl: number; esTop1: boolean; marco: MarcoPerfil }[] = [
  { pl: 0, esTop1: false, marco: "liga-bronce" },
  { pl: 50, esTop1: false, marco: "liga-plata" },
  { pl: 125, esTop1: false, marco: "liga-oro" },
  { pl: 210, esTop1: false, marco: "liga-diamante" },
  { pl: 300, esTop1: false, marco: "liga-maestro" },
  { pl: 300, esTop1: true, marco: "liga-challenger" },
];

export default async function NivelesPage({
  searchParams,
}: {
  searchParams: Promise<{ sala?: string }>;
}) {
  const { sala: salaId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let avatarConfig = AVATAR_PREDETERMINADO;
  let xpActual: number | null = null;
  let marcosObtenidos: MarcoPerfil[] = [];
  let ciclo = 0;
  if (user) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("avatar_config, xp")
      .eq("id", user.id)
      .single();
    if (perfil) {
      avatarConfig = parseAvatarConfig(perfil.avatar_config);
      xpActual = perfil.xp ?? 0;
      marcosObtenidos = parseTiendaState(perfil.avatar_config).marcos;
    }
    const { data: prestigio } = await supabase.from("prestigios").select("ciclo")
      .eq("usuario_id", user.id).order("ciclo", { ascending: false }).limit(1).maybeSingle();
    ciclo = prestigio?.ciclo ?? 0;
  }

  const miNivel = xpActual !== null ? progresoNivel(xpActual) : null;

  let ligaInfo: {
    nombreTemporada: string;
    premio: string | null;
    pl: number;
    posicion: number;
    total: number;
    esTop1: boolean;
  } | null = null;

  if (user && salaId) {
    const { data: temporada } = await supabase
      .from("temporadas")
      .select("id, nombre, fin, premio")
      .eq("sala_id", salaId)
      .eq("estado", "activa")
      .gt("fin", new Date().toISOString())
      .maybeSingle();

    if (temporada) {
      const { data: ligaRaw } = await supabase
        .from("liga")
        .select("usuario_id, pl")
        .eq("temporada_id", temporada.id)
        .order("pl", { ascending: false });
      const lista = ligaRaw ?? [];
      const idx = lista.findIndex((e) => e.usuario_id === user.id);
      if (idx !== -1) {
        ligaInfo = {
          nombreTemporada: temporada.nombre,
          premio: temporada.premio as string | null,
          pl: lista[idx].pl,
          posicion: idx + 1,
          total: lista.length,
          esTop1: idx === 0,
        };
      }
    }
  }

  const division = ligaInfo ? calcularDivision(ligaInfo.pl, ligaInfo.esTop1) : null;
  const marcoLiga = ligaInfo ? marcoPorLiga(ligaInfo.pl, ligaInfo.esTop1) : null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-16 pt-6">
      <BackButton />

      <header className="mb-6">
        <p className="font-titulo text-3xl text-ambar">📈 Niveles</p>
        <p className="mt-2 text-sm text-texto2">
          El nivel sube con la XP que ganas registrando bebidas, ganando
          noches y desbloqueando logros. Cada 10 niveles, hasta el 50, se añade un marco
          nuevo a tu inventario para siempre; equípalo cuando quieras desde
          ahí. Desde el nivel 50 puedes hacer prestigio voluntariamente.
        </p>
        {miNivel && (
          <p className="mt-3 rounded-2xl border border-borde bg-tarjeta px-4 py-3 text-sm text-texto">
            Ahora mismo estás en el{" "}
            <span className="font-titulo text-ambar">
              nivel {miNivel.nivel}
            </span>{" "}
            · {miNivel.actual}/{miNivel.necesario} XP para el siguiente.
          </p>
        )}
      </header>
      {miNivel && <PrestigioPanel ciclo={ciclo} nivel={miNivel.nivel} />}

      {ligaInfo && division && marcoLiga && (
        <section className="mb-8 rounded-2xl border border-oro/50 bg-gradient-to-br from-tarjeta to-oro/10 p-5">
          <p className="mb-3 font-titulo text-lg text-texto">
            🏆 Tu liga esta temporada
          </p>
          <div className="flex items-center gap-4">
            <AvatarFramePreview
              config={avatarConfig}
              marco={marcoLiga}
              titulo={division.nombre}
              subtitulo={`${ligaInfo.pl} PL · ${ligaInfo.nombreTemporada}`}
              triggerClassName="h-16 w-16"
              previewClassName="h-72 w-72"
            />
            <div className="min-w-0 flex-1">
              <p className={`font-titulo text-base ${division.color}`}>
                {division.icono} {division.nombre}
              </p>
              <p className="text-xs text-texto2">{ligaInfo.nombreTemporada}</p>
              <p className="mt-1 text-sm text-texto">
                <span className="font-titulo text-lima">{ligaInfo.pl} PL</span>
                {" · "}
                {ligaInfo.posicion}º de {ligaInfo.total}
              </p>
              {ligaInfo.premio && (
                <p className="mt-1 text-xs text-ambar">🏆 {ligaInfo.premio}</p>
              )}
            </div>
          </div>
        </section>
      )}

      <p className="mb-3 text-xs text-texto2">
        {ciclo >= 1
          ? "Ya has hecho prestigio: estos hitos de nivel te dan la versión renacida del marco."
          : "Al hacer tu primer prestigio, estos mismos hitos de nivel cambian a una versión renacida distinta."}
      </p>
      <ul className="space-y-3">
        {marcosNivelHitos(ciclo).map(({ nivel, marco }) => {
          const info = MARCO_INFO[marco];
          const xpNecesaria = xpTotalParaNivel(nivel);
          const conseguido = marcosObtenidos.includes(marco);
          return (
            <li
              key={nivel}
              className={`flex items-center gap-4 rounded-2xl border p-4 ${
                conseguido
                  ? "border-ambar/60 bg-tarjeta"
                  : "border-borde bg-tarjeta opacity-80"
              }`}
            >
              <AvatarFramePreview
                config={avatarConfig}
                marco={marco}
                titulo={info.nombre}
                subtitulo={info.descripcion}
                triggerClassName="h-16 w-16"
                previewClassName="h-72 w-72"
              />
              <div className="min-w-0 flex-1">
                <p className="font-titulo text-lg text-texto">
                  Nivel {nivel}
                  {conseguido && (
                    <span className="ml-2 text-xs text-lima">✓ en tu inventario</span>
                  )}
                </p>
                <p className="text-xs text-texto2">
                  {xpNecesaria.toLocaleString("es-ES")} XP totales
                </p>
                <p className="mt-1 font-titulo text-sm text-ambar">
                  {info.nombre}
                </p>
                <p className="text-[11px] text-texto2">{info.descripcion}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <h2 className="mb-3 mt-8 font-titulo text-xl text-ambar">Marcos de prestigio</h2>
      <ul className="space-y-3">
        {MARCO_PRESTIGIO_HITOS.map(({ prestigio, marco }) => <li key={prestigio} className="flex items-center gap-4 rounded-lg border border-borde bg-tarjeta p-4">
          <AvatarFramePreview config={avatarConfig} marco={marco} titulo={MARCO_INFO[marco].nombre} subtitulo={`Prestigio ${prestigio}`} triggerClassName="h-16 w-16" previewClassName="h-72 w-72" />
          <div className="min-w-0"><p className="font-titulo text-texto">Prestigio {prestigio}</p><p className="text-sm text-ambar">{MARCO_INFO[marco].nombre}</p>{marcosObtenidos.includes(marco) && <p className="text-xs text-lima">En tu inventario</p>}</div>
        </li>)}
      </ul>

      <h2 className="mb-3 mt-8 font-titulo text-xl text-texto">🏆 Divisiones de liga</h2>
      <p className="mb-3 text-xs text-texto2">
        La liga se juega por temporada en cada sala: sube subiendo tu PL.
        {!ligaInfo && " Entra desde una sala con liga activa para ver tu progreso aquí."}
      </p>
      <ul className="space-y-3">
        {LIGA_HITOS.map((hito) => {
          const division = calcularDivision(hito.pl, hito.esTop1);
          const conseguido = ligaInfo
            ? hito.esTop1
              ? ligaInfo.esTop1 && ligaInfo.pl >= hito.pl
              : ligaInfo.pl >= hito.pl
            : false;
          return (
            <li
              key={hito.marco}
              className={`flex items-center gap-4 rounded-2xl border p-4 ${
                conseguido
                  ? "border-oro/60 bg-tarjeta"
                  : "border-borde bg-tarjeta opacity-80"
              }`}
            >
              <AvatarFramePreview
                config={avatarConfig}
                marco={hito.marco}
                titulo={division.nombre}
                subtitulo={hito.esTop1 ? "Nº1 de la sala con 300+ PL" : `${hito.pl}+ PL`}
                triggerClassName="h-16 w-16"
                previewClassName="h-72 w-72"
              />
              <div className="min-w-0 flex-1">
                <p className={`font-titulo text-lg ${division.color}`}>
                  {division.icono} {division.nombre}
                  {conseguido && (
                    <span className="ml-2 text-xs text-lima">✓ conseguido</span>
                  )}
                </p>
                <p className="text-xs text-texto2">
                  {hito.esTop1 ? "Nº1 de la sala con 300+ PL" : `${hito.pl}+ PL`}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 rounded-2xl border border-borde bg-tarjeta/60 p-4 text-center text-xs text-texto2">
        Ningún marco se equipa solo: elige el que quieras llevar desde tu
        inventario.
      </p>
    </main>
  );
}

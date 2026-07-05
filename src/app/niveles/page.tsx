import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";
import AvatarFrame from "@/components/AvatarFrame";
import { AVATAR_PREDETERMINADO, parseAvatarConfig } from "@/lib/avatar";
import { progresoNivel, xpTotalParaNivel } from "@/lib/niveles";
import { MARCO_INFO, marcoPorNivel, marcoPorLiga } from "@/lib/marcos";
import { calcularDivision } from "@/lib/liga";

const HITOS = [1, 5, 10, 25, 50];

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
  if (user) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("avatar_config, xp")
      .eq("id", user.id)
      .single();
    if (perfil) {
      avatarConfig = parseAvatarConfig(perfil.avatar_config);
      xpActual = perfil.xp ?? 0;
    }
  }

  const miNivel = xpActual !== null ? progresoNivel(xpActual) : null;

  let ligaInfo: {
    nombreTemporada: string;
    pl: number;
    posicion: number;
    total: number;
    esTop1: boolean;
  } | null = null;

  if (user && salaId) {
    const { data: temporada } = await supabase
      .from("temporadas")
      .select("id, nombre, fin")
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
          noches y desbloqueando logros. Cada hito da un marco de perfil
          nuevo para siempre.
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

      {ligaInfo && division && marcoLiga && (
        <section className="mb-8 rounded-2xl border border-oro/50 bg-gradient-to-br from-tarjeta to-oro/10 p-5">
          <p className="mb-3 font-titulo text-lg text-texto">
            🏆 Tu liga esta temporada
          </p>
          <div className="flex items-center gap-4">
            <AvatarFrame
              config={avatarConfig}
              marco={marcoLiga}
              className="h-16 w-16"
              imageSizes="64px"
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
            </div>
          </div>
        </section>
      )}

      <ul className="space-y-3">
        {HITOS.map((nivel) => {
          const marco = marcoPorNivel(nivel);
          const info = MARCO_INFO[marco];
          const xpNecesaria = xpTotalParaNivel(nivel);
          const conseguido = miNivel ? miNivel.nivel >= nivel : false;
          return (
            <li
              key={nivel}
              className={`flex items-center gap-4 rounded-2xl border p-4 ${
                conseguido
                  ? "border-ambar/60 bg-tarjeta"
                  : "border-borde bg-tarjeta opacity-80"
              }`}
            >
              <AvatarFrame
                config={avatarConfig}
                marco={marco}
                className="h-16 w-16"
                imageSizes="64px"
              />
              <div className="min-w-0 flex-1">
                <p className="font-titulo text-lg text-texto">
                  Nivel {nivel}
                  {conseguido && (
                    <span className="ml-2 text-xs text-lima">✓ conseguido</span>
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

      <p className="mt-6 rounded-2xl border border-borde bg-tarjeta/60 p-4 text-center text-xs text-texto2">
        A partir del nivel 50 el marco de llamas es para siempre, aunque
        sigas subiendo de nivel.
      </p>
    </main>
  );
}

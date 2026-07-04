import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";
import AvatarFrame from "@/components/AvatarFrame";
import { AVATAR_PREDETERMINADO, parseAvatarConfig } from "@/lib/avatar";
import { progresoNivel, xpTotalParaNivel } from "@/lib/niveles";
import { MARCO_INFO, marcoPorNivel } from "@/lib/marcos";

const HITOS = [1, 5, 10, 25, 50];

export default async function NivelesPage() {
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

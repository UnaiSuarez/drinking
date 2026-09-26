import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import AvatarFrame from "@/components/AvatarFrame";
import { parseAvatarConfig } from "@/lib/avatar";
import { progresoNivel } from "@/lib/niveles";
import { marcoPorNivel } from "@/lib/marcos";
import { calcularSaldoChapas, parseTiendaState } from "@/lib/tienda";
import NivelCelebracion from "@/components/NivelCelebracion";
import VisitaDiaria from "@/components/VisitaDiaria";

const ADMIN_EMAIL = "unaisucar64535@gmail.com";

export default async function AppHeader() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("avatar_config, xp")
    .eq("id", user.id)
    .single();

  if (!perfil) return null;

  const { data: participaciones } = await supabase
    .from("noche_jugadores")
    .select("pl_ganados")
    .eq("usuario_id", user.id);
  const plHistoricos = (participaciones ?? []).reduce(
    (total, p) => total + (p.pl_ganados ?? 0),
    0
  );

  const avatarConfig = parseAvatarConfig(perfil.avatar_config);
  const tienda = parseTiendaState(perfil.avatar_config);
  const nivel = progresoNivel(perfil.xp ?? 0);
  const marco = tienda.marcoEquipado ?? marcoPorNivel(nivel.nivel);
  const chapas = calcularSaldoChapas({ xp: perfil.xp ?? 0, plHistoricos, tienda });

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-borde bg-fondo/95 px-4 py-2 backdrop-blur [contain:paint]">
      <Link href="/" className="font-titulo text-sm text-ambar">
        🍻 El Ranking
      </Link>
      <span className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-texto2">
          <span title={`Nivel ${nivel.nivel}`}>🔥{nivel.nivel}</span>
          <span title="Chapas">🪙{chapas}</span>
        </span>
        <Link
          href="/tienda"
          aria-label="Tienda"
          className="text-lg outline-none transition active:scale-95"
          title="Tienda"
        >
          🛍️
        </Link>
        <Link
          href="/amigos"
          aria-label="Amigos"
          className="text-lg outline-none transition active:scale-95"
          title="Amigos"
        >
          👥
        </Link>
        <Link
          href="/ajustes"
          aria-label="Ajustes"
          className="text-lg outline-none transition active:scale-95"
          title="Ajustes"
        >
          ⚙️
        </Link>
        {user.email?.toLowerCase() === ADMIN_EMAIL && (
          <Link
            href="/admin"
            aria-label="Panel de admin"
            className="text-lg outline-none transition active:scale-95"
            title="Panel de admin"
          >
            🛠️
          </Link>
        )}
        <Link
          href={`/perfil/${user.id}`}
          aria-label="Tu perfil"
          className="rounded-full outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-cian"
        >
          <AvatarFrame
            config={avatarConfig}
            marco={marco}
            className="h-9 w-9"
            imageSizes="36px"
            animated={false}
          />
        </Link>
      </span>
      </header>
      <NivelCelebracion userId={user.id} nivelInicial={nivel.nivel} />
      <VisitaDiaria userId={user.id} />
    </>
  );
}

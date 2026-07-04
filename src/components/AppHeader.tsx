import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AvatarFrame from "@/components/AvatarFrame";
import { parseAvatarConfig } from "@/lib/avatar";
import { progresoNivel } from "@/lib/niveles";
import { marcoPorNivel } from "@/lib/marcos";

const ADMIN_EMAIL = "unaisucar64535@gmail.com";

export default async function AppHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("avatar_config, xp")
    .eq("id", user.id)
    .single();

  if (!perfil) return null;

  const avatarConfig = parseAvatarConfig(perfil.avatar_config);
  const nivel = progresoNivel(perfil.xp ?? 0);
  const marco = marcoPorNivel(nivel.nivel);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-borde bg-fondo/95 px-4 py-2 backdrop-blur">
      <Link href="/" className="font-titulo text-sm text-ambar">
        🍻 El Ranking
      </Link>
      <span className="flex items-center gap-3">
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
          />
        </Link>
      </span>
    </header>
  );
}

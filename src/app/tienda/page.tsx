import BackButton from "@/components/BackButton";
import TiendaClient from "@/components/TiendaClient";
import { createClient } from "@/lib/supabase/server";
import type { BannerItem } from "@/lib/banners";

export default async function TiendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, avatar_config, xp")
    .eq("id", user!.id)
    .single();

  const { data: participaciones } = await supabase
    .from("noche_jugadores")
    .select("pl_ganados")
    .eq("usuario_id", user!.id);

  const plHistoricos = (participaciones ?? []).reduce(
    (total, participacion) => total + (participacion.pl_ganados ?? 0),
    0
  );

  const [catalogoBanners, bannersUsuario, bannerEquipado] = await Promise.all([
    supabase.from("banners_catalogo").select("*").eq("exclusivo", false).order("precio"),
    supabase.from("banners_usuario").select("banner_id").eq("usuario_id", user!.id),
    supabase.from("banner_equipado").select("banner_id").eq("usuario_id", user!.id).maybeSingle(),
  ]);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md overflow-hidden px-5 pb-24 pt-8 [contain:paint]">
      <BackButton />
      <TiendaClient
        userId={user!.id}
        nombre={perfil?.nombre ?? "tu perfil"}
        avatarConfigRaw={perfil?.avatar_config ?? null}
        xp={perfil?.xp ?? 0}
        plHistoricos={plHistoricos}
        banners={catalogoBanners.error || bannersUsuario.error || bannerEquipado.error ? null : {
          items: (catalogoBanners.data ?? []) as BannerItem[],
          owned: (bannersUsuario.data ?? []).map((row) => row.banner_id),
          equipped: bannerEquipado.data?.banner_id ?? "carbon",
        }}
      />
    </main>
  );
}

import { notFound, redirect } from "next/navigation";
import AvatarFrame from "@/components/AvatarFrame";
import BackButton from "@/components/BackButton";
import PerfilEstadisticas, { type PerfilStats } from "@/components/PerfilEstadisticas";
import { parseAvatarConfig } from "@/lib/avatar";
import { marcoPorNivel } from "@/lib/marcos";
import { progresoNivel } from "@/lib/niveles";
import { createClient } from "@/lib/supabase/server";
import { parseTiendaState } from "@/lib/tienda";

export default async function EstadisticasPerfilPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sala?: string }>;
}) {
  const { id } = await params;
  const { sala: salaParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, avatar_config, xp")
    .eq("id", id)
    .maybeSingle();
  if (!perfil) notFound();

  if (user.id !== id) {
    const { data: amistades } = await supabase.rpc("mis_amigos");
    const esAmigo = ((amistades ?? []) as { amigo_id: string; estado: string }[]).some(
      (a) => a.amigo_id === id && a.estado === "aceptada"
    );
    if (!esAmigo) redirect(`/perfil/${id}`);
  }

  const { data: miembroSala } = salaParam
    ? await supabase.from("sala_miembros").select("salas(id, nombre)").eq("usuario_id", id).eq("sala_id", salaParam).maybeSingle()
    : { data: null };
  const sala = miembroSala?.salas as unknown as { id: string; nombre: string } | null;
  const scope = sala?.id ?? null;

  const [globalResult, salaResult, miaResult] = await Promise.all([
    supabase.rpc("estadisticas_perfil", { p_usuario: id }),
    scope ? supabase.rpc("estadisticas_perfil", { p_usuario: id, p_sala: scope }) : Promise.resolve({ data: null }),
    scope && user.id !== id ? supabase.rpc("estadisticas_perfil", { p_usuario: user.id, p_sala: scope }) : Promise.resolve({ data: null }),
  ]);

  const tienda = parseTiendaState(perfil.avatar_config);
  const nivel = progresoNivel(perfil.xp ?? 0);
  const marco = tienda.marcoEquipado ?? marcoPorNivel(nivel.nivel);

  return <main className="mx-auto min-h-dvh w-full max-w-4xl overflow-x-clip px-4 pb-24 pt-8 sm:px-6">
    <BackButton>Perfil</BackButton>
    <header className="mb-8 flex min-w-0 items-center gap-4 border-b border-borde pb-6">
      <AvatarFrame config={parseAvatarConfig(perfil.avatar_config)} marco={marco} className="h-16 w-16" imageSizes="64px" />
      <div className="min-w-0"><p className="text-xs text-texto2">Estadísticas de</p><h1 className="truncate font-titulo text-2xl text-texto">{perfil.nombre}</h1><p className="text-xs text-texto2">{sala ? `Vista desde ${sala.nombre}` : "Todas las salas"}</p></div>
    </header>
    <PerfilEstadisticas
      global={globalResult.data as PerfilStats | null}
      sala={salaResult.data as PerfilStats | null}
      mia={miaResult.data as PerfilStats | null}
      salaNombre={sala?.nombre ?? null}
      esMiPerfil={user.id === id}
    />
  </main>;
}

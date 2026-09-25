import { existsSync } from "node:fs";
import { join } from "node:path";
import { notFound, redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import PersonajePagina from "@/components/PersonajePagina";
import { ADMIN_EMAIL } from "@/lib/admin";
import { parseInventarioState } from "@/lib/inventario";
import { createClient } from "@/lib/supabase/server";
import {
  AVATARES_GRATIS,
  PERSONAJES_OCULTOS,
  SKINS_PERSONAJES,
  TIENDA_AVATARES,
  rutaCompletoPersonaje,
  type PersonajeCatalogo,
} from "@/lib/tienda";

// Un archivo existe en public/ si Codex ya ha añadido la imagen: así basta con
// copiar los archivos para que la ficha use el arte de cuerpo completo.
function existeEnPublic(ruta: string) {
  return existsSync(join(process.cwd(), "public", ruta));
}

export default async function PersonajeRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string }>;
}) {
  const { id } = await params;
  const { demo } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const todos: PersonajeCatalogo[] = [...AVATARES_GRATIS, ...TIENDA_AVATARES, ...PERSONAJES_OCULTOS];
  const personaje = todos.find((item) => item.id === id);
  if (!personaje) notFound();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("avatar_config, xp")
    .eq("id", user.id)
    .single();

  const { data: participaciones } = await supabase
    .from("noche_jugadores")
    .select("pl_ganados")
    .eq("usuario_id", user.id);
  const plHistoricos = (participaciones ?? []).reduce(
    (total, participacion) => total + (participacion.pl_ganados ?? 0),
    0
  );

  const esAdmin = user.email === ADMIN_EMAIL;
  const forzarBloqueado = esAdmin && demo === "bloqueado";
  const inventario = parseInventarioState(perfil?.avatar_config ?? null);
  const esOculto = PERSONAJES_OCULTOS.some((item) => item.id === id);
  const desbloqueado = !esOculto || (inventario.personajesOcultos.includes(id) && !forzarBloqueado);

  const ilustraciones: Record<string, boolean> = {
    [id]: existeEnPublic(rutaCompletoPersonaje(id)),
  };
  for (const skin of SKINS_PERSONAJES.filter((item) => item.personajeId === id)) {
    ilustraciones[skin.id] = existeEnPublic(skin.ilustracion);
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <BackButton />
      <PersonajePagina
        userId={user.id}
        personajeId={id}
        avatarConfigRaw={perfil?.avatar_config ?? null}
        xp={perfil?.xp ?? 0}
        plHistoricos={plHistoricos}
        desbloqueado={desbloqueado}
        oculto={esOculto}
        ilustraciones={ilustraciones}
      />
    </main>
  );
}

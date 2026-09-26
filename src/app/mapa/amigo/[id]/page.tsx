import { notFound, redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import MapaSitiosClient, { type SitioMapa } from "@/components/MapaSitiosClient";
import { createClient } from "@/lib/supabase/server";

export default async function MapaAmigoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.id === id) redirect("/mapa");

  const { data: amigo } = await supabase
    .from("perfiles")
    .select("nombre")
    .eq("id", id)
    .maybeSingle();
  if (!amigo) notFound();

  const { data: filas } = await supabase.rpc("sitios_de_amigo", { p_amigo_id: id });

  const sitios: SitioMapa[] = (
    (filas ?? []) as {
      sitio_id: string;
      nombre: string;
      lat: number;
      lng: number;
      tipo: SitioMapa["tipo"];
      icono: string;
      creado_por: string | null;
      descubridor_nombre: string | null;
    }[]
  ).map((f) => ({
    sitioId: f.sitio_id,
    nombre: f.nombre,
    lat: f.lat,
    lng: f.lng,
    tipo: f.tipo,
    icono: f.icono,
    creadoPor: f.creado_por,
    descubridorNombre: f.descubridor_nombre,
  }));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <BackButton />
      <h1 className="mb-1 font-titulo text-3xl text-texto">🗺️ Sitios de {amigo.nombre}</h1>
      <p className="mb-6 text-xs text-texto2">
        {sitios.length === 0
          ? "Todavía no ha marcado ningún sitio (o no sois amigos aceptados)."
          : "Los sitios que ha marcado, en verde si tú también has estado."}
      </p>
      <MapaSitiosClient sitiosIniciales={sitios} userId={user.id} />
    </main>
  );
}

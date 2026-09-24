import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import MapaSitiosClient, { type SitioMapa } from "@/components/MapaSitiosClient";
import { createClient } from "@/lib/supabase/server";

export default async function MapaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: filas } = await supabase.rpc("mis_sitios_mapa");

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
      <h1 className="mb-1 font-titulo text-3xl text-texto">🗺️ Mapa de sitios</h1>
      <p className="mb-6 text-xs text-texto2">
        Tuyos y de tus amigos, de sala permanente.
      </p>
      <MapaSitiosClient sitiosIniciales={sitios} userId={user.id} />
    </main>
  );
}

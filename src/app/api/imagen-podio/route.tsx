import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Nada de emoji aqui: satori los renderiza pidiendolos a un CDN externo en
// el momento, y si esa peticion falla (o no hay red desde la funcion
// serverless) el emoji desaparece en silencio de la imagen generada.
const COLORES: Record<number, string> = {
  1: "#ffd54a",
  2: "#c7ccdb",
  3: "#cd7f32",
};

export async function GET(request: NextRequest) {
  const nocheId = request.nextUrl.searchParams.get("noche");
  if (!nocheId) {
    return new Response("Falta el parámetro noche", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const { data: noche } = await supabase
    .from("noches")
    .select("id, inicio, sala_id, salas(nombre)")
    .eq("id", nocheId)
    .eq("estado", "cerrada")
    .single();
  if (!noche) return new Response("Noche no encontrada", { status: 404 });

  const sala = noche.salas as unknown as { nombre: string } | null;

  const { data: jugadoresRaw } = await supabase
    .from("noche_jugadores")
    .select("usuario_id, posicion_final, pl_ganados, perfiles(nombre)")
    .eq("noche_id", nocheId)
    .order("posicion_final");

  const { count: totalBebidas } = await supabase
    .from("registros")
    .select("id", { count: "exact", head: true })
    .eq("noche_id", nocheId)
    .eq("anulado", false);

  const jugadores = (jugadoresRaw ?? []).map((j) => {
    const p = j.perfiles as unknown as { nombre: string } | null;
    return {
      nombre: p?.nombre ?? "???",
      posicion: j.posicion_final ?? 99,
      pl: j.pl_ganados ?? 0,
    };
  });
  const podio = jugadores.filter((j) => j.posicion <= 3);
  const fecha = new Date(noche.inicio).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0e1a",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 32, color: "#8a8fa8", display: "flex" }}>
          EL RANKING
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#ffb627",
            marginTop: 8,
            display: "flex",
          }}
        >
          {sala?.nombre ?? "Sala"}
        </div>
        <div style={{ fontSize: 26, color: "#8a8fa8", marginBottom: 40, display: "flex" }}>
          {fecha}
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: 20 }}>
          {podio.map((j) => (
            <div
              key={j.nombre + j.posicion}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                background: "#1a1c2e",
                border: `3px solid ${COLORES[j.posicion] ?? "#2a2d45"}`,
                borderRadius: 28,
                padding: "24px 36px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 72,
                    height: 72,
                    borderRadius: 999,
                    background: COLORES[j.posicion] ?? "#2a2d45",
                    color: "#0d0e1a",
                    fontSize: 32,
                    fontWeight: 700,
                  }}
                >
                  {j.posicion}º
                </div>
                <div style={{ fontSize: 40, color: "#f5f1e8", display: "flex" }}>
                  {j.nombre}
                </div>
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  color: "#9bf00b",
                  display: "flex",
                }}
              >
                +{j.pl} PL
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 22, color: "#8a8fa8", marginTop: 40, display: "flex" }}>
          {jugadores.length} jugadores · {totalBebidas ?? 0} bebidas registradas
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}

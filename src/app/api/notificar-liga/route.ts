import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarNotificaciones } from "@/lib/webPush";

export async function POST(request: NextRequest) {
  const { salaId } = await request.json();
  if (!salaId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: pendientes, error } = await supabase.rpc(
    "notificaciones_pendientes_de_sala",
    { p_sala: salaId }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  type Pendiente = {
    usuario_id: string;
    titulo: string;
    cuerpo: string;
    url: string | null;
    endpoint: string;
    p256dh: string;
    auth: string;
  };
  const lista = (pendientes ?? []) as Pendiente[];

  const resultados = await Promise.allSettled(
    lista.map((p) =>
      enviarNotificaciones(
        [{ endpoint: p.endpoint, p256dh: p.p256dh, auth: p.auth }],
        { title: p.titulo, body: p.cuerpo, url: p.url ?? "/" }
      )
    )
  );

  const caducados = resultados
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof enviarNotificaciones>>> => r.status === "fulfilled")
    .flatMap((r) => r.value.caducados);

  if (caducados.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", caducados);
  }

  return NextResponse.json({ procesados: lista.length });
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarNotificaciones } from "@/lib/webPush";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AvisoAmistad = {
  aviso_destinatario_id: string;
  aviso_solicitante_nombre: string;
};

/**
 * Avisa a UN solo destinatario cuando recibe una solicitud de amistad.
 *
 * Mismo espíritu que /api/notificar-logro: el navegador solo dice qué
 * amistad reclama, `reclamar_aviso_amistad` comprueba en la base que la
 * envió quien llama, sigue pendiente y es reciente, y la reclama una sola
 * vez; el nombre sale de la base.
 */
export async function POST(request: NextRequest) {
  const cuerpo = await request.json().catch(() => null);
  const amistadId = cuerpo?.amistadId;
  if (typeof amistadId !== "string" || !UUID.test(amistadId)) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: reclamados, error: errorAviso } = await supabase.rpc(
    "reclamar_aviso_amistad",
    { p_amistad_id: amistadId }
  );
  if (errorAviso) {
    return NextResponse.json({ error: errorAviso.message }, { status: 400 });
  }

  const aviso = ((reclamados ?? []) as AvisoAmistad[])[0];
  if (!aviso) {
    return NextResponse.json({ enviados: 0, fallidos: 0, avisos: 0 });
  }

  const { data: suscripciones, error } = await supabase.rpc(
    "suscripciones_de_usuario",
    { p_usuario: aviso.aviso_destinatario_id }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payload = {
    title: "👥 Nueva solicitud de amistad",
    body: `${aviso.aviso_solicitante_nombre} quiere ser tu amigo.`,
    url: "/amigos",
  };

  const resultado = await enviarNotificaciones(suscripciones ?? [], payload);

  if (resultado.caducados.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", resultado.caducados);
  }

  return NextResponse.json({ ...resultado, avisos: 1 });
}

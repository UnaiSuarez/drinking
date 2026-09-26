import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarNotificaciones } from "@/lib/webPush";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AvisoBebida = {
  aviso_sala_id: string;
  aviso_sala_nombre: string;
  aviso_usuario_nombre: string;
  aviso_bebida_nombre: string;
  aviso_bebida_icono?: string | null;
};

/**
 * Avisa al resto de la sala cuando alguien registra una bebida (o SOJA)
 * suelta fuera de una noche.
 *
 * Mismo espíritu que /api/notificar-logro: el navegador solo dice qué
 * registro reclama, `reclamar_aviso_bebida`/`reclamar_aviso_soja`
 * comprueban en la base que es un registro reciente de quien llama y lo
 * reclaman una sola vez; los textos salen de la base.
 */
export async function POST(request: NextRequest) {
  const cuerpo = await request.json().catch(() => null);
  const registroId = cuerpo?.registroId;
  const tipo = cuerpo?.tipo === "soja" ? "soja" : "normal";
  if (typeof registroId !== "string" || !UUID.test(registroId)) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: reclamados, error: errorAviso } = await supabase.rpc(
    tipo === "soja" ? "reclamar_aviso_soja" : "reclamar_aviso_bebida",
    { p_registro_id: registroId }
  );
  if (errorAviso) {
    return NextResponse.json({ error: errorAviso.message }, { status: 400 });
  }

  const aviso = ((reclamados ?? []) as AvisoBebida[])[0];
  if (!aviso) {
    return NextResponse.json({ enviados: 0, fallidos: 0, avisos: 0 });
  }

  const { data: suscripciones, error } = await supabase.rpc(
    "suscripciones_de_sala",
    { p_sala: aviso.aviso_sala_id }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payload = {
    title: `${aviso.aviso_bebida_icono ?? "🥤"} ${aviso.aviso_usuario_nombre} ha bebido algo`,
    body: `${aviso.aviso_bebida_nombre} en ${aviso.aviso_sala_nombre}.`,
    url: `/sala/${aviso.aviso_sala_id}`,
  };

  const destinatarios = (suscripciones ?? []).filter(
    (s: { usuario_id: string }) => s.usuario_id !== user.id
  );

  const resultado = await enviarNotificaciones(destinatarios, payload);

  if (resultado.caducados.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", resultado.caducados);
  }

  return NextResponse.json({ ...resultado, avisos: 1 });
}

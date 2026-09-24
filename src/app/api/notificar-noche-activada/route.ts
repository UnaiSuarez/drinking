import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarNotificaciones } from "@/lib/webPush";

/**
 * Se llama cuando una noche pendiente (sala permanente) se activa de verdad
 * al unirse una segunda persona. Mismo patrón que /api/notificar-noche: lo
 * dispara el propio cliente justo después de la acción que causó el cambio
 * (aquí, quien se une y provoca la activación), no un cron ni un trigger.
 */
export async function POST(request: NextRequest) {
  const { salaId, salaNombre, nocheId, userId } = await request.json();
  if (!salaId || !nocheId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: suscripciones, error } = await supabase.rpc(
    "suscripciones_de_sala",
    { p_sala: salaId }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payload = {
    title: `🌙 ¡Ya sois suficientes en ${salaNombre}!`,
    body: "La noche pendiente ha arrancado. Toca para unirte y registrar.",
    url: `/noche/${nocheId}`,
  };

  const destinatarios = (suscripciones ?? []).filter(
    (s: { usuario_id: string }) => s.usuario_id !== userId
  );

  const resultado = await enviarNotificaciones(destinatarios, payload);

  if (resultado.caducados.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", resultado.caducados);
  }

  return NextResponse.json(resultado);
}

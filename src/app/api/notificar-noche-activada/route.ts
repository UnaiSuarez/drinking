import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarNotificaciones } from "@/lib/webPush";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AvisoNoche = {
  aviso_sala_id: string;
  aviso_sala_nombre: string;
  aviso_noche_id: string;
};

/**
 * Avisa al resto de la sala de que una noche pendiente (sala permanente) se
 * ha activado al unirse la segunda persona.
 *
 * El navegador solo dice qué noche; NO se fía de nada más de la petición.
 * `reclamar_aviso_noche_activada` comprueba en la base que la persona
 * autenticada es quien provocó esa activación (su ingreso coincide con el
 * instante en que el trigger activó la noche, y ya había alguien antes) y que
 * fue hace pocos minutos, y lo reclama una sola vez por noche: una tercera
 * persona que se une después, una llamada repetida o un cliente atrasado
 * reciben 0 filas y no se envía nada. Sala y noche salen de la base; a quien
 * se excluye del aviso es a la persona autenticada, no a un `userId` de la
 * petición. Los clientes anteriores siguen enviando `salaId`/`salaNombre`/
 * `userId`; se ignoran.
 *
 * Un solo intento: el aviso se reclama en la base ANTES de enviar el push. Si
 * el envío falla no hay reintento (la reclamación ya consta y las llamadas
 * posteriores reciben 0 filas); ver supabase/README.md.
 */
export async function POST(request: NextRequest) {
  const cuerpo = await request.json().catch(() => null);
  const nocheId = cuerpo?.nocheId;
  if (typeof nocheId !== "string" || !UUID.test(nocheId)) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: reclamados, error: errorAviso } = await supabase.rpc(
    "reclamar_aviso_noche_activada",
    { p_noche: nocheId }
  );
  if (errorAviso) {
    return NextResponse.json({ error: errorAviso.message }, { status: 400 });
  }

  const aviso = ((reclamados ?? []) as AvisoNoche[])[0];
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
    title: `🌙 ¡Ya sois suficientes en ${aviso.aviso_sala_nombre}!`,
    body: "La noche pendiente ha arrancado. Toca para unirte y registrar.",
    url: `/noche/${aviso.aviso_noche_id}`,
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

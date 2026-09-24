import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarNotificaciones } from "@/lib/webPush";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDEN_RAREZA = ["rara", "epica", "legendaria"];

type AvisoLogro = {
  aviso_logro_slug: string;
  aviso_logro_nombre: string;
  aviso_logro_icono: string | null;
  aviso_logro_rareza: string;
  aviso_sala_nombre: string;
  aviso_usuario_nombre: string;
};

/**
 * Avisa al resto de la sala cuando alguien desbloquea un logro "de por
 * vida" (rareza rara o superior) registrando una bebida suelta.
 *
 * El navegador solo dice en qué sala; NO se fía de nada más de la petición.
 * El hecho (que la persona autenticada tiene ese logro, en esa sala, recién
 * concedido y de rareza suficiente) lo comprueba la base de datos en
 * `reclamar_aviso_logro`, que además lo reclama de forma atómica: una
 * llamada repetida, o de un cliente con el estado atrasado, recibe 0 filas
 * y no se envía nada. Los textos (sala, logro, nombre de la persona) salen
 * de la base, no del cuerpo de la petición. Los clientes anteriores siguen
 * enviando además `salaNombre`/`logroNombre`/`logroIcono`; se ignoran.
 *
 * Un solo intento: el aviso se reclama en la base ANTES de enviar el push. Si
 * el envío falla no hay reintento (la reclamación ya consta y las llamadas
 * posteriores reciben 0 filas); ver supabase/README.md.
 */
export async function POST(request: NextRequest) {
  const cuerpo = await request.json().catch(() => null);
  const salaId = cuerpo?.salaId;
  if (typeof salaId !== "string" || !UUID.test(salaId)) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: reclamados, error: errorAviso } = await supabase.rpc(
    "reclamar_aviso_logro",
    { p_sala: salaId }
  );
  if (errorAviso) {
    return NextResponse.json({ error: errorAviso.message }, { status: 400 });
  }

  const avisos = (reclamados ?? []) as AvisoLogro[];
  if (avisos.length === 0) {
    return NextResponse.json({ enviados: 0, fallidos: 0, avisos: 0 });
  }

  // Si se desbloquearon varios a la vez, un solo aviso con el más raro.
  const principal = [...avisos].sort(
    (a, b) =>
      ORDEN_RAREZA.indexOf(b.aviso_logro_rareza) -
      ORDEN_RAREZA.indexOf(a.aviso_logro_rareza)
  )[0];

  const { data: suscripciones, error } = await supabase.rpc(
    "suscripciones_de_sala",
    { p_sala: salaId }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payload = {
    title: `${principal.aviso_logro_icono ?? "🏅"} ¡Logro desbloqueado en ${principal.aviso_sala_nombre}!`,
    body: `${principal.aviso_usuario_nombre} ha conseguido "${principal.aviso_logro_nombre}".`,
    url: `/sala/${salaId}`,
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

  return NextResponse.json({ ...resultado, avisos: avisos.length });
}

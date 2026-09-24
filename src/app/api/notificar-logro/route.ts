import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarNotificaciones } from "@/lib/webPush";

/**
 * Avisa al resto de la sala cuando alguien desbloquea un logro "de por
 * vida" (rareza rara o superior) registrando una bebida suelta. Mismo
 * patrón que el resto de /api/notificar-*: lo dispara el propio cliente
 * justo después de recibir el logro nuevo en la respuesta del RPC.
 */
export async function POST(request: NextRequest) {
  const { salaId, salaNombre, logroNombre, logroIcono } = await request.json();
  if (!salaId || !logroNombre) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre")
    .eq("id", user.id)
    .single();

  const { data: suscripciones, error } = await supabase.rpc(
    "suscripciones_de_sala",
    { p_sala: salaId }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payload = {
    title: `${logroIcono ?? "🏅"} ¡Logro desbloqueado en ${salaNombre}!`,
    body: `${perfil?.nombre ?? "Alguien"} ha conseguido "${logroNombre}".`,
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

  return NextResponse.json(resultado);
}

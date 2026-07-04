import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarNotificaciones } from "@/lib/webPush";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: suscripciones, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("usuario_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!suscripciones || suscripciones.length === 0) {
    return NextResponse.json(
      { error: "No tienes ninguna suscripción guardada en este dispositivo." },
      { status: 400 }
    );
  }

  const resultado = await enviarNotificaciones(suscripciones, {
    title: "🍻 Notificación de prueba",
    body: "Si ves esto, las notificaciones funcionan correctamente.",
    url: "/",
  });

  if (resultado.caducados.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", resultado.caducados);
  }

  return NextResponse.json(resultado);
}

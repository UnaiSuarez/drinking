import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { salaId, salaNombre, nocheId, userId } = await request.json();
  if (!salaId || !nocheId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const { VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } =
    process.env;
  if (!VAPID_SUBJECT || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    // Las notificaciones son un extra: si faltan las claves, no rompemos
    // el inicio de la noche, simplemente no se manda el push.
    return NextResponse.json({ enviados: 0, aviso: "VAPID no configurado" });
  }
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  const supabase = await createClient();

  // El propio usuario tiene que ser miembro de la sala (RLS lo exige dentro
  // de la función, pero comprobamos igual para responder rápido con 401).
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

  const payload = JSON.stringify({
    title: `🌙 ¡Noche iniciada en ${salaNombre}!`,
    body: "¿Sales hoy? Toca para unirte y registrar tus bebidas.",
    url: `/noche/${nocheId}`,
  });

  const destinatarios = (suscripciones ?? []).filter(
    (s: { usuario_id: string }) => s.usuario_id !== userId
  );

  await Promise.allSettled(
    destinatarios.map((s: { endpoint: string; p256dh: string; auth: string }) =>
      webpush
        .sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload
        )
        .catch(() => {
          // Suscripción caducada/inválida: no rompemos el resto de envíos.
        })
    )
  );

  return NextResponse.json({ enviados: destinatarios.length });
}

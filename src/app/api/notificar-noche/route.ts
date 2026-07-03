import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  const { salaId, salaNombre, nocheId, userId } = await request.json();
  if (!salaId || !nocheId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarNotificaciones } from "@/lib/webPush";

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

  const payload = {
    title: `🌙 ¡Noche iniciada en ${salaNombre}!`,
    body: "¿Sales hoy? Toca para unirte y registrar tus bebidas.",
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

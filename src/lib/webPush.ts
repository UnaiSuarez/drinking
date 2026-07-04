import webpush from "web-push";

export type Suscripcion = { endpoint: string; p256dh: string; auth: string };

let vapidListo = false;

function asegurarVapid(): { ok: true } | { ok: false; error: string } {
  const { VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } =
    process.env;
  if (!VAPID_SUBJECT || !NEXT_PUBLIC_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { ok: false, error: "VAPID no configurado" };
  }
  if (!vapidListo) {
    // Fallo típico: poner el email pelado en VAPID_SUBJECT en vez de
    // "mailto:tucorreo@..." — web-push exige uno de estos prefijos o
    // lanza una excepción síncrona que tumbaba toda la ruta en silencio.
    const subject = /^(mailto:|https?:\/\/)/i.test(VAPID_SUBJECT)
      ? VAPID_SUBJECT
      : `mailto:${VAPID_SUBJECT}`;
    webpush.setVapidDetails(
      subject,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    vapidListo = true;
  }
  return { ok: true };
}

/**
 * Envía un push a cada suscripción y devuelve un resumen detallado en vez de
 * tragarse los errores en silencio (que era como acababan desapareciendo
 * los avisos sin que nadie se enterara).
 */
export async function enviarNotificaciones(
  destinatarios: Suscripcion[],
  payload: Record<string, unknown>
): Promise<{
  enviados: number;
  fallidos: number;
  caducados: string[];
  error?: string;
}> {
  const vapid = asegurarVapid();
  if (!vapid.ok) {
    console.error("[push] " + vapid.error);
    return { enviados: 0, fallidos: 0, caducados: [], error: vapid.error };
  }

  const json = JSON.stringify(payload);
  let enviados = 0;
  let fallidos = 0;
  const caducados: string[] = [];

  await Promise.allSettled(
    destinatarios.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          json
        );
        enviados += 1;
      } catch (err) {
        fallidos += 1;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Suscripción caducada/revocada: la limpiamos para que deje de
          // fallar en cada envío futuro.
          caducados.push(s.endpoint);
        } else {
          console.error("[push] envío fallido:", statusCode, err);
        }
      }
    })
  );

  return { enviados, fallidos, caducados };
}

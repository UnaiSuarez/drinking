export const TOUR_STEPS = [
  { id: "learn-room", chapter: "Tu sala y tus registros", target: "[data-training='room']", read: true, title: "Una sala no es una noche", text: "Esta es la misma pantalla de una sala permanente. Puedes registrar actividad sin iniciar una noche: cuenta para tu historial y puede dar XP, pero no PL de liga. Iniciar noche crea una sesión del grupo con participantes, duración, cartas y resultado. Todo lo que hagas aquí es entrenamiento." },
  { id: "learn-water", chapter: "Tu sala y tus registros", target: "[data-training='sojas']", read: false, title: "Registra una SOJA", text: "Abre SOJAS y elige Agua. En el juego real da 2 XP y 0 PL; también cuenta como actividad para el reto diario. Aquí no sumará nada real. Puedes participar sin alcohol." },
  { id: "learn-place", chapter: "Tu sala y tus registros", target: "[data-training='place']", read: false, title: "Guarda dónde ocurrió", text: "Pulsa ¿Dónde estás? y elige Plaza de práctica. En la app se buscan sitios cercanos con tu permiso; puedes elegir uno o crear otro y ajustar su posición. Después lo verás en Mapa de sitios. Aquí usamos un lugar ficticio, sin solicitar tu GPS." },
  { id: "learn-normal", chapter: "Tu sala y tus registros", target: "[data-training='drinks']", read: false, title: "Registra una bebida normal", text: "En Rápido eliges una categoría, sin marca ni nombre concreto. Pulsa Cerveza para registrar una de prueba. Fuera de una noche daría 8 XP y 0 PL; aquí no suma nada real. No hace falta consumir nada para practicar." },
  { id: "learn-unique", chapter: "Tu sala y tus registros", target: "[data-training='drinks']", read: false, title: "Ahora, una bebida concreta", text: "Ya has registrado una bebida normal. Abre Bebida concreta y elige la bebida de muestra. Una bebida única es una entrada distinta del catálogo que has probado, no cada repetición. Su primer descubrimiento puede añadir XP según la rareza; repetirla no repite ese bonus." },
  { id: "learn-points", chapter: "Tu sala y tus registros", target: "[data-training='league']", read: true, title: "XP personal y PL de liga", text: "La XP sube tu nivel personal: registros, SOJAS, medallas y retos pueden darla. Los PL clasifican en la liga de la sala: al finalizar la noche cuentan participación/posición, registros válidos, votos y efectos, según sus reglas. No son los puntos de una bebida. Los registros sueltos dan 0 PL. Borrarlos revierte su XP, no la de medallas ya ganadas." },
  { id: "learn-night", chapter: "Una noche juntos", target: "[data-training='night']", read: false, title: "Prepara la sesión", text: "Pulsa Iniciar noche y elige duración. En una sala permanente con más miembros se espera a un segundo participante. Durante la noche se registra dentro de ella, no otra vez como bebida suelta. Aquí el guía se une automáticamente y no hay que esperar." },
  { id: "learn-card", chapter: "Una noche juntos", target: "[data-training='card']", read: false, title: "Te prestamos una carta", text: "Tienes una copia de Escudo Resaca solo para esta práctica. Pulsa Usar carta: se consume y activa la protección para esta noche. No se añade ni se resta nada de tu inventario real. Para seguir este paso hay que usarla, aunque siempre puedes omitir el tutorial." },
  { id: "learn-close", chapter: "Una noche juntos", target: "[data-training='close']", read: false, title: "Cerrar no es borrar", text: "La noche termina por tiempo o la cierra un administrador. Después se revisan los registros y se vota antes del resultado. Pulsa Cerrar noche para entrar en la revisión de práctica." },
  { id: "learn-review", chapter: "Una noche juntos", target: "[data-training='review']", read: false, title: "Revisión y resultado", text: "Este resumen corresponde a la noche, no a todos los registros de la sala. En una noche real se revisan y votan los registros según las reglas. Aquí no hay registros que disputar: confirma la revisión para ver el resultado de entrenamiento." },
  { id: "learn-reward", chapter: "Tu colección", target: "[data-training='reward']", read: false, title: "Recompensas sin competir", text: "No necesitas una noche para conseguir cofres: los niveles dan común, cada 5 épico y cada 10 solo legendario. También hay premios por medallas y retos. Abre el cofre de muestra; no es un premio para tu cuenta." },
  { id: "learn-equip", chapter: "Tu colección", target: "[data-training='equip']", read: false, title: "Conseguir no es equipar", text: "El inventario guarda tus objetos. Equipar un marco cambia el contorno; personaje y skin se eligen por separado. Las skins requieren su personaje. Equipa este marco de muestra y después podrás consultar los demás temas a tu ritmo." },
] as const;

export type TourProgress = { paso: string; vistos: string[]; estado: "en_curso" | "pausado" | "completado" };
export function normalizeTourProgress(value: Partial<TourProgress> | null): TourProgress {
  const ids = new Set<string>(TOUR_STEPS.map((step) => step.id));
  const vistos = Array.isArray(value?.vistos) ? [...new Set(value.vistos.filter((id) => ids.has(id)))] : [];
  const savedIndex = Math.max(0, TOUR_STEPS.findIndex(step => step.id === value?.paso));
  // Resume newly added lessons without discarding previously completed ones.
  const missing = TOUR_STEPS.slice(0, savedIndex).find(step => !vistos.includes(step.id));
  return {
    paso: missing?.id ?? TOUR_STEPS[savedIndex].id,
    vistos,
    estado: value?.estado === "completado" && value.paso === TOUR_STEPS.at(-1)?.id && TOUR_STEPS.every((step) => value.vistos?.includes(step.id)) ? "completado" : "pausado",
  };
}

export function completeTourAction(progress: TourProgress, action: string): TourProgress {
  const index = TOUR_STEPS.findIndex((step) => step.id === progress.paso);
  if (index < 0 || TOUR_STEPS[index].id !== action || progress.estado === "completado") return progress;
  return {
    paso: TOUR_STEPS[Math.min(index + 1, TOUR_STEPS.length - 1)].id,
    vistos: [...new Set([...progress.vistos, action])],
    estado: index === TOUR_STEPS.length - 1 ? "completado" : "en_curso",
  };
}

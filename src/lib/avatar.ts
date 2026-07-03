export type EstadoAvatar = "sobrio" | "piripi" | "contento" | "fino" | "ko";

export type AvatarConfig = {
  piel: string;
  peloEstilo: number; // 0-5
  peloColor: string;
  ropaColor: string;
  accesorio:
    | "ninguno"
    | "gafas"
    | "gorro"
    | "pajarita"
    | "corona"
    | "parche"
    | "diadema";
  gesto: "sonrisa" | "picaro" | "serio" | "lengua";
  barba: "ninguna" | "bigote" | "perilla" | "barba";
};

export const AVATAR_PREDETERMINADO: AvatarConfig = {
  piel: "#f2c397",
  peloEstilo: 1,
  peloColor: "#3d2b1f",
  ropaColor: "#ffb627",
  accesorio: "ninguno",
  gesto: "sonrisa",
  barba: "ninguna",
};

export const TONOS_PIEL = ["#ffe0bd", "#f2c397", "#c68642", "#8d5524", "#4a2c1a"];
export const COLORES_PELO = [
  "#0d0e1a", "#3d2b1f", "#a35709", "#e8b923", "#f5f1e8", "#ff2e93", "#2de2e6",
];
export const COLORES_ROPA = [
  "#ffb627", "#2de2e6", "#ff2e93", "#9bf00b", "#a78bfa", "#38bdf8", "#f5f1e8",
];
export const ESTILOS_PELO = [0, 1, 2, 3, 4, 5];
export const ACCESORIOS: AvatarConfig["accesorio"][] = [
  "ninguno",
  "gafas",
  "gorro",
  "pajarita",
  "corona",
  "parche",
  "diadema",
];
export const GESTOS: AvatarConfig["gesto"][] = [
  "sonrisa",
  "picaro",
  "serio",
  "lengua",
];
export const BARBAS: AvatarConfig["barba"][] = [
  "ninguna",
  "bigote",
  "perilla",
  "barba",
];

/** Estado de embriaguez del avatar según las bebidas de la noche (DISEÑO §8) */
export function estadoPorBebidas(bebidas: number): EstadoAvatar {
  if (bebidas >= 12) return "ko";
  if (bebidas >= 9) return "fino";
  if (bebidas >= 6) return "contento";
  if (bebidas >= 3) return "piripi";
  return "sobrio";
}

/** Clase CSS de tambaleo: cuantas más bebidas, más se balancea el avatar. */
export function claseTambaleo(bebidas: number): string {
  const estado = estadoPorBebidas(bebidas);
  if (estado === "ko") return "tambaleo-ko";
  if (estado === "fino") return "tambaleo-fuerte";
  if (estado === "contento") return "tambaleo-medio";
  if (estado === "piripi") return "tambaleo-leve";
  return "";
}

export function parseAvatarConfig(raw: unknown): AvatarConfig {
  const r = (raw ?? {}) as Partial<AvatarConfig>;
  const accesorio = ACCESORIOS.includes(r.accesorio ?? "ninguno")
    ? r.accesorio!
    : AVATAR_PREDETERMINADO.accesorio;
  const gesto = GESTOS.includes(r.gesto ?? "sonrisa")
    ? r.gesto!
    : AVATAR_PREDETERMINADO.gesto;
  const barba = BARBAS.includes(r.barba ?? "ninguna")
    ? r.barba!
    : AVATAR_PREDETERMINADO.barba;

  return {
    piel: r.piel ?? AVATAR_PREDETERMINADO.piel,
    peloEstilo: r.peloEstilo ?? AVATAR_PREDETERMINADO.peloEstilo,
    peloColor: r.peloColor ?? AVATAR_PREDETERMINADO.peloColor,
    ropaColor: r.ropaColor ?? AVATAR_PREDETERMINADO.ropaColor,
    accesorio,
    gesto,
    barba,
  };
}

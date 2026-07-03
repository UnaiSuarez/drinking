export type EstadoAvatar = "sobrio" | "piripi" | "contento" | "fino" | "ko";

export type AvatarConfig = {
  avatarImagen: string | null;
  avatarAnimacion:
    | "ninguna"
    | "neon"
    | "brillos"
    | "rayos"
    | "aura"
    | "llamas"
    | "ronda"
    | "jefe"
    | "cronica"
    | "letal"
    | "guardian";
  piel: string;
  caraForma: "redonda" | "cuadrada" | "afilada";
  peloEstilo: number; // 0-9
  peloColor: string;
  ropaColor: string;
  ropaEstilo: "camiseta" | "camisa" | "sudadera" | "chaqueta";
  accesorio:
    | "ninguno"
    | "gafas"
    | "gorro"
    | "sombrero"
    | "pajarita"
    | "corona"
    | "parche"
    | "diadema"
    | "auriculares"
    | "pendiente";
  ojos: "puntos" | "feliz" | "cansado" | "guino" | "estrella";
  cejas: "normal" | "gruesa" | "enfadada" | "triste";
  nariz: "suave" | "recta" | "boton";
  gesto: "sonrisa" | "picaro" | "serio" | "lengua" | "risa";
  barba: "ninguna" | "bigote" | "perilla" | "barba";
  marca: "ninguna" | "pecas" | "cicatriz" | "ojeras";
};

export const AVATAR_PREDETERMINADO: AvatarConfig = {
  avatarImagen: null,
  avatarAnimacion: "ninguna",
  piel: "#f2c397",
  caraForma: "redonda",
  peloEstilo: 1,
  peloColor: "#3d2b1f",
  ropaColor: "#ffb627",
  ropaEstilo: "camiseta",
  accesorio: "ninguno",
  ojos: "puntos",
  cejas: "normal",
  nariz: "suave",
  gesto: "sonrisa",
  barba: "ninguna",
  marca: "ninguna",
};

export const TONOS_PIEL = [
  "#ffe0bd",
  "#f2c397",
  "#c68642",
  "#8d5524",
  "#4a2c1a",
  "#6f4e37",
  "#f6d0b1",
];
export const COLORES_PELO = [
  "#0d0e1a",
  "#3d2b1f",
  "#a35709",
  "#e8b923",
  "#f5f1e8",
  "#ff2e93",
  "#2de2e6",
  "#9bf00b",
  "#7c3aed",
];
export const COLORES_ROPA = [
  "#ffb627",
  "#2de2e6",
  "#ff2e93",
  "#9bf00b",
  "#a78bfa",
  "#38bdf8",
  "#f5f1e8",
  "#cd7f32",
  "#111827",
];
export const FORMAS_CARA: AvatarConfig["caraForma"][] = [
  "redonda",
  "cuadrada",
  "afilada",
];
export const ESTILOS_PELO = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const ESTILOS_ROPA: AvatarConfig["ropaEstilo"][] = [
  "camiseta",
  "camisa",
  "sudadera",
  "chaqueta",
];
export const ACCESORIOS: AvatarConfig["accesorio"][] = [
  "ninguno",
  "gafas",
  "gorro",
  "sombrero",
  "pajarita",
  "corona",
  "parche",
  "diadema",
  "auriculares",
  "pendiente",
];
export const OJOS: AvatarConfig["ojos"][] = [
  "puntos",
  "feliz",
  "cansado",
  "guino",
  "estrella",
];
export const CEJAS: AvatarConfig["cejas"][] = [
  "normal",
  "gruesa",
  "enfadada",
  "triste",
];
export const NARICES: AvatarConfig["nariz"][] = [
  "suave",
  "recta",
  "boton",
];
export const GESTOS: AvatarConfig["gesto"][] = [
  "sonrisa",
  "picaro",
  "serio",
  "lengua",
  "risa",
];
export const BARBAS: AvatarConfig["barba"][] = [
  "ninguna",
  "bigote",
  "perilla",
  "barba",
];
export const MARCAS: AvatarConfig["marca"][] = [
  "ninguna",
  "pecas",
  "cicatriz",
  "ojeras",
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
  const avatarImagen =
    typeof r.avatarImagen === "string" && r.avatarImagen.startsWith("/avatars/ai/")
      ? r.avatarImagen
      : null;
  const avatarAnimacion = (
    [
      "ninguna",
      "neon",
      "brillos",
      "rayos",
      "aura",
      "llamas",
      "ronda",
      "jefe",
      "cronica",
      "letal",
      "guardian",
    ] as const
  ).includes(r.avatarAnimacion ?? "ninguna")
    ? r.avatarAnimacion!
    : AVATAR_PREDETERMINADO.avatarAnimacion;
  const caraForma = FORMAS_CARA.includes(r.caraForma ?? "redonda")
    ? r.caraForma!
    : AVATAR_PREDETERMINADO.caraForma;
  const ropaEstilo = ESTILOS_ROPA.includes(r.ropaEstilo ?? "camiseta")
    ? r.ropaEstilo!
    : AVATAR_PREDETERMINADO.ropaEstilo;
  const accesorio = ACCESORIOS.includes(r.accesorio ?? "ninguno")
    ? r.accesorio!
    : AVATAR_PREDETERMINADO.accesorio;
  const ojos = OJOS.includes(r.ojos ?? "puntos")
    ? r.ojos!
    : AVATAR_PREDETERMINADO.ojos;
  const cejas = CEJAS.includes(r.cejas ?? "normal")
    ? r.cejas!
    : AVATAR_PREDETERMINADO.cejas;
  const nariz = NARICES.includes(r.nariz ?? "suave")
    ? r.nariz!
    : AVATAR_PREDETERMINADO.nariz;
  const gesto = GESTOS.includes(r.gesto ?? "sonrisa")
    ? r.gesto!
    : AVATAR_PREDETERMINADO.gesto;
  const barba = BARBAS.includes(r.barba ?? "ninguna")
    ? r.barba!
    : AVATAR_PREDETERMINADO.barba;
  const marca = MARCAS.includes(r.marca ?? "ninguna")
    ? r.marca!
    : AVATAR_PREDETERMINADO.marca;

  return {
    avatarImagen,
    avatarAnimacion,
    piel: r.piel ?? AVATAR_PREDETERMINADO.piel,
    caraForma,
    peloEstilo: ESTILOS_PELO.includes(r.peloEstilo ?? -1)
      ? r.peloEstilo!
      : AVATAR_PREDETERMINADO.peloEstilo,
    peloColor: r.peloColor ?? AVATAR_PREDETERMINADO.peloColor,
    ropaColor: r.ropaColor ?? AVATAR_PREDETERMINADO.ropaColor,
    ropaEstilo,
    accesorio,
    ojos,
    cejas,
    nariz,
    gesto,
    barba,
    marca,
  };
}

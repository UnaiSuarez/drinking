export type MarcoPerfil =
  | "madera"
  | "plata"
  | "oro"
  | "neon"
  | "llamas"
  | "challenger";

export const MARCO_ORDEN: MarcoPerfil[] = [
  "madera",
  "plata",
  "oro",
  "neon",
  "llamas",
  "challenger",
];

export const MARCO_INFO: Record<
  MarcoPerfil,
  { nombre: string; descripcion: string }
> = {
  madera: {
    nombre: "Marco de barra",
    descripcion: "El marco base: recién llegado al bar.",
  },
  plata: {
    nombre: "Marco plateado",
    descripcion: "Se desbloquea al subir de nivel o entrar en Plata.",
  },
  oro: {
    nombre: "Marco dorado",
    descripcion: "Para perfiles con ritmo de podio.",
  },
  neon: {
    nombre: "Marco neón",
    descripcion: "Brilla cuando ya hay leyenda de temporada.",
  },
  llamas: {
    nombre: "Marco en llamas",
    descripcion: "Nivel alto o rango Maestro. Difícil pasar desapercibido.",
  },
  challenger: {
    nombre: "Corona Challenger",
    descripcion: "Reservado al nº1 con PL suficiente.",
  },
};

export function marcoPorNivel(nivel: number): MarcoPerfil {
  if (nivel >= 50) return "llamas";
  if (nivel >= 25) return "neon";
  if (nivel >= 10) return "oro";
  if (nivel >= 5) return "plata";
  return "madera";
}

export function marcoPorLiga(pl: number, esTop1 = false): MarcoPerfil {
  if (pl >= 300 && esTop1) return "challenger";
  if (pl >= 300) return "llamas";
  if (pl >= 210) return "neon";
  if (pl >= 125) return "oro";
  if (pl >= 50) return "plata";
  return "madera";
}

export function mejorMarco(...marcos: MarcoPerfil[]): MarcoPerfil {
  return marcos.reduce((mejor, actual) =>
    MARCO_ORDEN.indexOf(actual) > MARCO_ORDEN.indexOf(mejor) ? actual : mejor
  );
}

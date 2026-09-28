import { type MarcoPerfil } from "@/lib/marcos";

export type FxKind =
  | "shine" | "cristal" | "electric" | "fire" | "disco" | "cosmic"
  | "prisma" | "halo" | "crown" | "glitch" | "dust" | "portal";

/** Cada marco animado tiene su propio comportamiento. */
const FX_POR_MARCO: Partial<Record<MarcoPerfil, FxKind>> = {
  "liga-platino": "shine", "liga-gran-maestro": "crown",
  plata: "shine", oro: "shine", vip: "shine", "liga-plata": "shine", "liga-oro": "shine",
  hielo: "cristal", "liga-diamante": "cristal",
  challenger: "electric", tormenta: "electric", "liga-challenger": "electric",
  llamas: "fire", magma: "fire", "liga-maestro": "fire",
  disco: "disco", cosmico: "cosmic", prisma: "prisma", aureola: "halo",
  trono: "crown", portal: "portal", glitch: "glitch", reliquia: "dust",
  // Nivel (ciclo 0) y prestigio: marcos exclusivos, no vendibles en tienda.
  zafiro: "cristal", rubi: "shine", esmeralda: "shine", platino: "shine",
  obsidiana: "glitch", amatista: "cosmic", topacio: "shine", granate: "fire", corona: "crown",
  eclipse: "electric", supernova: "fire", quasar: "cosmic", singularidad: "portal", infinito: "prisma",
  "maestro-prestigio": "crown",
  "halloween-legendario": "glitch", "navidad-legendario": "crown",
  "anio-nuevo-legendario": "electric", "verano-legendario": "shine",
};

export function fxDeMarco(marco: MarcoPerfil): FxKind | null {
  return FX_POR_MARCO[marco] ?? null;
}

import { type MarcoPerfil } from "@/lib/marcos";

export type FxKind =
  | "shine" | "cristal" | "electric" | "fire" | "disco" | "cosmic"
  | "prisma" | "halo" | "crown" | "glitch" | "dust" | "portal";

/** Cada marco animado tiene su propio comportamiento. */
const FX_POR_MARCO: Partial<Record<MarcoPerfil, FxKind>> = {
  plata: "shine", oro: "shine", vip: "shine", "liga-plata": "shine", "liga-oro": "shine",
  hielo: "cristal", "liga-diamante": "cristal",
  challenger: "electric", tormenta: "electric", "liga-challenger": "electric",
  llamas: "fire", magma: "fire", "liga-maestro": "fire",
  disco: "disco", cosmico: "cosmic", prisma: "prisma", aureola: "halo",
  trono: "crown", portal: "portal", glitch: "glitch", reliquia: "dust",
};

export function fxDeMarco(marco: MarcoPerfil): FxKind | null {
  return FX_POR_MARCO[marco] ?? null;
}

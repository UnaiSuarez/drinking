import Image from "next/image";
import { type CartaRareza } from "@/lib/cofresDesign";

/** Fondo de respaldo por rareza para cartas sin arte de IA todavía (las
 * exclusivas de sala permanente): mismo hueco visual que una carta con
 * imagen, con un icono grande en vez de una ilustración. */
const FONDO_RESPALDO: Record<CartaRareza, string> = {
  comun: "from-[#3a3d4e] to-[#1a1c2e]",
  rara: "from-[#0d3b4a] to-[#0a1a2e]",
  epica: "from-[#4a0d32] to-[#1a0a1e]",
  legendaria: "from-[#4a3a08] to-[#1a1408]",
};

export default function CartaArte({
  imagen,
  icono,
  rareza,
  alt,
  className = "",
  sizes = "180px",
  fill = false,
}: {
  imagen?: string;
  icono?: string;
  rareza: CartaRareza;
  alt: string;
  className?: string;
  sizes?: string;
  /** Para huecos con `position: relative` que ya fijan el tamaño (equivale
   * al `fill` de next/image), en vez de width/height fijos. */
  fill?: boolean;
}) {
  if (imagen) {
    return fill ? (
      <Image src={imagen} alt={alt} fill className={className} sizes={sizes} />
    ) : (
      <Image
        src={imagen}
        alt={alt}
        width={768}
        height={768}
        className={className}
        sizes={sizes}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={alt}
      className={`flex items-center justify-center bg-gradient-to-br ${FONDO_RESPALDO[rareza]} ${fill ? "absolute inset-0" : ""} ${className}`}
    >
      <span className="text-5xl">{icono ?? "🎴"}</span>
    </span>
  );
}

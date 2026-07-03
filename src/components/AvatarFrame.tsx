import AvatarSVG from "@/components/AvatarSVG";
import { type AvatarConfig, type EstadoAvatar } from "@/lib/avatar";
import { type MarcoPerfil } from "@/lib/marcos";

const MARCO_CLASES: Record<MarcoPerfil, string> = {
  madera:
    "border-[#7c4a21] bg-[radial-gradient(circle_at_30%_20%,#7c4a21,#3b2418_70%)] shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]",
  plata:
    "border-plata bg-[radial-gradient(circle_at_30%_20%,#f5f1e8,#8a8fa8_72%)] shadow-[0_0_14px_rgba(199,204,219,0.35)]",
  oro:
    "border-oro bg-[radial-gradient(circle_at_30%_20%,#fff3a6,#ffb627_70%)] shadow-[0_0_18px_rgba(255,213,74,0.45)]",
  neon:
    "border-cian bg-[conic-gradient(from_20deg,#2de2e6,#ff2e93,#9bf00b,#2de2e6)] shadow-[0_0_20px_rgba(45,226,230,0.45)]",
  llamas:
    "border-rosa bg-[conic-gradient(from_180deg,#ff2e93,#ffb627,#ffd54a,#ff2e93)] shadow-[0_0_22px_rgba(255,46,147,0.45)]",
  challenger:
    "border-oro bg-[conic-gradient(from_0deg,#ffd54a,#2de2e6,#ff2e93,#ffd54a)] shadow-[0_0_26px_rgba(255,213,74,0.6)]",
};

export default function AvatarFrame({
  config,
  estado = "sobrio",
  marco = "madera",
  className = "h-12 w-12",
  avatarClassName,
}: {
  config: AvatarConfig;
  estado?: EstadoAvatar;
  marco?: MarcoPerfil;
  className?: string;
  avatarClassName?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full border-2 p-[8%] ${MARCO_CLASES[marco]} ${className}`}
      aria-label={`Avatar con marco ${marco}`}
    >
      {marco === "challenger" && (
        <span className="absolute -top-[28%] left-1/2 -translate-x-1/2 text-[45%] drop-shadow-[0_0_6px_rgba(255,213,74,0.8)]">
          👑
        </span>
      )}
      {marco === "llamas" && (
        <span className="absolute -top-[24%] right-[4%] text-[38%] drop-shadow-[0_0_6px_rgba(255,182,39,0.8)]">
          🔥
        </span>
      )}
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-fondo">
        <AvatarSVG
          config={config}
          estado={estado}
          className={`h-full w-full ${avatarClassName ?? ""}`}
        />
      </span>
    </span>
  );
}

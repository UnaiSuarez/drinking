import { type AvatarConfig, type EstadoAvatar } from "@/lib/avatar";

function Pelo({ estilo, color }: { estilo: number; color: string }) {
  switch (estilo) {
    case 0: // calvo
      return null;
    case 2: // punta / spiky
      return (
        <path
          d="M18 32 Q22 8 30 20 Q34 4 44 18 Q50 2 56 18 Q66 4 70 20 Q78 8 82 32 Q50 12 18 32Z"
          fill={color}
        />
      );
    case 3: // largo lateral
      return (
        <path
          d="M15 40 Q12 8 50 6 Q88 8 85 40 Q88 55 78 58 Q82 30 50 26 Q18 30 22 58 Q12 55 15 40Z"
          fill={color}
        />
      );
    case 4: // mohicano
      return <path d="M44 4 Q50 -4 56 4 L58 30 L42 30Z" fill={color} />;
    case 5: // rizado
      return (
        <>
          {[22, 34, 46, 58, 70].map((cx) => (
            <circle key={cx} cx={cx} cy={20} r={9} fill={color} />
          ))}
        </>
      );
    default: // 1: casco corto
      return <path d="M16 34 Q14 4 50 2 Q86 4 84 34 Q50 10 16 34Z" fill={color} />;
  }
}

function Cara({ estado }: { estado: EstadoAvatar }) {
  const rubor = estado !== "sobrio" && (
    <>
      <ellipse cx="30" cy="54" rx="7" ry="4" fill="#ff2e93" opacity="0.35" />
      <ellipse cx="70" cy="54" rx="7" ry="4" fill="#ff2e93" opacity="0.35" />
    </>
  );

  switch (estado) {
    case "ko":
      return (
        <>
          {rubor}
          <path d="M34 42 L46 50 M46 42 L34 50" stroke="#1a1c2e" strokeWidth="3" strokeLinecap="round" />
          <path d="M54 42 L66 50 M66 42 L54 50" stroke="#1a1c2e" strokeWidth="3" strokeLinecap="round" />
          <path d="M40 62 Q50 58 60 62" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <text x="72" y="30" fontSize="12" fill="#8a8fa8">zZz</text>
        </>
      );
    case "fino":
      return (
        <>
          {rubor}
          <path d="M32 46 Q40 40 48 46" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M52 46 Q60 40 68 46" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M38 60 Q50 68 62 60" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <text x="14" y="22" fontSize="14">✨</text>
          <text x="76" y="26" fontSize="14">✨</text>
        </>
      );
    case "contento":
      return (
        <>
          {rubor}
          <path d="M33 47 Q40 43 47 47" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M53 47 Q60 43 67 47" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M37 58 Q50 70 63 58" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "piripi":
      return (
        <>
          {rubor}
          <circle cx="40" cy="46" r="4" fill="#1a1c2e" />
          <circle cx="60" cy="46" r="4" fill="#1a1c2e" />
          <path d="M38 60 Q50 66 62 58" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    default: // sobrio
      return (
        <>
          <circle cx="40" cy="46" r="4" fill="#1a1c2e" />
          <circle cx="60" cy="46" r="4" fill="#1a1c2e" />
          <path d="M38 58 Q50 66 62 58" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
  }
}

function Accesorio({ tipo }: { tipo: AvatarConfig["accesorio"] }) {
  switch (tipo) {
    case "gafas":
      return (
        <g stroke="#1a1c2e" strokeWidth="3" fill="none">
          <circle cx="40" cy="46" r="9" />
          <circle cx="60" cy="46" r="9" />
          <path d="M49 46 L51 46" />
        </g>
      );
    case "gorro":
      return <path d="M14 34 Q12 2 50 0 Q88 2 86 34 L86 24 L14 24Z" fill="#ff2e93" />;
    case "pajarita":
      return (
        <path
          d="M40 86 L48 80 L48 92 Z M60 86 L52 80 L52 92 Z"
          fill="#2de2e6"
          stroke="#0d0e1a"
          strokeWidth="1"
        />
      );
    case "corona":
      return (
        <path
          d="M20 20 L28 4 L38 18 L50 2 L62 18 L72 4 L80 20 L76 28 L24 28Z"
          fill="#ffd54a"
          stroke="#cd7f32"
          strokeWidth="1"
        />
      );
    default:
      return null;
  }
}

export default function AvatarSVG({
  config,
  estado = "sobrio",
  className,
}: {
  config: AvatarConfig;
  estado?: EstadoAvatar;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      {/* Cuerpo/ropa */}
      <path d="M20 100 Q20 72 50 72 Q80 72 80 100Z" fill={config.ropaColor} />
      {/* Cabeza */}
      <circle cx="50" cy="45" r="32" fill={config.piel} />
      <Cara estado={estado} />
      <Pelo estilo={config.peloEstilo} color={config.peloColor} />
      <Accesorio tipo={config.accesorio} />
    </svg>
  );
}

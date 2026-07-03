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

function Boca({ gesto }: { gesto: AvatarConfig["gesto"] }) {
  switch (gesto) {
    case "picaro":
      return (
        <path
          d="M39 61 Q49 70 64 58"
          stroke="#1a1c2e"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      );
    case "serio":
      return (
        <path
          d="M40 62 L61 62"
          stroke="#1a1c2e"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      );
    case "lengua":
      return (
        <>
          <path
            d="M38 59 Q50 70 62 59"
            stroke="#1a1c2e"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M49 66 Q54 73 59 66"
            fill="#ff6fae"
            stroke="#1a1c2e"
            strokeWidth="1.5"
          />
        </>
      );
    default:
      return (
        <path
          d="M38 58 Q50 68 62 58"
          stroke="#1a1c2e"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      );
  }
}

function Barba({
  tipo,
  color,
}: {
  tipo: AvatarConfig["barba"];
  color: string;
}) {
  switch (tipo) {
    case "bigote":
      return (
        <path
          d="M48 57 Q39 51 31 58 Q40 61 49 58 Q59 61 69 58 Q61 51 52 57Z"
          fill={color}
          opacity="0.95"
        />
      );
    case "perilla":
      return (
        <path
          d="M45 66 Q50 76 55 66 Q50 70 45 66Z"
          fill={color}
          opacity="0.95"
        />
      );
    case "barba":
      return (
        <path
          d="M25 53 Q31 78 50 80 Q69 78 75 53 Q67 68 50 69 Q33 68 25 53Z"
          fill={color}
          opacity="0.9"
        />
      );
    default:
      return null;
  }
}

function Cara({
  estado,
  gesto,
  barba,
  peloColor,
}: {
  estado: EstadoAvatar;
  gesto: AvatarConfig["gesto"];
  barba: AvatarConfig["barba"];
  peloColor: string;
}) {
  const rubor = estado !== "sobrio" && (
    <>
      <ellipse cx="30" cy="54" rx="7" ry="4" fill="#ff2e93" opacity="0.35" />
      <ellipse cx="70" cy="54" rx="7" ry="4" fill="#ff2e93" opacity="0.35" />
    </>
  );
  const sombraNariz = (
    <path
      d="M50 49 Q46 55 51 57"
      stroke="#bf7c58"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      opacity="0.35"
    />
  );
  const barbaCapa = <Barba tipo={barba} color={peloColor} />;

  switch (estado) {
    case "ko":
      return (
        <>
          {rubor}
          {sombraNariz}
          {barbaCapa}
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
          {sombraNariz}
          {barbaCapa}
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
          {sombraNariz}
          {barbaCapa}
          <path d="M33 47 Q40 43 47 47" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M53 47 Q60 43 67 47" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M37 58 Q50 70 63 58" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    case "piripi":
      return (
        <>
          {rubor}
          {sombraNariz}
          {barbaCapa}
          <circle cx="40" cy="46" r="4" fill="#1a1c2e" />
          <circle cx="60" cy="46" r="4" fill="#1a1c2e" />
          <path d="M38 60 Q50 66 62 58" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    default: // sobrio
      return (
        <>
          {sombraNariz}
          {barbaCapa}
          <circle cx="40" cy="46" r="4" fill="#1a1c2e" />
          {gesto === "picaro" ? (
            <path
              d="M55 46 Q60 42 66 46"
              stroke="#1a1c2e"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          ) : (
            <circle cx="60" cy="46" r="4" fill="#1a1c2e" />
          )}
          <Boca gesto={gesto} />
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
    case "parche":
      return (
        <g>
          <path d="M26 29 L76 63" stroke="#1a1c2e" strokeWidth="2.5" />
          <path
            d="M31 39 Q40 31 49 39 Q45 52 34 51 Q29 47 31 39Z"
            fill="#0d0e1a"
          />
          <path d="M35 43 L42 43" stroke="#ffb627" strokeWidth="1.5" />
        </g>
      );
    case "diadema":
      return (
        <g>
          <path
            d="M25 28 Q50 8 75 28"
            stroke="#2de2e6"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="35" cy="18" r="4" fill="#ff2e93" />
          <circle cx="50" cy="13" r="4" fill="#9bf00b" />
          <circle cx="65" cy="18" r="4" fill="#ffb627" />
        </g>
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
      <defs>
        <radialGradient id="avatarGlow" cx="50%" cy="18%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="51" r="45" fill="url(#avatarGlow)" />
      {/* Cuerpo/ropa */}
      <path d="M20 100 Q20 72 50 72 Q80 72 80 100Z" fill={config.ropaColor} />
      <path
        d="M36 78 L50 90 L64 78"
        stroke="#0d0e1a"
        strokeWidth="3"
        fill="none"
        opacity="0.35"
      />
      {/* Cabeza */}
      <circle cx="50" cy="45" r="32" fill={config.piel} />
      <ellipse cx="39" cy="35" rx="7" ry="3" fill="#fff" opacity="0.18" />
      <Cara
        estado={estado}
        gesto={config.gesto}
        barba={config.barba}
        peloColor={config.peloColor}
      />
      <Pelo estilo={config.peloEstilo} color={config.peloColor} />
      <Accesorio tipo={config.accesorio} />
    </svg>
  );
}

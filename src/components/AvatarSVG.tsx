import { type AvatarConfig, type EstadoAvatar } from "@/lib/avatar";

function FaceShape({
  forma,
  piel,
}: {
  forma: AvatarConfig["caraForma"];
  piel: string;
}) {
  const base =
    forma === "cuadrada"
      ? "M22 41 Q22 18 50 15 Q78 18 78 41 L76 58 Q73 76 50 82 Q27 76 24 58Z"
      : forma === "afilada"
        ? "M20 42 Q22 16 50 13 Q78 16 80 42 Q78 65 50 84 Q22 65 20 42Z"
        : "M19 43 Q19 14 50 12 Q81 14 81 43 Q80 73 50 80 Q20 73 19 43Z";

  return (
    <>
      <ellipse cx="20" cy="47" rx="5" ry="8" fill={piel} />
      <ellipse cx="80" cy="47" rx="5" ry="8" fill={piel} />
      <path d={base} fill={piel} />
      <path
        d="M30 25 Q46 14 68 24"
        stroke="#ffffff"
        strokeWidth="4"
        fill="none"
        opacity="0.1"
        strokeLinecap="round"
      />
      <path
        d="M25 58 Q33 76 50 80 Q67 76 75 58"
        stroke="#0d0e1a"
        strokeWidth="2"
        fill="none"
        opacity="0.08"
      />
    </>
  );
}

function Pelo({ estilo, color }: { estilo: number; color: string }) {
  switch (estilo) {
    case 0:
      return null;
    case 2:
      return (
        <path
          d="M17 34 Q22 8 30 20 Q35 4 44 18 Q50 2 57 18 Q66 4 71 21 Q79 9 83 35 Q51 13 17 34Z"
          fill={color}
        />
      );
    case 3:
      return (
        <path
          d="M15 42 Q11 9 49 6 Q89 8 86 43 Q89 58 78 63 Q82 30 51 26 Q20 31 22 64 Q11 58 15 42Z"
          fill={color}
        />
      );
    case 4:
      return (
        <path
          d="M42 28 Q43 9 50 0 Q57 9 58 28 Q51 24 42 28Z"
          fill={color}
        />
      );
    case 5:
      return (
        <>
          {[22, 33, 44, 55, 66, 77].map((cx, i) => (
            <circle key={cx} cx={cx} cy={22 + (i % 2) * 3} r="9" fill={color} />
          ))}
          <path d="M17 34 Q50 7 83 34 Q72 25 50 25 Q28 25 17 34Z" fill={color} />
        </>
      );
    case 6:
      return (
        <>
          <path d="M17 33 Q19 9 50 7 Q75 8 83 29 Q59 18 34 24Z" fill={color} />
          <path d="M22 31 Q34 26 45 27" stroke="#f5f1e8" strokeWidth="2" opacity="0.2" />
        </>
      );
    case 7:
      return (
        <>
          {[20, 30, 40, 50, 60, 70, 80].map((cx, i) => (
            <circle key={cx} cx={cx} cy={24 - Math.abs(3 - i)} r="10" fill={color} />
          ))}
          {[27, 39, 51, 63, 75].map((cx) => (
            <circle key={`b-${cx}`} cx={cx} cy={13} r="9" fill={color} />
          ))}
        </>
      );
    case 8:
      return (
        <path
          d="M16 34 Q16 7 50 5 Q84 7 84 34 Q66 24 49 29 Q36 34 23 29 Q22 36 16 34Z"
          fill={color}
        />
      );
    case 9:
      return (
        <>
          <path d="M17 34 Q16 8 50 6 Q82 8 84 34 Q66 23 50 25 Q34 23 17 34Z" fill={color} />
          <circle cx="84" cy="39" r="10" fill={color} />
          <path d="M83 36 Q94 34 96 46" stroke={color} strokeWidth="7" fill="none" strokeLinecap="round" />
        </>
      );
    default:
      return (
        <path
          d="M16 34 Q14 5 50 3 Q86 5 84 34 Q67 22 50 22 Q33 22 16 34Z"
          fill={color}
        />
      );
  }
}

function Cejas({
  tipo,
  estado,
}: {
  tipo: AvatarConfig["cejas"];
  estado: EstadoAvatar;
}) {
  if (estado === "ko") return null;
  const strokeWidth = tipo === "gruesa" ? 3.4 : 2.4;
  if (tipo === "enfadada") {
    return (
      <g stroke="#1a1c2e" strokeWidth={strokeWidth} strokeLinecap="round">
        <path d="M31 38 L45 42" />
        <path d="M69 38 L55 42" />
      </g>
    );
  }
  if (tipo === "triste") {
    return (
      <g stroke="#1a1c2e" strokeWidth={strokeWidth} strokeLinecap="round">
        <path d="M31 42 L45 38" />
        <path d="M55 38 L69 42" />
      </g>
    );
  }
  return (
    <g stroke="#1a1c2e" strokeWidth={strokeWidth} strokeLinecap="round" opacity="0.86">
      <path d="M31 39 Q38 36 45 39" />
      <path d="M55 39 Q62 36 69 39" />
    </g>
  );
}

function Ojos({
  tipo,
  estado,
}: {
  tipo: AvatarConfig["ojos"];
  estado: EstadoAvatar;
}) {
  if (estado === "ko") {
    return (
      <g stroke="#1a1c2e" strokeWidth="3" strokeLinecap="round">
        <path d="M34 43 L45 51 M45 43 L34 51" />
        <path d="M55 43 L66 51 M66 43 L55 51" />
      </g>
    );
  }
  if (estado === "fino" || tipo === "cansado") {
    return (
      <g stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M32 47 Q39 43 47 47" />
        <path d="M53 47 Q61 43 68 47" />
      </g>
    );
  }
  if (tipo === "feliz") {
    return (
      <g stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M33 46 Q40 41 47 46" />
        <path d="M53 46 Q60 41 67 46" />
      </g>
    );
  }
  if (tipo === "guino") {
    return (
      <>
        <circle cx="40" cy="47" r="4" fill="#1a1c2e" />
        <path d="M54 47 Q61 43 68 47" stroke="#1a1c2e" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (tipo === "estrella") {
    return (
      <g fill="#1a1c2e">
        <path d="M40 40 L42 45 L48 45 L43 49 L45 55 L40 51 L35 55 L37 49 L32 45 L38 45Z" />
        <path d="M60 40 L62 45 L68 45 L63 49 L65 55 L60 51 L55 55 L57 49 L52 45 L58 45Z" />
      </g>
    );
  }
  return (
    <>
      <circle cx="40" cy="47" r="4.2" fill="#1a1c2e" />
      <circle cx="60" cy="47" r="4.2" fill="#1a1c2e" />
      <circle cx="38.5" cy="45.5" r="1.1" fill="#ffffff" opacity="0.65" />
      <circle cx="58.5" cy="45.5" r="1.1" fill="#ffffff" opacity="0.65" />
    </>
  );
}

function Nariz({ tipo }: { tipo: AvatarConfig["nariz"] }) {
  if (tipo === "recta") {
    return (
      <path
        d="M51 48 L48 58 L54 58"
        stroke="#8d5524"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.38"
      />
    );
  }
  if (tipo === "boton") {
    return <ellipse cx="51" cy="55" rx="3.8" ry="2.7" fill="#8d5524" opacity="0.24" />;
  }
  return (
    <path
      d="M50 49 Q46 55 51 57"
      stroke="#8d5524"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      opacity="0.32"
    />
  );
}

function Boca({ gesto, estado }: { gesto: AvatarConfig["gesto"]; estado: EstadoAvatar }) {
  if (estado === "ko") {
    return (
      <path
        d="M40 64 Q50 59 60 64"
        stroke="#1a1c2e"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (gesto === "risa") {
    return (
      <path
        d="M36 59 Q50 76 64 59 Q51 67 36 59Z"
        fill="#1a1c2e"
      />
    );
  }
  if (gesto === "picaro") {
    return (
      <path
        d="M39 61 Q49 70 64 58"
        stroke="#1a1c2e"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (gesto === "serio") {
    return (
      <path
        d="M40 62 L61 62"
        stroke="#1a1c2e"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    );
  }
  if (gesto === "lengua") {
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
          d="M49 66 Q54 74 59 66"
          fill="#ff6fae"
          stroke="#1a1c2e"
          strokeWidth="1.4"
        />
      </>
    );
  }
  return (
    <path
      d="M38 59 Q50 69 63 59"
      stroke="#1a1c2e"
      strokeWidth="3"
      fill="none"
      strokeLinecap="round"
    />
  );
}

function Barba({
  tipo,
  color,
}: {
  tipo: AvatarConfig["barba"];
  color: string;
}) {
  if (tipo === "bigote") {
    return (
      <path
        d="M48 57 Q39 51 31 58 Q40 62 49 58 Q59 62 69 58 Q61 51 52 57Z"
        fill={color}
        opacity="0.94"
      />
    );
  }
  if (tipo === "perilla") {
    return (
      <path
        d="M45 67 Q50 77 56 67 Q50 71 45 67Z"
        fill={color}
        opacity="0.94"
      />
    );
  }
  if (tipo === "barba") {
    return (
      <path
        d="M25 53 Q30 78 50 82 Q70 78 75 53 Q68 69 50 70 Q32 69 25 53Z"
        fill={color}
        opacity="0.9"
      />
    );
  }
  return null;
}

function Marcas({
  tipo,
  estado,
}: {
  tipo: AvatarConfig["marca"];
  estado: EstadoAvatar;
}) {
  const rubor = estado !== "sobrio" && (
    <>
      <ellipse cx="30" cy="55" rx="7" ry="4" fill="#ff2e93" opacity="0.32" />
      <ellipse cx="70" cy="55" rx="7" ry="4" fill="#ff2e93" opacity="0.32" />
    </>
  );
  if (tipo === "pecas") {
    return (
      <>
        {rubor}
        {[31, 36, 65, 70].map((cx, i) => (
          <circle key={cx} cx={cx} cy={55 + (i % 2) * 4} r="1.2" fill="#8d5524" opacity="0.5" />
        ))}
      </>
    );
  }
  if (tipo === "cicatriz") {
    return (
      <>
        {rubor}
        <path d="M66 34 L58 45 M61 37 L66 41" stroke="#8d5524" strokeWidth="1.8" strokeLinecap="round" opacity="0.48" />
      </>
    );
  }
  if (tipo === "ojeras") {
    return (
      <>
        {rubor}
        <ellipse cx="40" cy="51" rx="7" ry="2.8" fill="#6b5b95" opacity="0.2" />
        <ellipse cx="60" cy="51" rx="7" ry="2.8" fill="#6b5b95" opacity="0.2" />
      </>
    );
  }
  return <>{rubor}</>;
}

function Cara({
  config,
  estado,
}: {
  config: AvatarConfig;
  estado: EstadoAvatar;
}) {
  return (
    <>
      <FaceShape forma={config.caraForma} piel={config.piel} />
      <Marcas tipo={config.marca} estado={estado} />
      <Cejas tipo={config.cejas} estado={estado} />
      <Ojos tipo={config.ojos} estado={estado} />
      <Nariz tipo={config.nariz} />
      <Barba tipo={config.barba} color={config.peloColor} />
      <Boca gesto={config.gesto} estado={estado} />
      {estado === "fino" && (
        <>
          <path d="M16 18 L18 23 L24 24 L19 28 L20 34 L16 30 L11 34 L13 28 L8 24 L14 23Z" fill="#ffd54a" />
          <path d="M82 22 L84 27 L90 28 L85 32 L86 38 L82 34 L77 38 L79 32 L74 28 L80 27Z" fill="#2de2e6" />
        </>
      )}
      {estado === "ko" && (
        <text x="71" y="28" fontSize="11" fill="#8a8fa8" fontWeight="700">
          zZz
        </text>
      )}
    </>
  );
}

function Ropa({
  estilo,
  color,
}: {
  estilo: AvatarConfig["ropaEstilo"];
  color: string;
}) {
  if (estilo === "camisa") {
    return (
      <>
        <path d="M18 100 Q20 72 50 71 Q80 72 82 100Z" fill={color} />
        <path d="M38 73 L50 83 L62 73 L58 100 H42Z" fill="#f5f1e8" opacity="0.92" />
        <path d="M50 82 L50 100" stroke="#0d0e1a" strokeWidth="2" opacity="0.25" />
      </>
    );
  }
  if (estilo === "sudadera") {
    return (
      <>
        <path d="M16 100 Q20 70 50 70 Q80 70 84 100Z" fill={color} />
        <path d="M32 79 Q50 68 68 79 Q61 88 50 88 Q39 88 32 79Z" fill="#0d0e1a" opacity="0.22" />
        <path d="M43 82 L37 95 M57 82 L63 95" stroke="#f5f1e8" strokeWidth="1.8" opacity="0.7" />
      </>
    );
  }
  if (estilo === "chaqueta") {
    return (
      <>
        <path d="M16 100 Q19 72 50 70 Q81 72 84 100Z" fill="#0d0e1a" />
        <path d="M32 74 L48 100 H19 Q22 82 32 74Z" fill={color} />
        <path d="M68 74 L52 100 H81 Q78 82 68 74Z" fill={color} />
        <path d="M43 77 H57 L54 100 H46Z" fill="#f5f1e8" opacity="0.88" />
      </>
    );
  }
  return (
    <>
      <path d="M18 100 Q20 72 50 71 Q80 72 82 100Z" fill={color} />
      <path d="M35 79 L50 90 L65 79" stroke="#0d0e1a" strokeWidth="3" fill="none" opacity="0.28" />
    </>
  );
}

function Accesorio({ tipo }: { tipo: AvatarConfig["accesorio"] }) {
  if (tipo === "gafas") {
    return (
      <g stroke="#1a1c2e" strokeWidth="3" fill="rgba(45,226,230,0.18)">
        <circle cx="40" cy="47" r="9" />
        <circle cx="60" cy="47" r="9" />
        <path d="M49 47 L51 47" />
      </g>
    );
  }
  if (tipo === "gorro") {
    return (
      <>
        <path d="M14 34 Q12 2 50 0 Q88 2 86 34 L84 25 L16 25Z" fill="#ff2e93" />
        <circle cx="50" cy="3" r="6" fill="#f5f1e8" />
      </>
    );
  }
  if (tipo === "sombrero") {
    return (
      <g>
        <path d="M19 30 Q50 20 81 30 Q78 37 50 37 Q22 37 19 30Z" fill="#2a1a10" />
        <path d="M32 10 H68 L74 30 Q50 36 26 30Z" fill="#3d2b1f" />
        <path d="M30 25 H72" stroke="#ffb627" strokeWidth="4" />
      </g>
    );
  }
  if (tipo === "pajarita") {
    return (
      <path
        d="M39 86 L48 80 L48 92 Z M61 86 L52 80 L52 92 Z"
        fill="#2de2e6"
        stroke="#0d0e1a"
        strokeWidth="1.2"
      />
    );
  }
  if (tipo === "corona") {
    return (
      <path
        d="M20 20 L28 4 L38 18 L50 2 L62 18 L72 4 L80 20 L76 28 L24 28Z"
        fill="#ffd54a"
        stroke="#cd7f32"
        strokeWidth="1.5"
      />
    );
  }
  if (tipo === "parche") {
    return (
      <g>
        <path d="M26 30 L76 63" stroke="#1a1c2e" strokeWidth="2.5" />
        <path d="M31 40 Q40 31 49 39 Q45 53 34 52 Q29 48 31 40Z" fill="#0d0e1a" />
        <path d="M35 44 L42 44" stroke="#ffb627" strokeWidth="1.5" />
      </g>
    );
  }
  if (tipo === "diadema") {
    return (
      <g>
        <path d="M25 29 Q50 8 75 29" stroke="#2de2e6" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="35" cy="19" r="4" fill="#ff2e93" />
        <circle cx="50" cy="14" r="4" fill="#9bf00b" />
        <circle cx="65" cy="19" r="4" fill="#ffb627" />
      </g>
    );
  }
  if (tipo === "auriculares") {
    return (
      <g fill="none" stroke="#1a1c2e" strokeLinecap="round">
        <path d="M24 47 Q25 21 50 21 Q75 21 76 47" strokeWidth="4" />
        <path d="M22 46 V58 M78 46 V58" strokeWidth="7" />
        <path d="M22 46 V58 M78 46 V58" stroke="#2de2e6" strokeWidth="3" />
      </g>
    );
  }
  if (tipo === "pendiente") {
    return (
      <g>
        <circle cx="81" cy="52" r="2.2" fill="#ffd54a" />
        <path d="M81 54 L84 61" stroke="#ffd54a" strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  }
  return null;
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
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="51" r="46" fill="#ffffff" opacity="0.04" />
      <ellipse cx="50" cy="95" rx="30" ry="5" fill="#000000" opacity="0.16" />
      <Ropa estilo={config.ropaEstilo} color={config.ropaColor} />
      <path d="M41 69 H59 L62 79 Q50 85 38 79Z" fill={config.piel} />
      <Cara config={config} estado={estado} />
      <Pelo estilo={config.peloEstilo} color={config.peloColor} />
      <Accesorio tipo={config.accesorio} />
    </svg>
  );
}

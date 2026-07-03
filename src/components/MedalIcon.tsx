import { medalSpriteFor } from "@/lib/medalSprites";

type RarezaVisual = {
  cinta: string;
  metal: string;
  luz: string;
  borde: string;
  sombra: string;
  tinta: string;
};

const RAREZA: Record<string, RarezaVisual> = {
  comun: {
    cinta: "#8a8fa8",
    metal: "#c7ccdb",
    luz: "#f5f1e8",
    borde: "#3e435c",
    sombra: "#687087",
    tinta: "#15182a",
  },
  rara: {
    cinta: "#2de2e6",
    metal: "#67f5f8",
    luz: "#e9feff",
    borde: "#11797d",
    sombra: "#22aeb2",
    tinta: "#092f36",
  },
  epica: {
    cinta: "#ff2e93",
    metal: "#a78bfa",
    luz: "#f2dcff",
    borde: "#6d2c8c",
    sombra: "#7b4ed5",
    tinta: "#241134",
  },
  legendaria: {
    cinta: "#ffb627",
    metal: "#ffd54a",
    luz: "#fff3a6",
    borde: "#a75f00",
    sombra: "#d78200",
    tinta: "#3a2300",
  },
};

type MotivoProps = {
  r: RarezaVisual;
  h: number;
};

function limpiar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hashTexto(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function motivoDe(texto: string): string {
  const t = limpiar(texto);
  if (t.includes("fantasma")) return "fantasma";
  if (t.includes("kamikaze") || t.includes("suicida")) return "calavera";
  if (t.includes("sobrio") || t.includes("hielo")) return "hielo";
  if (t.includes("ganador") || t.includes("campeon")) return "trofeo";
  if (t.includes("degustador") || t.includes("divers")) return "copas";
  if (t.includes("buho") || t.includes("noche")) return "luna";
  if (t.includes("madrugador") || t.includes("hora")) return "reloj";
  if (t.includes("sprint") || t.includes("rapido") || t.includes("velocidad"))
    return "rayo";
  if (t.includes("racha") || t.includes("seguida")) return "cadena";
  if (t.includes("asist") || t.includes("constancia")) return "calendario";
  if (t.includes("remontada") || t.includes("escalador")) return "flecha";
  if (t.includes("cerveza") || t.includes("litrona")) return "jarra";
  return "sello";
}

function Fantasma({ r }: MotivoProps) {
  return (
    <g>
      <path
        d="M34 71 Q34 43 50 43 Q66 43 66 71 L61 67 L56 73 L50 67 L44 73 L39 67Z"
        fill={r.luz}
        stroke={r.tinta}
        strokeWidth="3"
      />
      <circle cx="44" cy="58" r="3" fill={r.tinta} />
      <circle cx="56" cy="58" r="3" fill={r.tinta} />
      <path d="M45 66 Q50 62 55 66" stroke={r.tinta} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Calavera({ r }: MotivoProps) {
  return (
    <g>
      <path
        d="M31 60 Q31 42 50 42 Q69 42 69 60 Q69 72 59 75 L59 82 H41 L41 75 Q31 72 31 60Z"
        fill={r.luz}
        stroke={r.tinta}
        strokeWidth="3"
      />
      <circle cx="43" cy="60" r="6" fill={r.tinta} />
      <circle cx="57" cy="60" r="6" fill={r.tinta} />
      <path d="M48 67 L52 67 L50 72Z" fill={r.tinta} />
      <path d="M42 78 H58 M46 74 V82 M54 74 V82" stroke={r.tinta} strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Hielo({ r }: MotivoProps) {
  return (
    <g>
      <path d="M36 42 H64 L70 70 L50 83 L30 70Z" fill={r.luz} stroke={r.tinta} strokeWidth="3" />
      <path d="M39 47 L50 77 L62 47 M32 68 H68" stroke={r.sombra} strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      <path d="M35 36 Q50 25 65 36" stroke="#fff6b8" strokeWidth="4" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Trofeo({ r }: MotivoProps) {
  return (
    <g>
      <path d="M39 44 H61 V59 Q61 70 50 70 Q39 70 39 59Z" fill={r.luz} stroke={r.tinta} strokeWidth="3" />
      <path d="M39 48 H29 Q29 62 40 61 M61 48 H71 Q71 62 60 61" fill="none" stroke={r.tinta} strokeWidth="3" />
      <path d="M50 70 V78 M40 82 H60" stroke={r.tinta} strokeWidth="4" strokeLinecap="round" />
      <path d="M44 54 L50 48 L56 54" fill="none" stroke={r.sombra} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function Copas({ r }: MotivoProps) {
  const copas: Array<[number, number, string]> = [
    [34, 55, "#ff2e93"],
    [50, 48, "#ffd54a"],
    [66, 55, "#2de2e6"],
  ];

  return (
    <g>
      {copas.map(([x, y, color]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          <path d="M-8 -9 H8 L5 6 H-5Z" fill={color} stroke={r.tinta} strokeWidth="2.4" />
          <path d="M0 6 V14 M-6 16 H6" stroke={r.tinta} strokeWidth="2.4" strokeLinecap="round" />
        </g>
      ))}
      <path d="M29 76 Q50 87 71 76" stroke={r.luz} strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Luna({ r }: MotivoProps) {
  return (
    <g>
      <path d="M60 40 Q42 47 44 65 Q46 81 64 82 Q52 90 39 81 Q25 72 29 55 Q34 36 60 40Z" fill={r.luz} stroke={r.tinta} strokeWidth="3" />
      <circle cx="50" cy="62" r="4" fill={r.tinta} />
      <circle cx="63" cy="63" r="4" fill={r.tinta} />
      <path d="M51 73 Q57 77 64 73" stroke={r.tinta} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Reloj({ r }: MotivoProps) {
  return (
    <g>
      <circle cx="50" cy="62" r="23" fill={r.luz} stroke={r.tinta} strokeWidth="3" />
      <path d="M50 62 V49 M50 62 L61 68" stroke={r.tinta} strokeWidth="4" strokeLinecap="round" />
      <path d="M35 39 L28 32 M65 39 L72 32" stroke="#ffd54a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="75" cy="41" r="7" fill="#ffd54a" stroke={r.tinta} strokeWidth="2" />
    </g>
  );
}

function Rayo({ r }: MotivoProps) {
  return (
    <g>
      <path d="M56 35 L34 65 H49 L43 87 L68 54 H52Z" fill="#ffd54a" stroke={r.tinta} strokeWidth="3" strokeLinejoin="round" />
      <path d="M29 47 L20 39 M72 75 L82 84" stroke={r.luz} strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    </g>
  );
}

function Cadena({ r }: MotivoProps) {
  return (
    <g>
      <path d="M35 58 Q27 66 35 74 Q43 82 51 74 L56 69" fill="none" stroke={r.luz} strokeWidth="8" strokeLinecap="round" />
      <path d="M49 56 L44 61 M49 56 Q57 48 65 56 Q73 64 65 72 L60 77" fill="none" stroke={r.tinta} strokeWidth="8" strokeLinecap="round" />
      <path d="M49 56 L44 61 M56 69 L51 74" stroke={r.metal} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function Calendario({ r }: MotivoProps) {
  return (
    <g>
      <path d="M31 43 H69 V80 H31Z" fill={r.luz} stroke={r.tinta} strokeWidth="3" />
      <path d="M31 53 H69" stroke={r.tinta} strokeWidth="3" />
      <path d="M39 36 V47 M61 36 V47" stroke={r.tinta} strokeWidth="4" strokeLinecap="round" />
      <path d="M40 63 H45 M50 63 H55 M60 63 H65 M40 72 H45 M50 72 H55" stroke={r.sombra} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function Flecha({ r }: MotivoProps) {
  return (
    <g>
      <path d="M34 75 Q47 42 70 38" stroke={r.luz} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M57 34 L72 37 L67 52" fill="none" stroke={r.tinta} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 75 H51" stroke={r.tinta} strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function Jarra({ r }: MotivoProps) {
  return (
    <g>
      <path d="M34 44 H58 V79 H34Z" fill="#ffb627" stroke={r.tinta} strokeWidth="3" />
      <path d="M58 52 H68 Q75 52 75 62 Q75 72 68 72 H58" fill="none" stroke={r.tinta} strokeWidth="5" />
      <path d="M38 39 Q42 31 48 38 Q54 28 60 40 Q51 44 38 39Z" fill={r.luz} stroke={r.tinta} strokeWidth="2" />
      <path d="M43 50 V74 M50 50 V74" stroke="#fff3a6" strokeWidth="3" opacity="0.7" />
    </g>
  );
}

function Sello({ r, h }: MotivoProps) {
  const lados = 5 + (h % 4);
  const puntos = Array.from({ length: lados }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / lados;
    const radio = i % 2 === 0 ? 25 : 18 + (h % 5);
    return `${50 + Math.cos(a) * radio},${62 + Math.sin(a) * radio}`;
  }).join(" ");
  const x = 39 + (h % 9);
  const y = 50 + ((h >> 3) % 9);
  return (
    <g>
      <polygon points={puntos} fill={r.luz} stroke={r.tinta} strokeWidth="3" />
      <circle cx={x} cy={y} r="5" fill={r.sombra} />
      <path d="M37 70 Q50 79 63 70" stroke={r.tinta} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M50 42 V82 M31 62 H69" stroke={r.tinta} strokeWidth="2" opacity="0.25" />
    </g>
  );
}

function Motivo({ tipo, r, h }: { tipo: string; r: RarezaVisual; h: number }) {
  const props = { r, h };
  if (tipo === "fantasma") return <Fantasma {...props} />;
  if (tipo === "calavera") return <Calavera {...props} />;
  if (tipo === "hielo") return <Hielo {...props} />;
  if (tipo === "trofeo") return <Trofeo {...props} />;
  if (tipo === "copas") return <Copas {...props} />;
  if (tipo === "luna") return <Luna {...props} />;
  if (tipo === "reloj") return <Reloj {...props} />;
  if (tipo === "rayo") return <Rayo {...props} />;
  if (tipo === "cadena") return <Cadena {...props} />;
  if (tipo === "calendario") return <Calendario {...props} />;
  if (tipo === "flecha") return <Flecha {...props} />;
  if (tipo === "jarra") return <Jarra {...props} />;
  return <Sello {...props} />;
}

export default function MedalIcon({
  icono,
  nombre,
  slug,
  rareza = "comun",
  secreto = false,
  className = "h-14 w-14",
  contador,
}: {
  icono: string;
  nombre?: string;
  slug?: string;
  rareza?: string;
  secreto?: boolean;
  className?: string;
  contador?: number;
}) {
  const r = RAREZA[rareza] ?? RAREZA.comun;
  const etiqueta = secreto ? "logro secreto" : slug ?? nombre ?? icono;
  const h = hashTexto(etiqueta);
  const tipo = secreto ? "sello" : motivoDe(etiqueta);
  const estrella = 42 + (h % 16);
  const slugSecreto =
    rareza === "legendaria"
      ? "secreto-legendario"
      : rareza === "epica"
      ? "secreto-epico"
      : "secreto-raro";
  const sprite = secreto
    ? medalSpriteFor({ slug: slugSecreto })
    : medalSpriteFor({ slug, nombre });
  const legendaria = rareza === "legendaria";
  const contadorEl =
    typeof contador === "number" && contador > 1 ? (
      <span className="absolute -bottom-1 -right-1 z-10 rounded-full border border-fondo bg-ambar px-1.5 py-0.5 font-titulo text-[10px] leading-none text-fondo">
        x{contador}
      </span>
    ) : null;
  const brilloLegendario = legendaria && (
    <>
      <span className="medal-legendary-aura absolute inset-0" />
      <span className="medal-legendary-spark spark-1" />
      <span className="medal-legendary-spark spark-2" />
      <span className="medal-legendary-spark spark-3" />
    </>
  );

  if (sprite) {
    const sheet = sprite.sheet.toString().padStart(2, "0");
    const x = ((sprite.col - 1) / 3) * 100;
    const y = ((sprite.row - 1) / 2) * 100;
    const spriteStyle = sprite.src
      ? {
          backgroundImage: `url("${sprite.src}")`,
          backgroundSize: "contain",
          backgroundPosition: "center",
        }
      : {
          backgroundImage: `url("/medals/ai/sheets/sheet-${sheet}.webp")`,
          backgroundSize: "400% 300%",
          backgroundPosition: `${x}% ${y}%`,
        };

    return (
      <span
        className={`relative inline-flex shrink-0 ${className} ${
          legendaria ? "medal-legendary" : ""
        }`}
        title={nombre}
      >
        <span
          className="relative z-[1] h-full w-full bg-contain bg-center bg-no-repeat drop-shadow-[0_0_14px_rgba(0,0,0,0.38)]"
          style={spriteStyle}
          aria-hidden="true"
        />
        {brilloLegendario}
        {contadorEl}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex shrink-0 ${className} ${
        legendaria ? "medal-legendary" : ""
      }`}
      title={nombre}
    >
      <svg
        viewBox="0 0 100 118"
        className="relative z-[1] h-full w-full drop-shadow-[0_0_14px_rgba(0,0,0,0.35)]"
        aria-hidden="true"
      >
        <path d="M27 5 L50 39 L73 5 H84 L63 48 H37 L16 5Z" fill={r.cinta} />
        <path d="M41 5 L50 29 L59 5Z" fill="#0d0e1a" opacity="0.3" />
        <path
          d="M50 30 L88 50 V78 L50 105 L12 78 V50Z"
          fill={r.borde}
          stroke="#0d0e1a"
          strokeWidth="3"
        />
        <path d="M50 38 L79 54 V74 L50 96 L21 74 V54Z" fill={r.metal} />
        <path d="M50 44 L72 56 V70 L50 88 L28 70 V56Z" fill={r.sombra} opacity="0.26" />
        <circle cx={estrella} cy="48" r="5" fill={r.luz} opacity="0.68" />
        <Motivo tipo={tipo} r={r} h={h} />
      </svg>
      {brilloLegendario}
      {contadorEl}
    </span>
  );
}

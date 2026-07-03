const RAREZA = {
  comun: {
    cinta: "#8a8fa8",
    metal: "#c7ccdb",
    brillo: "#f5f1e8",
    borde: "#2a2d45",
  },
  rara: {
    cinta: "#2de2e6",
    metal: "#60f3f6",
    brillo: "#e9feff",
    borde: "#11797d",
  },
  epica: {
    cinta: "#ff2e93",
    metal: "#a78bfa",
    brillo: "#f2dcff",
    borde: "#6d2c8c",
  },
  legendaria: {
    cinta: "#ffb627",
    metal: "#ffd54a",
    brillo: "#fff3a6",
    borde: "#a75f00",
  },
};

export default function MedalIcon({
  icono,
  rareza = "comun",
  secreto = false,
  className = "h-14 w-14",
  contador,
}: {
  icono: string;
  rareza?: string;
  secreto?: boolean;
  className?: string;
  contador?: number;
}) {
  const r = RAREZA[rareza as keyof typeof RAREZA] ?? RAREZA.comun;
  const contenido = secreto ? "?" : icono;

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      <svg viewBox="0 0 100 118" className="h-full w-full drop-shadow-[0_0_14px_rgba(0,0,0,0.35)]">
        <path d="M30 5 L50 38 L70 5 L82 5 L61 45 L39 45 L18 5Z" fill={r.cinta} />
        <path d="M40 5 L50 30 L60 5Z" fill="#0d0e1a" opacity="0.28" />
        <circle cx="50" cy="70" r="38" fill={r.borde} />
        <circle cx="50" cy="70" r="32" fill={r.metal} />
        <circle cx="39" cy="56" r="9" fill={r.brillo} opacity="0.55" />
        <path
          d="M22 75 Q50 104 78 75"
          stroke="#0d0e1a"
          strokeWidth="4"
          fill="none"
          opacity="0.15"
        />
      </svg>
      <span className="absolute inset-x-0 top-[39%] flex justify-center text-[38%] leading-none drop-shadow-[0_1px_0_rgba(0,0,0,0.35)]">
        {contenido}
      </span>
      {contador && contador > 1 && (
        <span className="absolute -bottom-1 -right-1 rounded-full border border-fondo bg-ambar px-1.5 py-0.5 font-titulo text-[10px] leading-none text-fondo">
          x{contador}
        </span>
      )}
    </span>
  );
}

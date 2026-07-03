import Image from "next/image";
import AvatarSVG from "@/components/AvatarSVG";
import { type AvatarConfig, type EstadoAvatar } from "@/lib/avatar";
import { type MarcoPerfil } from "@/lib/marcos";

const MARCO_CLASES: Record<
  MarcoPerfil,
  {
    base: string;
    inner: string;
    metal: string;
    gema: string;
    arte?: string;
    animacion?: "shine" | "spark" | "rayos" | "fuego" | "glitch" | "aura";
  }
> = {
  madera: {
    base: "avatar-frame-madera",
    inner: "from-[#342016] via-[#5a371f] to-[#241610]",
    metal: "#9b6330",
    gema: "#ffb627",
  },
  plata: {
    base: "avatar-frame-plata",
    inner: "from-[#eef1f8] via-[#8a8fa8] to-[#34384e]",
    metal: "#c7ccdb",
    gema: "#2de2e6",
  },
  oro: {
    base: "avatar-frame-oro",
    inner: "from-[#fff1a8] via-[#ffb627] to-[#8a4d08]",
    metal: "#ffd54a",
    gema: "#ff2e93",
  },
  neon: {
    base: "avatar-frame-neon",
    inner: "from-[#2de2e6] via-[#33415f] to-[#ff2e93]",
    metal: "#2de2e6",
    gema: "#9bf00b",
  },
  llamas: {
    base: "avatar-frame-llamas",
    inner: "from-[#ffd54a] via-[#ff2e93] to-[#6f153e]",
    metal: "#ff8a1f",
    gema: "#ffd54a",
    animacion: "fuego",
  },
  challenger: {
    base: "avatar-frame-challenger",
    inner: "from-[#fff6b8] via-[#2de2e6] to-[#7f42ff]",
    metal: "#ffd54a",
    gema: "#ffffff",
    animacion: "rayos",
  },
  pixel: {
    base: "avatar-frame-pixel",
    inner: "from-[#2de2e6] via-[#1a1c2e] to-[#ff2e93]",
    metal: "#2de2e6",
    gema: "#9bf00b",
  },
  hielo: {
    base: "avatar-frame-hielo",
    inner: "from-[#e0fbff] via-[#2de2e6] to-[#33415f]",
    metal: "#b8f7ff",
    gema: "#ffffff",
  },
  vip: {
    base: "avatar-frame-vip",
    inner: "from-[#fff6b8] via-[#ffb627] to-[#8a4d08]",
    metal: "#ffd54a",
    gema: "#ff2e93",
  },
  cosmico: {
    base: "avatar-frame-cosmico",
    inner: "from-[#7f42ff] via-[#0d0e1a] to-[#2de2e6]",
    metal: "#a78bfa",
    gema: "#ffffff",
    animacion: "spark",
  },
  cobre: {
    base: "avatar-frame-cobre",
    inner: "from-[#f4b27a] via-[#cd7f32] to-[#4a2412]",
    metal: "#cd7f32",
    gema: "#ffb627",
  },
  espuma: {
    base: "avatar-frame-espuma",
    inner: "from-[#f5f1e8] via-[#ffdf8a] to-[#5a371f]",
    metal: "#f5f1e8",
    gema: "#2de2e6",
  },
  pegatinas: {
    base: "avatar-frame-pegatinas",
    inner: "from-[#ff2e93] via-[#ffb627] to-[#2de2e6]",
    metal: "#ff2e93",
    gema: "#9bf00b",
  },
  disco: {
    base: "avatar-frame-disco",
    inner: "from-[#2de2e6] via-[#f5f1e8] to-[#ff2e93]",
    metal: "#c7ccdb",
    gema: "#ff2e93",
    animacion: "shine",
  },
  prisma: {
    base: "avatar-frame-prisma",
    inner: "from-[#2de2e6] via-[#7c3aed] to-[#ff2e93]",
    metal: "#a78bfa",
    gema: "#ffffff",
    animacion: "spark",
  },
  glitch: {
    base: "avatar-frame-glitch",
    inner: "from-[#9bf00b] via-[#0d0e1a] to-[#ff2e93]",
    metal: "#2de2e6",
    gema: "#9bf00b",
    animacion: "glitch",
  },
  magma: {
    base: "avatar-frame-magma",
    inner: "from-[#ffd54a] via-[#ff5b1a] to-[#3b1020]",
    metal: "#ff8a1f",
    gema: "#ffd54a",
    animacion: "fuego",
  },
  aureola: {
    base: "avatar-frame-aureola",
    inner: "from-[#fff6b8] via-[#f5f1e8] to-[#8a8fa8]",
    metal: "#ffd54a",
    gema: "#ffffff",
    animacion: "aura",
  },
  trono: {
    base: "avatar-frame-trono",
    inner: "from-[#fff6b8] via-[#ffb627] to-[#4a2412]",
    metal: "#ffd54a",
    gema: "#ff2e93",
    arte: "/frames/ai/items/trono.webp",
    animacion: "spark",
  },
  portal: {
    base: "avatar-frame-portal",
    inner: "from-[#2de2e6] via-[#7c3aed] to-[#ff2e93]",
    metal: "#a78bfa",
    gema: "#ffffff",
    arte: "/frames/ai/items/portal.webp",
    animacion: "aura",
  },
  tormenta: {
    base: "avatar-frame-tormenta",
    inner: "from-[#e0fbff] via-[#33415f] to-[#0d0e1a]",
    metal: "#b8f7ff",
    gema: "#2de2e6",
    arte: "/frames/ai/items/tormenta.webp",
    animacion: "rayos",
  },
  reliquia: {
    base: "avatar-frame-reliquia",
    inner: "from-[#f5f1e8] via-[#8a8fa8] to-[#342a62]",
    metal: "#c7ccdb",
    gema: "#a78bfa",
    arte: "/frames/ai/items/reliquia.webp",
    animacion: "aura",
  },
  "liga-bronce": {
    base: "avatar-frame-liga-bronce",
    inner: "from-[#5a371f] via-[#cd7f32] to-[#1f1510]",
    metal: "#cd7f32",
    gema: "#ffb627",
    arte: "/frames/ai/items/liga-bronce.webp",
  },
  "liga-plata": {
    base: "avatar-frame-liga-plata",
    inner: "from-[#f5f1e8] via-[#8a8fa8] to-[#2a2d45]",
    metal: "#c7ccdb",
    gema: "#2de2e6",
    arte: "/frames/ai/items/liga-plata.webp",
    animacion: "shine",
  },
  "liga-oro": {
    base: "avatar-frame-liga-oro",
    inner: "from-[#fff6b8] via-[#ffb627] to-[#5a371f]",
    metal: "#ffd54a",
    gema: "#ffffff",
    arte: "/frames/ai/items/liga-oro.webp",
    animacion: "shine",
  },
  "liga-diamante": {
    base: "avatar-frame-liga-diamante",
    inner: "from-[#e0fbff] via-[#2de2e6] to-[#33415f]",
    metal: "#2de2e6",
    gema: "#ffffff",
    arte: "/frames/ai/items/liga-diamante.webp",
    animacion: "spark",
  },
  "liga-maestro": {
    base: "avatar-frame-liga-maestro",
    inner: "from-[#ffd54a] via-[#ff2e93] to-[#4d1231]",
    metal: "#ff8a1f",
    gema: "#ffd54a",
    arte: "/frames/ai/items/liga-maestro.webp",
    animacion: "fuego",
  },
  "liga-challenger": {
    base: "avatar-frame-liga-challenger",
    inner: "from-[#fff6b8] via-[#2de2e6] to-[#7f42ff]",
    metal: "#ffd54a",
    gema: "#ffffff",
    arte: "/frames/ai/items/liga-challenger.webp",
    animacion: "rayos",
  },
};

export default function AvatarFrame({
  config,
  estado = "sobrio",
  marco = "madera",
  className = "h-12 w-12",
  avatarClassName,
  imageSizes = "128px",
}: {
  config: AvatarConfig;
  estado?: EstadoAvatar;
  marco?: MarcoPerfil;
  className?: string;
  avatarClassName?: string;
  imageSizes?: string;
}) {
  const marcoInfo = MARCO_CLASES[marco];
  const animado = Boolean(marcoInfo.animacion);
  const avatarAnimado = config.avatarAnimacion !== "ninguna";
  const esMarcoLiga = marco.startsWith("liga-");

  return (
    <span
      className={`avatar-frame relative inline-flex shrink-0 items-center justify-center ${marcoInfo.base} ${className}`}
      aria-label={`Avatar con marco ${marco}`}
    >
      <span
        className={`absolute inset-0 bg-gradient-to-br ${marcoInfo.inner}`}
      />
      {marcoInfo.arte && (
        <Image
          src={marcoInfo.arte}
          alt=""
          fill
          sizes={imageSizes}
          className="avatar-frame-art object-cover"
        />
      )}
      {animado && <span className="avatar-frame-shine absolute inset-0" />}
      {avatarAnimado && (
        <span className={`avatar-aura avatar-aura-${config.avatarAnimacion}`} />
      )}
      {(marco === "challenger" || marco === "liga-challenger") && (
        <>
          <span className="avatar-frame-spark spark-a" />
          <span className="avatar-frame-spark spark-b" />
          <span className="avatar-frame-spark spark-c" />
        </>
      )}
      {(marcoInfo.animacion === "spark" || marcoInfo.animacion === "aura") && (
        <>
          <span className="avatar-frame-spark spark-a" />
          <span className="avatar-frame-spark spark-b" />
          <span className="avatar-frame-spark spark-c" />
        </>
      )}
      {marcoInfo.animacion === "glitch" && (
        <>
          <span className="avatar-frame-glitch-line glitch-a" />
          <span className="avatar-frame-glitch-line glitch-b" />
        </>
      )}
      {!marcoInfo.arte && (
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
        <path
          d="M9 23 L23 9 H77 L91 23 V77 L77 91 H23 L9 77Z"
          fill="none"
          stroke="#0d0e1a"
          strokeWidth="7"
          opacity="0.65"
        />
        <path
          d="M12 24 L24 12 H76 L88 24 V76 L76 88 H24 L12 76Z"
          fill="none"
          stroke={marcoInfo.metal}
          strokeWidth="4"
        />
        <path
          d="M21 13 H38 M62 13 H79 M13 21 V38 M87 21 V38 M13 62 V79 M21 87 H38 M62 87 H79 M87 62 V79"
          fill="none"
          stroke="#f5f1e8"
          strokeLinecap="round"
          strokeWidth="2"
          opacity="0.36"
        />
        <path
          d="M50 3 L58 12 L50 20 L42 12Z"
          fill={marcoInfo.gema}
          stroke="#0d0e1a"
          strokeWidth="2"
        />
        <path
          d="M50 97 L42 88 L50 80 L58 88Z"
          fill={marcoInfo.gema}
          stroke="#0d0e1a"
          strokeWidth="2"
          opacity="0.88"
        />
        {(marco === "challenger" || marco === "liga-challenger") && (
          <>
            <path
              d={
                marco === "liga-challenger"
                  ? "M18 19 L30 4 L42 19 M38 16 L50 1 L62 16 M58 19 L70 4 L82 19"
                  : "M27 16 L36 3 L45 16 M55 16 L64 3 L73 16"
              }
              fill="none"
              stroke="#ffd54a"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
            <path
              className="avatar-frame-ray"
              d={
                marco === "liga-challenger"
                  ? "M89 4 L76 32 H88 L71 61 M12 34 L24 52 H15 L29 77"
                  : "M87 5 L76 31 H87 L72 58"
              }
              fill="none"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="4"
            />
          </>
        )}
        {esMarcoLiga && (
          <path
            d="M16 83 Q50 96 84 83"
            fill="none"
            stroke={marcoInfo.metal}
            strokeLinecap="round"
            strokeWidth="4"
            opacity="0.9"
          />
        )}
        {marco === "liga-bronce" && (
          <>
            <path
              d="M18 20 L27 12 L39 17 L33 27 L22 29Z M67 14 L80 20 L75 34 L62 30Z M20 72 L31 68 L41 79 L29 86Z"
              fill="#5a371f"
              stroke="#cd7f32"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            <path
              d="M24 18 L31 25 M68 21 L75 29 M28 72 L36 80"
              stroke="#ffb627"
              strokeLinecap="round"
              strokeWidth="2"
              opacity="0.75"
            />
          </>
        )}
        {marco === "liga-plata" && (
          <>
            <path
              d="M25 20 L39 36 M75 20 L61 36"
              stroke="#eef1f8"
              strokeLinecap="round"
              strokeWidth="5"
              opacity="0.82"
            />
            <path
              d="M22 17 Q31 9 40 17 L35 26 Q31 29 27 26Z M78 17 Q69 9 60 17 L65 26 Q69 29 73 26Z"
              fill="#c7ccdb"
              stroke="#2a2d45"
              strokeWidth="2"
            />
          </>
        )}
        {marco === "liga-oro" && (
          <>
            <circle cx="29" cy="16" r="4" fill="#fff6b8" opacity="0.92" />
            <circle cx="39" cy="11" r="3" fill="#fff6b8" opacity="0.86" />
            <circle cx="62" cy="12" r="3.5" fill="#fff6b8" opacity="0.9" />
            <circle cx="72" cy="17" r="4" fill="#fff6b8" opacity="0.82" />
            <path
              d="M31 86 L39 73 H61 L69 86Z"
              fill="#ffb627"
              stroke="#0d0e1a"
              strokeWidth="2"
            />
          </>
        )}
        {marco === "liga-diamante" && (
          <>
            <path
              d="M50 2 L61 16 L50 30 L39 16Z M9 50 L22 38 L35 50 L22 62Z M91 50 L78 38 L65 50 L78 62Z"
              fill="#2de2e6"
              stroke="#ffffff"
              strokeLinejoin="round"
              strokeWidth="2"
              opacity="0.9"
            />
            <path
              d="M39 16 H61 M22 38 V62 M78 38 V62"
              stroke="#0d0e1a"
              strokeWidth="1.5"
              opacity="0.45"
            />
          </>
        )}
        {marco === "liga-maestro" && (
          <>
            <path
              className="avatar-frame-flame"
              d="M20 67 Q6 48 21 29 Q24 43 36 49 Q24 55 20 67Z M80 67 Q94 48 79 29 Q76 43 64 49 Q76 55 80 67Z"
              fill="#ff2e93"
              opacity="0.78"
            />
            <path
              d="M42 88 Q50 72 58 88Z"
              fill="#ffd54a"
              stroke="#0d0e1a"
              strokeWidth="2"
            />
          </>
        )}
        {(marco === "llamas" || marcoInfo.animacion === "fuego") && (
          <path
            className="avatar-frame-flame"
            d="M80 14 Q92 29 82 45 Q79 36 70 32 Q76 25 80 14Z"
            fill="#ffd54a"
            opacity="0.88"
          />
        )}
        {(marco === "cosmico" || marcoInfo.animacion === "aura") && (
          <>
            <circle cx="21" cy="31" r="3" fill="#ffffff" opacity="0.86" />
            <circle cx="80" cy="66" r="2.5" fill="#2de2e6" opacity="0.9" />
            <path
              className="avatar-frame-ray"
              d="M19 73 Q50 88 81 73"
              fill="none"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeWidth="3"
              opacity="0.75"
            />
          </>
        )}
        {marcoInfo.animacion === "rayos" && marco !== "challenger" && marco !== "liga-challenger" && (
          <path
            className="avatar-frame-ray"
            d="M84 6 L72 34 H84 L66 66"
            fill="none"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
        )}
        </svg>
      )}
      <span className="absolute inset-[18%] z-[2] flex items-center justify-center overflow-hidden bg-fondo/95 [clip-path:polygon(14%_0,86%_0,100%_14%,100%_86%,86%_100%,14%_100%,0_86%,0_14%)]">
        {config.avatarImagen ? (
          <Image
            src={config.avatarImagen}
            alt=""
            fill
            sizes={imageSizes}
            className={`object-cover ${avatarClassName ?? ""}`}
          />
        ) : (
          <AvatarSVG
            config={config}
            estado={estado}
            className={`h-[115%] w-[115%] ${avatarClassName ?? ""}`}
          />
        )}
      </span>
    </span>
  );
}

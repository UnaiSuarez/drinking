"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { FRAGMENTOS_PERSONAJE_NECESARIOS, parseInventarioState } from "@/lib/inventario";
import { sinMovimiento } from "@/lib/cofreFx";
import { createClient } from "@/lib/supabase/client";
import {
  AVATARES_GRATIS,
  PERSONAJES_OCULTOS,
  TIENDA_AVATARES,
  parseTiendaState,
  rutaCompletoPersonaje,
  skinsDe,
  type PersonajeCatalogo,
  type PersonajeSkin,
  type TiendaRareza,
} from "@/lib/tienda";

gsap.registerPlugin(useGSAP);

const RAREZA: Record<TiendaRareza, { etiqueta: string; texto: string; borde: string; glow: string }> = {
  comun: { etiqueta: "Común", texto: "text-texto2", borde: "border-borde", glow: "rgba(245, 241, 232, 0.16)" },
  rara: { etiqueta: "Rara", texto: "text-cian", borde: "border-cian/60", glow: "rgba(45, 226, 230, 0.28)" },
  epica: { etiqueta: "Épica", texto: "text-rosa", borde: "border-rosa/70", glow: "rgba(255, 46, 147, 0.3)" },
  legendaria: { etiqueta: "Legendaria", texto: "text-oro", borde: "border-oro", glow: "rgba(255, 213, 74, 0.38)" },
  unica: { etiqueta: "Única", texto: "text-oro", borde: "border-oro", glow: "rgba(255, 213, 74, 0.4)" },
};

const FX_PERSONAJE = ["ronda", "jefe", "cronica", "letal", "guardian", "celestial", "deidad"];
const AURA_PERSONAJE = ["neon", "brillos", "rayos", "aura", "llamas"];
const BLOQUEADO = "/avatars/ai/items/secret-locked.webp";

type Vista = "base" | string;

function objetoConfig(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

/** Ficha de personaje como página propia: personaje completo, historia,
 * habilidad y selector de aspectos (skins normales y momentos históricos). */
export default function PersonajePagina({
  userId,
  personajeId,
  avatarConfigRaw,
  desbloqueado,
  oculto,
  ilustraciones,
}: {
  userId: string;
  personajeId: string;
  avatarConfigRaw: unknown;
  desbloqueado: boolean;
  oculto: boolean;
  /** true si existe el archivo de cuerpo completo de cada aspecto (clave = id). */
  ilustraciones: Record<string, boolean>;
}) {
  const router = useRouter();
  const raiz = useRef<HTMLDivElement>(null);
  const [rawConfig, setRawConfig] = useState<unknown>(avatarConfigRaw);
  const [vista, setVista] = useState<Vista>("base");
  const [pestana, setPestana] = useState<"skins" | "momentos">("skins");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const personaje = useMemo(() => {
    const todos: PersonajeCatalogo[] = [...AVATARES_GRATIS, ...TIENDA_AVATARES, ...PERSONAJES_OCULTOS];
    return todos.find((item) => item.id === personajeId) as PersonajeCatalogo;
  }, [personajeId]);
  const inventario = useMemo(() => parseInventarioState(rawConfig), [rawConfig]);
  const tienda = useMemo(() => parseTiendaState(rawConfig), [rawConfig]);

  const rareza = RAREZA[personaje.rareza];
  const normales = skinsDe(personajeId, "normal");
  const momentos = skinsDe(personajeId, "momento");
  const posee = (skin: PersonajeSkin) => inventario.skins.includes(skin.id);
  const propio =
    AVATARES_GRATIS.some((item) => item.id === personajeId) ||
    tienda.avatares.includes(personajeId) ||
    inventario.personajesOcultos.includes(personajeId);
  const fragmentos = Math.min(FRAGMENTOS_PERSONAJE_NECESARIOS, inventario.personajeFragmentos[personajeId] ?? 0);

  const skinVista = vista === "base" ? null : [...normales, ...momentos].find((skin) => skin.id === vista) ?? null;
  const skinBloqueada = Boolean(skinVista) && !posee(skinVista as PersonajeSkin);
  const llevaSkin = tienda.avatarEquipado === personajeId && tienda.skinEquipada;
  const equipadoBase = tienda.avatarEquipado === personajeId && !tienda.skinEquipada;

  // Qué imagen se muestra: cuerpo completo si existe; si no, el retrato entero.
  let arte = desbloqueado ? personaje.imagen : personaje.placeholderImagen ?? BLOQUEADO;
  let cuerpoCompleto = false;
  if (desbloqueado && !skinVista && ilustraciones[personajeId]) {
    arte = rutaCompletoPersonaje(personajeId);
    cuerpoCompleto = true;
  } else if (desbloqueado && skinVista) {
    if (skinBloqueada) {
      arte = BLOQUEADO;
    } else if (ilustraciones[skinVista.id]) {
      arte = skinVista.ilustracion;
      cuerpoCompleto = true;
    } else {
      arte = skinVista.imagen;
    }
  }
  const animacion = personaje.config.avatarAnimacion;
  const conFx = desbloqueado && !skinVista;

  useGSAP(
    () => {
      const el = raiz.current;
      if (!el || sinMovimiento()) return;
      const q = gsap.utils.selector(el);
      gsap.set(q(".pj-texto > *"), { opacity: 0, y: 16 });
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(q(".pj-halo"), { scale: 0.3, opacity: 0, duration: 0.9 }, 0)
        .fromTo(q(".pj-texto > *"), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.07 }, 0.35);
    },
    { scope: raiz }
  );

  // Cambio de aspecto: la imagen gira y aparece.
  useGSAP(
    () => {
      const el = raiz.current;
      if (!el || sinMovimiento()) return;
      gsap.fromTo(
        gsap.utils.selector(el)(".pj-arte"),
        { rotationY: -75, scale: 0.85, opacity: 0, transformPerspective: 900 },
        { rotationY: 0, scale: 1, opacity: 1, duration: 0.7, ease: "back.out(1.5)" }
      );
    },
    { scope: raiz, dependencies: [vista, desbloqueado] }
  );

  async function guardar(siguiente: Record<string, unknown>, texto: string) {
    setGuardando(true);
    setMensaje(null);
    const supabase = createClient();
    const { error } = await supabase.from("perfiles").update({ avatar_config: siguiente }).eq("id", userId);
    if (error) {
      setMensaje("No se pudo guardar. Prueba otra vez.");
    } else {
      setRawConfig(siguiente);
      setMensaje(texto);
      router.refresh();
    }
    setGuardando(false);
  }

  // El personaje equipado sigue siendo el personaje (aunque lleve skin): el
  // servidor resuelve su habilidad leyendo tienda.avatarEquipado.
  function equipar(skin: PersonajeSkin | null) {
    if (guardando || !propio) return;
    void guardar(
      {
        ...objetoConfig(rawConfig),
        ...personaje.config,
        avatarImagen: skin ? skin.imagen : personaje.imagen,
        tienda: { ...tienda, avatarEquipado: personajeId, skinEquipada: skin ? skin.id : null },
      },
      skin ? `${skin.nombre} equipado.` : `${personaje.nombre} equipado.`
    );
  }

  const equipadoVista = skinVista ? tienda.skinEquipada === skinVista.id && tienda.avatarEquipado === personajeId : equipadoBase;
  const lista = pestana === "skins" ? normales : momentos;

  return (
    <div ref={raiz} className="mt-4">
      <p className={`text-center font-titulo text-xs uppercase ${desbloqueado ? rareza.texto : "text-texto2"}`}>
        {rareza.etiqueta}
        {oculto && !desbloqueado ? " · Oculto" : ""}
        {desbloqueado && (equipadoBase || llevaSkin) ? " · Equipado" : ""}
      </p>

      <div className="relative mx-auto mt-3 flex w-full items-center justify-center">
        <span
          className="pj-halo pointer-events-none absolute inset-[-6%] rounded-full"
          style={{ background: `radial-gradient(circle, ${rareza.glow}, transparent 68%)` }}
          aria-hidden="true"
        />
        {/* Sin recorte: cuerpo completo si existe, o el retrato entero (object-contain). */}
        <div
          className={`pj-arte relative w-full overflow-hidden rounded-2xl border bg-fondo/70 ${rareza.borde} ${
            cuerpoCompleto ? "aspect-[3/4]" : "aspect-square"
          } mx-auto`}
          style={{ maxHeight: "62dvh", maxWidth: cuerpoCompleto ? undefined : "min(100%, 62dvh)" }}
        >
          <Image
            src={arte}
            alt={desbloqueado ? (skinVista && !skinBloqueada ? skinVista.nombre : personaje.nombre) : "Personaje oculto"}
            fill
            sizes="(max-width: 640px) 92vw, 448px"
            className="object-contain"
            priority
          />
          {conFx && FX_PERSONAJE.includes(animacion) && (
            <span className={`avatar-character-fx avatar-character-fx-${animacion}`} aria-hidden="true" />
          )}
          {conFx && AURA_PERSONAJE.includes(animacion) && (
            <span className={`avatar-aura avatar-aura-${animacion}`} aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="pj-texto mt-5 text-center">
        <h1 className="font-titulo text-3xl text-texto">
          {desbloqueado ? (skinVista && !skinBloqueada ? skinVista.nombre : personaje.nombre) : "???"}
        </h1>
        {skinVista && !skinBloqueada && (
          <p className="text-xs text-texto2">Aspecto de {personaje.nombre}</p>
        )}
        {!desbloqueado && (
          <>
            <p className="mt-1 text-sm text-texto2">
              Sus fragmentos pueden aparecer en cualquier cofre. La identidad se revela al completarlos.
            </p>
            <div className="mx-auto mt-3 max-w-xs">
              <div className="h-1.5 overflow-hidden rounded-full bg-fondo">
                <div className="h-full rounded-full bg-oro" style={{ width: `${(fragmentos / FRAGMENTOS_PERSONAJE_NECESARIOS) * 100}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-texto2">
                {fragmentos}/{FRAGMENTOS_PERSONAJE_NECESARIOS} fragmentos
              </p>
            </div>
            <Link href="/inventario" className="mt-4 inline-block rounded-xl border border-cian px-4 py-2 font-titulo text-sm text-cian active:scale-95">
              Ir a mis cofres
            </Link>
          </>
        )}
      </div>

      {desbloqueado && (
        <div className="pj-texto mt-5 space-y-4">
          {/* Historia */}
          <section className="rounded-2xl border border-borde bg-tarjeta p-4">
            <h2 className="mb-1 font-titulo text-sm text-ambar">Historia</h2>
            {skinVista && !skinBloqueada && skinVista.tipo === "momento" ? (
              <>
                {skinVista.fecha && <p className="mb-1 text-xs text-cian">{skinVista.fecha}</p>}
                <p className="text-sm leading-snug text-texto2">
                  {skinVista.historia ?? "La historia de este momento aún está pendiente de escribir."}
                </p>
              </>
            ) : (
              <p className="text-sm leading-snug text-texto2">
                {personaje.historia ?? "La historia de este personaje aún no está escrita."}
              </p>
            )}
          </section>

          {/* Habilidad */}
          {personaje.habilidad && (
            <section className="rounded-2xl border border-oro/40 bg-oro/10 p-4">
              <h2 className="mb-1 font-titulo text-sm text-oro">Habilidad</h2>
              <p className="text-sm leading-snug text-oro">{personaje.habilidad}</p>
            </section>
          )}

          {/* Aspectos: skins normales y momentos históricos, en pestañas separadas */}
          {oculto && (
            <section className="rounded-2xl border border-borde bg-tarjeta p-4">
              <h2 className="mb-3 font-titulo text-sm text-texto">Aspectos</h2>
              <div role="tablist" aria-label="Tipo de aspecto" className="mb-3 grid grid-cols-2 gap-2">
                {([
                  ["skins", "Skins", normales],
                  ["momentos", "Momentos históricos", momentos],
                ] as const).map(([id, nombre, items]) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={pestana === id}
                    onClick={() => setPestana(id)}
                    className={`rounded-xl border px-2 py-2 font-titulo text-xs active:scale-95 ${
                      pestana === id ? "border-cian bg-cian/10 text-cian" : "border-borde text-texto2"
                    }`}
                  >
                    {nombre} ({items.filter(posee).length}/{items.length})
                  </button>
                ))}
              </div>

              <ul className="grid grid-cols-3 gap-2" role="tabpanel">
                {pestana === "skins" && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setVista("base")}
                      aria-pressed={vista === "base"}
                      className={`w-full rounded-xl border p-1 text-center active:scale-95 ${vista === "base" ? "border-cian" : "border-borde"}`}
                    >
                      <span className="relative block aspect-square overflow-hidden rounded-lg bg-fondo/70">
                        <Image src={personaje.imagen} alt="" fill sizes="100px" className="object-contain" />
                      </span>
                      <span className="mt-1 block text-[10px] text-texto2">Original</span>
                    </button>
                  </li>
                )}
                {lista.map((skin) => {
                  const tiene = posee(skin);
                  const r = RAREZA[skin.rareza];
                  return (
                    <li key={skin.id}>
                      <button
                        type="button"
                        onClick={() => setVista(skin.id)}
                        aria-pressed={vista === skin.id}
                        className={`w-full rounded-xl border p-1 text-center active:scale-95 ${vista === skin.id ? "border-cian" : r.borde}`}
                      >
                        <span className="relative block aspect-square overflow-hidden rounded-lg bg-fondo/70">
                          <Image src={tiene ? skin.imagen : BLOQUEADO} alt="" fill sizes="100px" className={`object-contain ${tiene ? "" : "opacity-70"}`} />
                        </span>
                        <span className={`mt-1 block truncate text-[10px] ${tiene ? r.texto : "text-texto2"}`}>
                          {tiene ? skin.nombre : "???"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {lista.length === 0 && (
                <p className="rounded-xl border border-dashed border-borde px-3 py-4 text-center text-xs text-texto2">
                  {pestana === "skins"
                    ? "Aún no hay skins para este personaje."
                    : "Aún no hay momentos históricos para este personaje."}
                </p>
              )}
              <p className="mt-3 text-[11px] text-texto2">Se consiguen en cofres, solo con el personaje desbloqueado.</p>

              {skinVista && (
                <div className="mt-3 rounded-xl bg-fondo/60 p-3 text-left">
                  <p className={`font-titulo text-sm ${skinBloqueada ? "text-texto2" : RAREZA[skinVista.rareza].texto}`}>
                    {skinBloqueada ? "???" : skinVista.nombre}
                    <span className="ml-2 text-[10px] uppercase text-texto2">
                      {skinVista.tipo === "momento" ? "Momento histórico" : RAREZA[skinVista.rareza].etiqueta}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-texto2">
                    {skinBloqueada ? "Aún no la has conseguido: aparecerá en algún cofre." : skinVista.descripcion ?? ""}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Equipar */}
          {propio ? (
            <button
              type="button"
              disabled={guardando || equipadoVista || skinBloqueada}
              onClick={() => equipar(skinVista)}
              className="w-full rounded-xl bg-cian py-3 font-titulo text-sm text-fondo active:scale-95 disabled:opacity-50"
            >
              {equipadoVista ? "Equipado" : skinBloqueada ? "Sin conseguir" : skinVista ? "Equipar aspecto" : "Equipar personaje"}
            </button>
          ) : (
            <Link href="/tienda" className="block w-full rounded-xl border border-ambar py-3 text-center font-titulo text-sm text-ambar active:scale-95">
              Conseguir en la tienda
            </Link>
          )}
          {mensaje && <p className="text-center text-sm text-cian">{mensaje}</p>}
        </div>
      )}
    </div>
  );
}

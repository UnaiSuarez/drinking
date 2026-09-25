"use client";

import { useState } from "react";
import CofreAperturaModal from "@/components/CofreAperturaModal";
import CartaDetalleModal from "@/components/CartaDetalleModal";
import CartaUsoCelebracion from "@/components/CartaUsoCelebracion";
import Link from "next/link";
import { CARTAS_COFRES, COFRES_TIPOS, MONEDA_COFRES, type CartaCofre } from "@/lib/cofresDesign";
import { FRAGMENTOS_PERSONAJE_NECESARIOS, type RecompensaCofre } from "@/lib/inventario";
import { PERSONAJES_OCULTOS, rutaCompletoPersonaje, skinsDisponibles, type PersonajeSkin } from "@/lib/tienda";
import { prepararAudioCofre } from "@/lib/cofreAudio";

type Prueba =
  | { tipo: "cofre"; cofreId: (typeof COFRES_TIPOS)[number]["id"]; recompensas: RecompensaCofre[] }
  | { tipo: "uso"; carta: CartaCofre }
  | { tipo: "detalle"; carta: CartaCofre; bloqueada: boolean };

let contador = 0;

function recompensaCarta(carta: CartaCofre): RecompensaCofre {
  return {
    id: `prueba-${++contador}`,
    tipo: "carta",
    cartaId: carta.id,
    nombre: carta.nombre,
    rareza: carta.rareza,
    imagen: carta.imagen,
    descripcion: carta.descripcion,
    oculta: Boolean(carta.oculta),
  };
}

function primeraCarta(rareza: CartaCofre["rareza"], oculta = false) {
  return CARTAS_COFRES.find((c) => c.rareza === rareza && Boolean(c.oculta) === oculta) ?? CARTAS_COFRES[0];
}

/** Herramientas de administrador: lanza las animaciones de cofres, cartas y
 * personajes con datos de prueba. No guarda nada ni toca la base de datos. */
export default function AdminPruebasAnimacion() {
  const [prueba, setPrueba] = useState<Prueba | null>(null);
  const [cofreId, setCofreId] = useState<(typeof COFRES_TIPOS)[number]["id"]>("legendario");
  const [cartaId, setCartaId] = useState(CARTAS_COFRES[0]?.id ?? "");
  const [personajeId, setPersonajeId] = useState(PERSONAJES_OCULTOS[0]?.id ?? "");
  const [skinRealId, setSkinRealId] = useState(skinsDisponibles()[0]?.id ?? "");
  const skinReal = skinsDisponibles().find((s) => s.id === skinRealId) ?? skinsDisponibles()[0];
  const carta = CARTAS_COFRES.find((c) => c.id === cartaId) ?? CARTAS_COFRES[0];
  const personaje = PERSONAJES_OCULTOS.find((p) => p.id === personajeId) ?? PERSONAJES_OCULTOS[0];

  function lanzarCofre(recompensas: RecompensaCofre[]) {
    prepararAudioCofre();
    setPrueba({ tipo: "cofre", cofreId, recompensas });
  }

  // previos = fragmentos que ya "tenías"; completa = este fragmento desbloquea al personaje.
  const fragmento = (previos = 1, completa = false): RecompensaCofre => ({
    id: `prueba-${++contador}`,
    tipo: "fragmentoPersonaje",
    personajeId: personaje.id,
    nombre: completa ? personaje.nombre : "Fragmento de personaje oculto",
    rareza: "unica",
    imagen: personaje.imagen,
    descripcion: completa ? personaje.descripcion : "Reune 3 para desbloquearlo.",
    fragmentos: 1,
    necesarios: FRAGMENTOS_PERSONAJE_NECESARIOS,
    indice: Math.min(previos, FRAGMENTOS_PERSONAJE_NECESARIOS - 1),
    previos,
    completa,
    yaTenido: false,
  });

  const monedas = (): RecompensaCofre => ({
    id: `prueba-${++contador}`,
    tipo: "monedas",
    nombre: "120 chapas",
    cantidad: 120,
    rareza: "comun",
    imagen: MONEDA_COFRES.montonImagen,
    descripcion: "Chapas de prueba.",
  });

  // Skin real del catálogo: usa su avatar y su ilustración completa de verdad.
  const desdeSkin = (s: PersonajeSkin): RecompensaCofre => ({
    id: `prueba-${++contador}`,
    tipo: "skin",
    skinId: s.id,
    personajeId: s.personajeId,
    personajeNombre: PERSONAJES_OCULTOS.find((p) => p.id === s.personajeId)?.nombre ?? "",
    skinTipo: s.tipo,
    nombre: s.nombre,
    rareza: s.rareza,
    imagen: s.imagen,
    ilustracion: s.ilustracion,
    descripcion: s.descripcion ?? `Skin de ${PERSONAJES_OCULTOS.find((p) => p.id === s.personajeId)?.nombre ?? "personaje"}.`,
    fecha: s.fecha,
  });

  // Momento de prueba (aún no hay momentos reales): usa el arte del personaje elegido.
  const skin = (momento: boolean): RecompensaCofre => ({
    id: `prueba-${++contador}`,
    tipo: "skin",
    skinId: `prueba-${momento ? "momento" : "skin"}`,
    personajeId: personaje.id,
    personajeNombre: personaje.nombre,
    skinTipo: momento ? "momento" : "normal",
    nombre: momento ? "Momento de prueba" : "Skin de prueba",
    rareza: "legendaria",
    imagen: personaje.imagen,
    ilustracion: rutaCompletoPersonaje(personaje.id),
    descripcion: "Recompensa de prueba.",
    fecha: momento ? "1 de enero de 2025" : undefined,
  });

  const presets: { nombre: string; crear: () => RecompensaCofre[] }[] = [
    { nombre: "Común", crear: () => [recompensaCarta(primeraCarta("comun"))] },
    { nombre: "Rara + Épica", crear: () => [recompensaCarta(primeraCarta("rara")), recompensaCarta(primeraCarta("epica"))] },
    { nombre: "Legendaria", crear: () => [recompensaCarta(primeraCarta("legendaria")), recompensaCarta(primeraCarta("comun"))] },
    { nombre: "Exclusiva", crear: () => [recompensaCarta(primeraCarta("legendaria", true))] },
    { nombre: "Fragmento 1/3", crear: () => [fragmento(0)] },
    { nombre: "Fragmento 2/3", crear: () => [fragmento(1)] },
    { nombre: "Personaje completo", crear: () => [fragmento(FRAGMENTOS_PERSONAJE_NECESARIOS - 1, true)] },
    { nombre: "Skin", crear: () => [skinReal ? desdeSkin(skinReal) : skin(false)] },
    { nombre: "Momento histórico", crear: () => [skin(true)] },
    { nombre: "Chapas", crear: () => [monedas(), monedas()] },
    { nombre: "Todo junto", crear: () => [recompensaCarta(primeraCarta("comun")), recompensaCarta(primeraCarta("epica")), recompensaCarta(primeraCarta("legendaria")), fragmento(1)] },
  ];

  const selectClase = "w-full rounded-xl border border-borde bg-fondo px-3 py-2 text-sm text-texto";
  const botonClase = "rounded-xl border border-cian/60 bg-cian/10 px-3 py-2 font-titulo text-xs text-cian active:scale-95";

  return (
    <section className="mt-6 rounded-2xl border border-ambar/50 bg-tarjeta p-4">
      <p className="mb-1 font-titulo text-sm text-texto">🎬 Probar animaciones</p>
      <p className="mb-3 text-[11px] text-texto2">Solo visual: no da ni quita nada.</p>

      <p className="mb-1 text-xs text-texto2">Apertura de cofre</p>
      <select value={cofreId} onChange={(e) => setCofreId(e.target.value as typeof cofreId)} className={`${selectClase} mb-2`}>
        {COFRES_TIPOS.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <div className="mb-4 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button key={p.nombre} type="button" onClick={() => lanzarCofre(p.crear())} className={botonClase}>
            {p.nombre}
          </button>
        ))}
      </div>

      <p className="mb-1 text-xs text-texto2">Carta</p>
      <select value={cartaId} onChange={(e) => setCartaId(e.target.value)} className={`${selectClase} mb-2`}>
        {CARTAS_COFRES.map((c) => (
          <option key={c.id} value={c.id}>{c.oculta ? "🔒 " : ""}{c.nombre} ({c.rareza})</option>
        ))}
      </select>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setPrueba({ tipo: "uso", carta })} className={botonClase}>Usar carta</button>
        <button type="button" onClick={() => setPrueba({ tipo: "detalle", carta, bloqueada: false })} className={botonClase}>Ver detalle</button>
        <button type="button" onClick={() => setPrueba({ tipo: "detalle", carta, bloqueada: true })} className={botonClase}>Detalle bloqueada</button>
      </div>

      <p className="mb-1 text-xs text-texto2">Skin real (con su arte de verdad)</p>
      <select value={skinRealId} onChange={(e) => setSkinRealId(e.target.value)} className={`${selectClase} mb-2`}>
        {skinsDisponibles().map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre} · {PERSONAJES_OCULTOS.find((p) => p.id === s.personajeId)?.nombre} ({s.rareza})
          </option>
        ))}
      </select>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" disabled={!skinReal} onClick={() => skinReal && lanzarCofre([desdeSkin(skinReal)])} className={botonClase}>Aparición en cofre</button>
        <button type="button" disabled={skinsDisponibles().length === 0} onClick={() => lanzarCofre(skinsDisponibles().map(desdeSkin))} className={botonClase}>Todas las skins</button>
        {skinReal && <Link href={`/personaje/${skinReal.personajeId}`} className={botonClase}>Ver ficha</Link>}
      </div>

      <p className="mb-1 text-xs text-texto2">Personaje</p>
      <select value={personajeId} onChange={(e) => setPersonajeId(e.target.value)} className={`${selectClase} mb-2`}>
        {PERSONAJES_OCULTOS.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
      <div className="flex flex-wrap gap-2">
        <Link href={`/personaje/${personajeId}`} className={botonClase}>Ficha</Link>
        <Link href={`/personaje/${personajeId}?demo=bloqueado`} className={botonClase}>Ficha bloqueada</Link>
        <button type="button" onClick={() => lanzarCofre([fragmento(0)])} className={botonClase}>Fragmento 1/3</button>
        <button type="button" onClick={() => lanzarCofre([fragmento(FRAGMENTOS_PERSONAJE_NECESARIOS - 1, true)])} className={botonClase}>Desbloquear</button>
      </div>

      {prueba?.tipo === "cofre" && (
        <CofreAperturaModal
          key={contador}
          cofre={COFRES_TIPOS.find((c) => c.id === prueba.cofreId) ?? COFRES_TIPOS[0]}
          recompensas={prueba.recompensas}
          onClose={() => setPrueba(null)}
        />
      )}
      {prueba?.tipo === "uso" && <CartaUsoCelebracion carta={prueba.carta} detalle="Prueba de animación" onClose={() => setPrueba(null)} />}
      {prueba?.tipo === "detalle" && <CartaDetalleModal carta={prueba.carta} cantidad={2} bloqueada={prueba.bloqueada} onClose={() => setPrueba(null)} />}
    </section>
  );
}

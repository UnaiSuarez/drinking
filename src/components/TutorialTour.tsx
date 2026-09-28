"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Driver } from "driver.js";
import { trainingAction } from "@/app/tutorial/actions";
import { TOUR_STEPS, type TourProgress } from "@/lib/tutorialTour";
import { AVATAR_PREDETERMINADO } from "@/lib/avatar";
import { TrainingContext } from "@/components/TrainingContext";
import SalaView from "@/components/SalaView";
import NightCardSummary from "@/components/NightCardSummary";
import AvatarFrame from "@/components/AvatarFrame";
import "driver.js/dist/driver.css";
import "./tutorial-tour.css";

const button = "min-h-12 w-full rounded-xl bg-cian px-4 py-3 font-bold text-fondo disabled:opacity-40";
const drinks = [
  { id: 1, nombre: "Cerveza", icono: "🍺", puntos: 1 },
  { id: 2, nombre: "Pinta", icono: "🍻", puntos: 2 },
  { id: 3, nombre: "Chupito", icono: "🥃", puntos: 2 },
  { id: 4, nombre: "Cubata", icono: "🍹", puntos: 3 },
  { id: 5, nombre: "Vino", icono: "🍷", puntos: 1 },
];
const catalog = [{ id: "training-drink", nombre: "Bebida de muestra", rareza: "rara", categoriaId: 1 }];

export default function TutorialTour({ userId, initial, loadError }: {
  userId: string; initial: TourProgress; loadError: boolean;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(initial);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const spotlight = useRef<Driver | null>(null);
  const scene = useRef<HTMLDivElement>(null);
  const step = TOUR_STEPS.find(s => s.id === progress.paso) ?? TOUR_STEPS[0];
  const index = TOUR_STEPS.indexOf(step);
  const done = progress.estado === "completado";

  const run = useCallback(async (action: string) => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await trainingAction(action);
      setProgress(next);
      if (next.estado === "completado") setActive(false);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se guardó la práctica. Puedes reintentar u omitir.");
      return false;
    } finally { lock.current = false; setBusy(false); }
  }, []);

  const skip = useCallback(() => {
    setActive(false);
    spotlight.current?.destroy();
    // Navigation is never held hostage by an unavailable save.
    void run("pause").then(() => router.push("/"));
  }, [run, router]);

  useEffect(() => {
    if (!active || done) return;
    let cancelled = false;
    let instance: Driver | undefined;
    let observer: MutationObserver | undefined;
    let resize: ResizeObserver | undefined;
    let selected: Element | null = null;
    const header = document.querySelector("header.sticky");
    const wasInert = header instanceof HTMLElement && header.inert;
    if (header instanceof HTMLElement) header.inert = true;
    void import("driver.js").then(({ driver }) => {
      if (cancelled) return;
      instance = driver({
        animate: false, smoothScroll: false, allowClose: false,
        allowKeyboardControl: false, overlayClickBehavior: () => {},
        overlayOpacity: 0.58, stagePadding: 6, stageRadius: 10,
        popoverClass: "ranking-tour-popover",
        onPopoverRender: (popover) => {
          const exit = document.createElement("button");
          exit.type = "button";
          exit.className = "training-skip";
          exit.textContent = "Omitir tutorial";
          exit.onclick = skip;
          popover.wrapper.append(exit);
        },
      });
      spotlight.current = instance;
      const highlight = () => {
        const target = scene.current?.querySelector(step.target);
        if (!target || target === selected) return;
        selected = target;
        resize?.disconnect();
        instance?.highlight({ element: target, popover: {
          title: step.title, description: error || step.text,
          side: "bottom", align: "center",
          showButtons: step.read ? ["next"] : [],
          nextBtnText: "Entendido", doneBtnText: "Entendido",
          onNextClick: () => { void run(step.id); },
        } });
        resize = new ResizeObserver(() => instance?.refresh());
        resize.observe(target);
      };
      highlight();
      observer = new MutationObserver(highlight);
      if (scene.current) observer.observe(scene.current, { subtree: true, childList: true });
    }).catch(() => { setActive(false); setError("No se pudo abrir la ayuda. Vuelve a intentarlo."); });
    return () => {
      cancelled = true;
      observer?.disconnect();
      resize?.disconnect();
      instance?.destroy();
      spotlight.current = null;
      if (header instanceof HTMLElement) header.inert = wasInert;
    };
  }, [active, done, step, run, skip, error]);

  async function start() {
    if (loadError) return;
    if (await run(done ? "restart" : "start")) setActive(true);
  }

  if (!active && !done) return <main className="mx-auto max-w-md px-5 py-8">
    <p className="text-sm font-bold text-cian">ENTRENAMIENTO</p>
    <h1 className="mt-3 font-titulo text-3xl">Aprende dentro de tu sala</h1>
    <p className="mt-4 text-sm leading-7 text-texto2">Usarás los controles de la sala con datos de prueba. No subirás de nivel, no cambiará tu liga y no gastarás objetos reales.</p>
    <ol className="my-6 space-y-4 border-y border-borde py-5">
      <li><strong>Tu sala y tus registros</strong><p className="mt-1 text-sm text-texto2">SOJAS, ubicaciones, bebidas únicas y XP frente a PL.</p></li>
      <li><strong>Una noche juntos</strong><p className="mt-1 text-sm text-texto2">Duración, una carta prestada, cierre y revisión.</p></li>
      <li><strong>Tu colección</strong><p className="mt-1 text-sm text-texto2">De dónde salen los cofres y cómo equipar.</p></li>
    </ol>
    {(error || loadError) && <p role="alert" className="mb-4 text-sm text-rosa">{error || "No se pudo leer tu progreso. Recarga para reintentar."}</p>}
    <button className={button} disabled={busy || loadError} onClick={() => void start()}>{busy ? "Preparando…" : index ? "Retomar entrenamiento" : "Entrar en la sala de entrenamiento"}</button>
    <button className="mt-2 min-h-12 w-full text-sm text-texto2" onClick={skip}>Omitir tutorial</button>
    <Link href="/guia" className="mt-3 block text-center text-sm text-cian underline">Consultar un tema</Link>
  </main>;

  if (done) return <main className="mx-auto max-w-md px-5 py-8">
    <h1 className="font-titulo text-3xl text-cian">Entrenamiento terminado</h1>
    <p className="my-5 text-sm leading-7 text-texto2">Has registrado, guardado una ubicación y descubierto una bebida de muestra. Has preparado una noche, usado la carta prestada y equipado un marco. Solo se ha guardado tu avance en el tutorial.</p>
    <h2 className="font-titulo text-xl">Sigue a tu ritmo</h2>
    <p className="mt-3 text-sm leading-7 text-texto2">En tu perfil encontrarás medallas, título y vitrina. Las fichas de personaje reúnen skins e historias; el prestigio se desbloquea al nivel 50. Retos, Amigos, Mapa y Ajustes tienen su explicación en la guía.</p>
    <Link href="/" className={button + " mt-6 block text-center"}>Ir a mis salas</Link>
    <Link href="/guia" className="my-4 block text-center text-cian underline">Ver todos los temas</Link>
    <button className="min-h-12 w-full text-texto2 underline" disabled={busy} onClick={() => void start()}>Repetir entrenamiento</button>
  </main>;

  return <TrainingContext.Provider value={{ step: step.id, completed: progress.vistos, run }}>
    <div className="mx-auto max-w-md border-b border-cian/30 px-5 py-3">
      <p className="text-xs font-bold text-cian">ENTRENAMIENTO · SIN PREMIOS REALES</p>
      <p className="mt-1 text-sm text-texto2">{step.chapter}</p>
      <p role="status" className="sr-only">{busy ? "Guardando práctica" : ""}</p>
    </div>
    <div ref={scene} className="tutorial-practice pb-72"
      onClickCapture={event => { if ((event.target as Element).closest("a")) { event.preventDefault(); event.stopPropagation(); } }}>
      {(step.chapter === "Tu sala y tus registros" || step.id === "learn-night") ? <SalaView sala={{ id: "training-room", nombre: "Sala de entrenamiento", codigo: "PRUEBA" }}
        esTemporada={false} esPermanente={true} bebidasSueltas={drinks} catalogoBebidas={catalog}
        racha={{ actual: 0, mejor: 0 }} miembros={[{ id: userId, nombre: "Tú", rol: "fundador", avatarConfig: AVATAR_PREDETERMINADO }, { id: "training-guide", nombre: "Guía", rol: "miembro", avatarConfig: AVATAR_PREDETERMINADO }]}
        miRol="fundador" userId={userId} nocheActiva={null} nochesCerradas={[]} temporada={null} temporadaCerrada={null} liga={[]} />
      : <main className="mx-auto max-w-md px-5 py-8">
        {(["learn-card", "learn-close", "learn-review"] as string[]).includes(step.id) && <>
          <h1 className="font-titulo text-3xl text-ambar">Noche de entrenamiento</h1>
          <p className="mb-6 mt-2 text-sm text-texto2">{step.id === "learn-review" ? "Revisión · Sin registros que disputar" : "Activa · Tú y el guía · Sin espera real"}</p>
          <details open className="mb-6 rounded-3xl border border-borde bg-tarjeta p-4" data-training="card">
            <summary className="font-titulo text-lg">🎴 Cartas de noche ({step.id === "learn-card" ? 1 : 0})</summary>
            <p className="mb-3 text-xs text-texto2">Se gastan al usarlas y afectan a esta noche.</p>
            <div className="rounded-2xl border border-borde bg-fondo/60 p-3">
              <NightCardSummary image="/cards/ai/items/escudo-resaca.webp" name="Escudo Resaca" effect="Bloquea la próxima carta de objetivo que te lancen esta noche." quantity={step.id === "learn-card" ? 1 : 0} />
              {step.id === "learn-card" ? <button disabled={busy} onClick={() => void run("learn-card")} className="mt-3 w-full rounded-xl bg-cian py-2 font-titulo text-sm text-fondo">Usar carta</button> : <p className="mt-3 text-sm text-cian">Escudo activado · Copia de prueba consumida</p>}
            </div>
          </details>
          {step.id === "learn-close" && <button data-training="close" disabled={busy} className={button} onClick={() => void run("learn-close")}>Cerrar noche</button>}
          {step.id === "learn-review" && <section data-training="review" className="border-y border-borde py-4"><h2 className="font-titulo text-xl">Revisión de la noche</h2><p className="my-4 text-sm text-texto2">Los registros sueltos de la sala no se trasladan a esta noche. La práctica no tiene consumiciones ni votos reales.</p><button disabled={busy} className={button} onClick={() => void run("learn-review")}>Confirmar revisión y ver resultado</button></section>}
        </>}
        {step.id === "learn-reward" && <section data-training="reward" className="text-center">
          <h1 className="font-titulo text-3xl text-ambar">Noche completada</h1>
          <p className="my-4 text-sm text-texto2">0 XP real · 0 PL real · Ninguna medalla concedida</p>
          <Image src="/chests/ai/items/cofre-comun-cerrado-alpha.webp" width={160} height={160} className="mx-auto" alt="Cofre de muestra" />
          <button disabled={busy} className={button + " mt-5"} onClick={() => void run("learn-reward")}>Abrir cofre de muestra</button>
        </section>}
        {step.id === "learn-equip" && <section data-training="equip" className="text-center">
          <h1 className="font-titulo text-3xl">Inventario de entrenamiento</h1>
          <div className="my-6 flex justify-center"><AvatarFrame config={AVATAR_PREDETERMINADO} marco="espuma" className="h-32 w-32" animated={false} /></div>
          <h2 className="mb-4 font-titulo text-xl text-ambar">Espuma Fresca</h2>
          <button disabled={busy} className={button} onClick={() => void run("learn-equip")}>Equipar marco de muestra</button>
        </section>}
      </main>}
    </div>
  </TrainingContext.Provider>;
}

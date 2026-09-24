"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { activarNotificaciones, desactivarNotificaciones, estaSuscrito, pushSoportado } from "@/lib/push";

const campo = "w-full rounded-lg border border-borde bg-tarjeta px-3 py-2 text-sm text-texto outline-none focus:border-cian";
const boton = "rounded-lg border border-borde px-4 py-2 text-sm text-texto transition hover:border-cian disabled:opacity-50";

export default function AjustesClient({ email, nombreInicial, cumpleanosInicial }: {
  email: string;
  nombreInicial: string;
  cumpleanosInicial: string | null;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [cumpleanos, setCumpleanos] = useState(cumpleanosInicial ?? "");
  const [claveActual, setClaveActual] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [claveConfirmada, setClaveConfirmada] = useState("");
  const [soportaPush, setSoportaPush] = useState(false);
  const [pushActivo, setPushActivo] = useState(false);
  const [pushCargando, setPushCargando] = useState(true);
  const [borradoPassword, setBorradoPassword] = useState("");
  const [borradoConfirmacion, setBorradoConfirmacion] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<Record<string, string>>({});

  useEffect(() => {
    let activo = true;
    (async () => {
      const soportado = await pushSoportado();
      const suscrito = soportado && await estaSuscrito();
      if (activo) {
        setSoportaPush(soportado);
        setPushActivo(Boolean(suscrito));
        setPushCargando(false);
      }
    })();
    return () => { activo = false; };
  }, []);

  function informar(clave: string, texto: string) {
    setMensaje((actual) => ({ ...actual, [clave]: texto }));
  }

  async function guardarNombre(e: React.FormEvent) {
    e.preventDefault();
    setOcupado("nombre");
    informar("nombre", "");
    const { error } = await createClient().rpc("cambiar_nombre_usuario", { p_nombre: nombre.trim() });
    setOcupado(null);
    informar("nombre", error ? error.message : "Nombre actualizado.");
    if (!error) router.refresh();
  }

  async function guardarCumpleanos(e: React.FormEvent) {
    e.preventDefault();
    setOcupado("cumpleanos");
    informar("cumpleanos", "");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = user
      ? await supabase.from("perfiles").update({ cumpleanos: cumpleanos || null }).eq("id", user.id)
      : { error: new Error("La sesión ha caducado.") };
    setOcupado(null);
    informar("cumpleanos", error ? error.message : "Cumpleaños actualizado.");
    if (!error) router.refresh();
  }

  async function cambiarClave(e: React.FormEvent) {
    e.preventDefault();
    if (claveNueva !== claveConfirmada) { informar("clave", "Las contraseñas nuevas no coinciden."); return; }
    if (claveNueva.length < 8) { informar("clave", "La contraseña nueva debe tener al menos 8 caracteres."); return; }
    setOcupado("clave");
    informar("clave", "");
    const supabase = createClient();
    const { error: accesoError } = await supabase.auth.signInWithPassword({ email, password: claveActual });
    if (accesoError) {
      informar("clave", "La contraseña actual no es correcta.");
      setOcupado(null);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: claveNueva, current_password: claveActual });
    setOcupado(null);
    informar("clave", error ? error.message : "Contraseña actualizada.");
    if (!error) { setClaveActual(""); setClaveNueva(""); setClaveConfirmada(""); }
  }

  async function cambiarPush(activar: boolean) {
    setPushCargando(true);
    informar("push", "");
    const resultado = activar ? await activarNotificaciones() : await desactivarNotificaciones();
    setPushCargando(false);
    if (resultado.ok) setPushActivo(activar);
    else informar("push", resultado.error);
  }

  async function probarPush() {
    setOcupado("prueba");
    informar("push", "");
    try {
      const respuesta = await fetch("/api/notificar-prueba", { method: "POST" });
      const dato = await respuesta.json();
      informar("push", respuesta.ok && dato.enviados > 0 ? "Notificación enviada." : dato.error ?? "No se pudo entregar la prueba.");
    } catch {
      informar("push", "No se pudo contactar con el servicio de notificaciones.");
    }
    setOcupado(null);
  }

  async function cerrarSesion() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function borrarCuenta(e: React.FormEvent) {
    e.preventDefault();
    if (borradoConfirmacion !== "ELIMINAR" || !borradoPassword) return;
    setOcupado("borrar");
    informar("borrar", "");
    const supabase = createClient();
    const { error: accesoError } = await supabase.auth.signInWithPassword({ email, password: borradoPassword });
    if (accesoError) {
      informar("borrar", "La contraseña no es correcta.");
      setOcupado(null);
      return;
    }
    const { error } = await supabase.rpc("eliminar_mi_cuenta");
    if (error) {
      informar("borrar", error.message);
      setOcupado(null);
      return;
    }
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <div className="space-y-8">
    <section aria-labelledby="ajustes-perfil" className="border-b border-borde pb-7">
      <h2 id="ajustes-perfil" className="mb-4 font-titulo text-lg text-cian">Perfil</h2>
      <div className="space-y-5">
        <form onSubmit={guardarNombre} className="space-y-2">
          <label htmlFor="ajustes-nombre" className="block text-sm text-texto2">Nombre de usuario</label>
          <div className="flex gap-2"><input id="ajustes-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} minLength={3} maxLength={24} required className={campo} /><button disabled={ocupado !== null || nombre.trim() === nombreInicial} className={boton}>Guardar</button></div>
          {mensaje.nombre && <p role="status" className="text-xs text-texto2">{mensaje.nombre}</p>}
        </form>
        <div><p className="mb-1 text-sm text-texto2">Correo electrónico</p><p className="break-all text-sm text-texto">{email}</p></div>
        <form onSubmit={guardarCumpleanos} className="space-y-2">
          <label htmlFor="ajustes-cumpleanos" className="block text-sm text-texto2">Cumpleaños</label>
          <div className="flex gap-2"><input id="ajustes-cumpleanos" type="date" value={cumpleanos} onChange={(e) => setCumpleanos(e.target.value)} className={campo} /><button disabled={ocupado !== null || cumpleanos === (cumpleanosInicial ?? "")} className={boton}>Guardar</button></div>
          {mensaje.cumpleanos && <p role="status" className="text-xs text-texto2">{mensaje.cumpleanos}</p>}
        </form>
      </div>
    </section>

    <section aria-labelledby="ajustes-notificaciones" className="border-b border-borde pb-7">
      <h2 id="ajustes-notificaciones" className="mb-4 font-titulo text-lg text-cian">Notificaciones</h2>
      <label className="flex cursor-pointer items-center justify-between gap-4 text-sm text-texto">
        <span>Notificaciones en este dispositivo</span>
        <input type="checkbox" checked={pushActivo} disabled={!soportaPush || pushCargando} onChange={(e) => cambiarPush(e.target.checked)} className="h-5 w-5 accent-cian" />
      </label>
      {!pushCargando && !soportaPush && <p className="mt-2 text-xs text-texto2">Este navegador no admite notificaciones.</p>}
      {pushActivo && <button type="button" onClick={probarPush} disabled={ocupado !== null} className={`${boton} mt-4`}>Enviar prueba</button>}
      {mensaje.push && <p role="status" className="mt-2 text-xs text-texto2">{mensaje.push}</p>}
    </section>

    <section aria-labelledby="ajustes-seguridad" className="border-b border-borde pb-7">
      <h2 id="ajustes-seguridad" className="mb-4 font-titulo text-lg text-cian">Seguridad</h2>
      <form onSubmit={cambiarClave} className="space-y-3">
        <label className="block text-sm text-texto2">Contraseña actual<input type="password" autoComplete="current-password" value={claveActual} onChange={(e) => setClaveActual(e.target.value)} required className={`${campo} mt-1`} /></label>
        <label className="block text-sm text-texto2">Nueva contraseña<input type="password" autoComplete="new-password" minLength={8} value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} required className={`${campo} mt-1`} /></label>
        <label className="block text-sm text-texto2">Repetir nueva contraseña<input type="password" autoComplete="new-password" value={claveConfirmada} onChange={(e) => setClaveConfirmada(e.target.value)} required className={`${campo} mt-1`} /></label>
        <button disabled={ocupado !== null} className={boton}>Cambiar contraseña</button>
        {mensaje.clave && <p role="status" className="text-xs text-texto2">{mensaje.clave}</p>}
      </form>
      <button type="button" onClick={cerrarSesion} className="mt-6 text-sm text-texto2 underline">Cerrar sesión</button>
    </section>

    <section aria-labelledby="ajustes-borrar" className="pb-8">
      <h2 id="ajustes-borrar" className="font-titulo text-lg text-rosa">Eliminar cuenta</h2>
      <p className="mt-2 text-sm text-texto2">Se borrarán tu perfil, bebidas, medallas, amistades y progreso. Las salas con otros miembros permanecerán y pasarán a otro fundador.</p>
      <details className="mt-4 text-sm text-texto">
        <summary className="cursor-pointer text-rosa">Continuar con la eliminación</summary>
        <form onSubmit={borrarCuenta} className="mt-4 space-y-3">
          <label className="block text-sm text-texto2">Tu contraseña<input type="password" autoComplete="current-password" value={borradoPassword} onChange={(e) => setBorradoPassword(e.target.value)} required className={`${campo} mt-1`} /></label>
          <label className="block text-sm text-texto2">Escribe ELIMINAR para confirmar<input value={borradoConfirmacion} onChange={(e) => setBorradoConfirmacion(e.target.value)} autoComplete="off" required className={`${campo} mt-1`} /></label>
          <button disabled={ocupado !== null || borradoConfirmacion !== "ELIMINAR"} className="rounded-lg border border-rosa px-4 py-2 text-sm text-rosa disabled:opacity-50">Eliminar mi cuenta definitivamente</button>
          {mensaje.borrar && <p role="alert" className="text-xs text-rosa">{mensaje.borrar}</p>}
        </form>
      </details>
    </section>
  </div>;
}

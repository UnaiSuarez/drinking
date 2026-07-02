"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Modo = "magic" | "password-entrar" | "password-registro";

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [registrado, setRegistrado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviarMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setCargando(false);
    if (error) {
      setError("No se pudo enviar el enlace. Prueba de nuevo en un rato.");
    } else {
      setEnviado(true);
    }
  }

  async function entrarConPassword(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setCargando(false);
    if (error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function registrarConPassword(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    setCargando(false);
    if (error) {
      setError(
        error.message.includes("already registered")
          ? "Ese correo ya tiene cuenta. Prueba a entrar."
          : "No se pudo crear la cuenta. Revisa los datos."
      );
      return;
    }
    // Si la confirmación de email está desactivada, ya llega con sesión activa
    if (data.session) {
      router.push("/");
      router.refresh();
    } else {
      setRegistrado(true);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mb-10 text-center">
        <div className="mb-4 text-7xl">🍻</div>
        <h1 className="font-titulo text-5xl text-ambar drop-shadow-[0_0_12px_rgba(255,182,39,0.5)]">
          EL RANKING
        </h1>
        <p className="mt-3 text-texto2">
          ¿Quién bebe más? Que se entere el grupo,
          <br />
          que se ría, y que no se olvide.
        </p>
      </div>

      {enviado ? (
        <div className="w-full max-w-sm rounded-3xl border border-borde bg-tarjeta p-8 text-center glow-cian">
          <div className="mb-3 text-5xl">📬</div>
          <h2 className="font-titulo text-2xl text-cian">¡Revisa tu correo!</h2>
          <p className="mt-2 text-texto2">
            Te hemos enviado un enlace mágico a{" "}
            <span className="text-texto">{email}</span>. Tócalo y estás dentro.
          </p>
        </div>
      ) : registrado ? (
        <div className="w-full max-w-sm rounded-3xl border border-borde bg-tarjeta p-8 text-center glow-cian">
          <div className="mb-3 text-5xl">📬</div>
          <h2 className="font-titulo text-2xl text-cian">¡Ya casi!</h2>
          <p className="mt-2 text-texto2">
            Confirma tu cuenta desde el correo que te hemos enviado a{" "}
            <span className="text-texto">{email}</span>.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <div className="mb-4 flex rounded-2xl border border-borde bg-tarjeta p-1">
            <button
              onClick={() => {
                setModo("magic");
                setError(null);
              }}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                modo === "magic"
                  ? "bg-ambar text-fondo"
                  : "text-texto2"
              }`}
            >
              Enlace mágico
            </button>
            <button
              onClick={() => {
                setModo("password-entrar");
                setError(null);
              }}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
                modo !== "magic" ? "bg-ambar text-fondo" : "text-texto2"
              }`}
            >
              Contraseña
            </button>
          </div>

          {modo === "magic" && (
            <form
              onSubmit={enviarMagicLink}
              className="rounded-3xl border border-borde bg-tarjeta p-8 glow-ambar"
            >
              <label
                htmlFor="email"
                className="mb-2 block font-titulo text-lg text-texto"
              >
                Tu correo
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="mb-4 w-full rounded-2xl border border-borde bg-fondo px-5 py-4 text-lg text-texto placeholder-texto2 outline-none focus:border-ambar"
              />
              {error && <p className="mb-4 text-sm text-rosa">{error}</p>}
              <button
                type="submit"
                disabled={cargando}
                className="w-full rounded-2xl bg-ambar px-6 py-4 font-titulo text-xl text-fondo transition active:scale-95 disabled:opacity-50"
              >
                {cargando ? "Enviando…" : "Entrar con enlace mágico ✨"}
              </button>
              <p className="mt-4 text-center text-xs text-texto2">
                Sin contraseñas. Te llega un enlace al correo y listo.
              </p>
            </form>
          )}

          {modo !== "magic" && (
            <form
              onSubmit={
                modo === "password-entrar"
                  ? entrarConPassword
                  : registrarConPassword
              }
              className="rounded-3xl border border-borde bg-tarjeta p-8 glow-ambar"
            >
              <label
                htmlFor="email2"
                className="mb-2 block font-titulo text-lg text-texto"
              >
                Correo
              </label>
              <input
                id="email2"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="mb-3 w-full rounded-2xl border border-borde bg-fondo px-5 py-4 text-lg text-texto placeholder-texto2 outline-none focus:border-ambar"
              />
              <label
                htmlFor="password"
                className="mb-2 block font-titulo text-lg text-texto"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mb-4 w-full rounded-2xl border border-borde bg-fondo px-5 py-4 text-lg text-texto placeholder-texto2 outline-none focus:border-ambar"
              />
              {error && <p className="mb-4 text-sm text-rosa">{error}</p>}
              <button
                type="submit"
                disabled={cargando}
                className="w-full rounded-2xl bg-ambar px-6 py-4 font-titulo text-xl text-fondo transition active:scale-95 disabled:opacity-50"
              >
                {cargando
                  ? "Un momento…"
                  : modo === "password-entrar"
                  ? "Entrar"
                  : "Crear cuenta 🍻"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setModo(
                    modo === "password-entrar"
                      ? "password-registro"
                      : "password-entrar"
                  )
                }
                className="mt-4 w-full text-center text-xs text-texto2 underline"
              >
                {modo === "password-entrar"
                  ? "¿No tienes cuenta? Regístrate"
                  : "¿Ya tienes cuenta? Entra"}
              </button>
            </form>
          )}
        </div>
      )}
    </main>
  );
}

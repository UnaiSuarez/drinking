import Image from "next/image";
import BackButton from "@/components/BackButton";
import CofresCartasGrid from "@/components/CofresCartasGrid";
import { createClient } from "@/lib/supabase/server";
import { parseInventarioState } from "@/lib/inventario";
import {
  CARTAS_COFRES,
  COFRES_TIPOS,
  MONEDA_COFRES,
  REVERSOS_CARTA,
} from "@/lib/cofresDesign";

export default async function CofresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let cartasPoseidas: Record<string, number> = {};
  if (user) {
    const { data: perfil } = await supabase
      .from("perfiles")
      .select("avatar_config")
      .eq("id", user.id)
      .single();
    if (perfil) {
      cartasPoseidas = parseInventarioState(perfil.avatar_config).cartas;
    }
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <BackButton />

      <header className="mb-6">
        <p className="font-titulo text-3xl text-ambar">Cofres y cartas</p>
        <p className="mt-2 text-sm text-texto2">
          Galeria visual del sistema: cofres, moneda, reversos y cartas base.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 font-titulo text-xl text-texto">Cofres</h2>
        <ul className="grid grid-cols-3 gap-3">
          {COFRES_TIPOS.map((cofre) => (
            <li
              key={cofre.id}
              className="rounded-2xl border border-borde bg-tarjeta p-3 text-center"
            >
              <div className="relative mx-auto mb-2 aspect-square w-full overflow-hidden rounded-2xl bg-fondo/70">
                <span className="cofre-reward-aura" />
                <Image
                  src={cofre.imagen}
                  alt={cofre.nombre}
                  width={768}
                  height={768}
                  className="relative z-10 h-full w-full object-contain p-1"
                  sizes="120px"
                />
              </div>
              <p className="font-titulo text-sm text-texto">{cofre.nombre}</p>
              <p className="text-[11px] text-texto2">
                {cofre.cartas} carta{cofre.cartas > 1 ? "s" : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-2xl border border-borde bg-tarjeta p-4">
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-fondo/70">
            <span className="cofre-reward-aura" />
            <Image
              src={MONEDA_COFRES.montonImagen}
              alt={MONEDA_COFRES.nombre}
              width={768}
              height={768}
              className="relative z-10 h-full w-full object-contain"
              sizes="96px"
            />
          </div>
          <div>
            <p className="font-titulo text-xl text-ambar">
              {MONEDA_COFRES.nombre}
            </p>
            <p className="mt-1 text-sm text-texto2">
              {MONEDA_COFRES.descripcion}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-titulo text-xl text-texto">Reversos</h2>
        <ul className="grid grid-cols-3 gap-3">
          {Object.entries(REVERSOS_CARTA).map(([nombre, imagen]) => (
            <li
              key={nombre}
              className="rounded-2xl border border-borde bg-tarjeta p-3 text-center"
            >
              <Image
                src={imagen}
                alt={`Reverso ${nombre}`}
                width={768}
                height={768}
                className="aspect-[3/4] w-full rounded-xl object-cover"
                sizes="120px"
              />
              <p className="mt-2 font-titulo text-xs capitalize text-texto2">
                {nombre}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-titulo text-xl text-texto">Cartas</h2>
            <p className="text-xs text-texto2">
              Toca una carta para ver que hace, su imagen y cuantas tienes.
            </p>
          </div>
          <span className="rounded-full border border-oro/40 bg-oro/10 px-3 py-1 font-titulo text-xs text-oro">
            {CARTAS_COFRES.length}
          </span>
        </div>

        <CofresCartasGrid cartasPoseidas={cartasPoseidas} />
      </section>
    </main>
  );
}

import Image from "next/image";
import BackButton from "@/components/BackButton";
import {
  CARTAS_COFRES,
  COFRES_TIPOS,
  MONEDA_COFRES,
  REVERSOS_CARTA,
  type CartaRareza,
} from "@/lib/cofresDesign";

const RAREZA_ESTILO: Record<
  CartaRareza,
  { borde: string; texto: string; fondo: string; etiqueta: string; reverso: string }
> = {
  comun: {
    borde: "border-borde",
    texto: "text-texto2",
    fondo: "bg-fondo/60",
    etiqueta: "Comun",
    reverso: REVERSOS_CARTA.comun,
  },
  rara: {
    borde: "border-cian/60",
    texto: "text-cian",
    fondo: "bg-cian/10",
    etiqueta: "Rara",
    reverso: REVERSOS_CARTA.comun,
  },
  epica: {
    borde: "border-rosa/70",
    texto: "text-rosa",
    fondo: "bg-rosa/10",
    etiqueta: "Epica",
    reverso: REVERSOS_CARTA.epica,
  },
  legendaria: {
    borde: "border-oro",
    texto: "text-oro",
    fondo: "bg-oro/10",
    etiqueta: "Legendaria",
    reverso: REVERSOS_CARTA.legendaria,
  },
};

export default function CofresPage() {
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
              Pasa el cursor o toca una carta para simular el giro.
            </p>
          </div>
          <span className="rounded-full border border-oro/40 bg-oro/10 px-3 py-1 font-titulo text-xs text-oro">
            {CARTAS_COFRES.length}
          </span>
        </div>

        <ul className="grid grid-cols-2 gap-3">
          {CARTAS_COFRES.map((carta) => {
            const rareza = RAREZA_ESTILO[carta.rareza];
            const secreta = carta.oculta
              ? "cofre-card-secret border-purple-400/70"
              : rareza.borde;

            return (
              <li key={carta.id} className="cofre-card-scene">
                <article
                  className={`cofre-card-inner min-h-[274px] rounded-2xl border bg-tarjeta ${secreta}`}
                >
                  <div className="cofre-card-face cofre-card-back-face rounded-2xl bg-tarjeta p-3">
                    <Image
                      src={carta.oculta ? REVERSOS_CARTA.legendaria : rareza.reverso}
                      alt={`Reverso de ${carta.nombre}`}
                      width={768}
                      height={768}
                      className="aspect-[3/4] w-full rounded-xl object-cover"
                      sizes="180px"
                    />
                    <p className="mt-3 text-center font-titulo text-sm text-texto2">
                      ?
                    </p>
                  </div>

                  <div className="cofre-card-face cofre-card-front-face rounded-2xl bg-tarjeta p-3">
                    <div className="relative mb-3 overflow-hidden rounded-xl bg-fondo/70">
                      {carta.oculta && <span className="cofre-reward-aura" />}
                      <Image
                        src={carta.imagen}
                        alt={carta.nombre}
                        width={768}
                        height={768}
                        className="relative z-10 aspect-square w-full object-cover"
                        sizes="180px"
                      />
                    </div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-titulo text-sm leading-tight text-texto">
                        {carta.nombre}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${rareza.fondo} ${rareza.texto}`}
                      >
                        {carta.oculta ? "Oculta" : rareza.etiqueta}
                      </span>
                    </div>
                    <p className="text-[11px] leading-snug text-texto2">
                      {carta.descripcion}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";
import LogrosCatalog, {
  type LogroCatalogo,
  type LogroProgreso,
} from "@/components/LogrosCatalog";
import {
  type LogroFamiliaEscalonada,
  LOGRO_FAMILIAS_ESCALONADAS,
  LOGROS_ESCALONADOS_SLUGS,
} from "@/lib/logroProgress";

type BebidaRelacion = {
  nombre?: string | null;
  icono?: string | null;
};

type RegistroHistorico = {
  noche_id: string;
  bebida_tipo_id: number;
  bebidas_tipo: BebidaRelacion | BebidaRelacion[] | null;
};

type NocheRelacion = {
  id?: string | null;
  sala_id?: string | null;
  inicio?: string | null;
};

type NocheJugadorHistorico = {
  noche_id: string;
  noches: NocheRelacion | NocheRelacion[] | null;
};

function relacionUnica<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? valor[0] ?? null : valor;
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function estadisticasBebidas(registros: RegistroHistorico[]) {
  const stats = { cervezas: 0, chupitos: 0, cubatas: 0 };

  for (const registro of registros) {
    const bebida = relacionUnica(registro.bebidas_tipo);
    const texto = normalizar(`${bebida?.nombre ?? ""} ${bebida?.icono ?? ""}`);

    if (
      texto.includes("pinta") ||
      texto.includes("litro") ||
      texto.includes("litrona") ||
      texto.includes("🍻")
    ) {
      stats.cervezas += 2;
    } else if (
      texto.includes("cerveza") ||
      texto.includes("cana") ||
      texto.includes("birra") ||
      texto.includes("🍺")
    ) {
      stats.cervezas += 1;
    }
    if (
      texto.includes("chupit") ||
      texto.includes("shot") ||
      texto.includes("tequila") ||
      texto.includes("jager") ||
      texto.includes("jäger") ||
      texto.includes("🥃") ||
      texto.includes("💀")
    ) {
      stats.chupitos += 1;
    }
    if (
      texto.includes("cubata") ||
      texto.includes("coctel") ||
      texto.includes("cocktail") ||
      texto.includes("combinado") ||
      texto.includes("🍹")
    ) {
      stats.cubatas += 1;
    }
  }

  return stats;
}

function rarezaPorFase(indice: number, total: number) {
  if (total <= 3) return ["comun", "rara", "epica"][indice] ?? "epica";
  return ["comun", "rara", "epica", "legendaria"][indice] ?? "legendaria";
}

function plPorRareza(rareza: string) {
  if (rareza === "legendaria") return 20;
  if (rareza === "epica") return 10;
  if (rareza === "rara") return 5;
  return 2;
}

function iconoPorFamilia(familiaId: string) {
  if (familiaId === "cervecero") return "🍺";
  if (familiaId === "centurion") return "🥃";
  if (familiaId === "coctelero") return "🍹";
  if (familiaId === "en-racha") return "🔥";
  if (familiaId === "veterano") return "🎖️";
  return "🏅";
}

function esNombreDeFaseEscalonada(logro: LogroCatalogo) {
  const nombre = normalizar(logro.nombre);
  return LOGRO_FAMILIAS_ESCALONADAS.some((familia) => {
    const titulos = [familia.titulo, ...(familia.aliases ?? [])].map(normalizar);
    return titulos.some((titulo) => {
      return familia.fases.some((fase) => {
        const etiqueta = normalizar(fase.etiqueta);
        return (
          nombre === `${titulo} ${etiqueta}` ||
          nombre.startsWith(`${titulo} ${etiqueta} `)
        );
      });
    });
  });
}

function buscarLogroDeFase(
  logros: Map<string, LogroCatalogo>,
  todos: LogroCatalogo[],
  familia: LogroFamiliaEscalonada,
  fase: LogroFamiliaEscalonada["fases"][number]
) {
  const exacto = logros.get(fase.slug);
  if (exacto) return exacto;

  const titulos = [familia.titulo, ...(familia.aliases ?? [])].map(normalizar);
  const etiqueta = normalizar(fase.etiqueta);
  return (
    todos.find((logro) => {
      const nombre = normalizar(logro.nombre);
      return titulos.some(
        (titulo) =>
          nombre === `${titulo} ${etiqueta}` ||
          nombre.startsWith(`${titulo} ${etiqueta} `)
      );
    }) ?? null
  );
}

function calcularRachaMaxima(
  participaciones: NocheJugadorHistorico[],
  nochesCerradas: NocheRelacion[]
) {
  const asistidas = new Set(participaciones.map((p) => p.noche_id));
  const porSala = new Map<string, NocheRelacion[]>();

  for (const noche of nochesCerradas) {
    if (!noche.sala_id || !noche.id) continue;
    const lista = porSala.get(noche.sala_id) ?? [];
    lista.push(noche);
    porSala.set(noche.sala_id, lista);
  }

  let mejor = 0;
  for (const noches of porSala.values()) {
    let actual = 0;
    const ordenadas = [...noches].sort(
      (a, b) =>
        new Date(a.inicio ?? 0).getTime() - new Date(b.inicio ?? 0).getTime()
    );

    for (const noche of ordenadas) {
      if (noche.id && asistidas.has(noche.id)) {
        actual += 1;
        mejor = Math.max(mejor, actual);
      } else {
        actual = 0;
      }
    }
  }

  return mejor;
}

function crearProgresosEscalonados(params: {
  logros: LogroCatalogo[];
  conteo: Map<number, number>;
  stats: Record<"cervezas" | "chupitos" | "cubatas" | "racha" | "noches", number>;
}): LogroProgreso[] {
  const porSlug = new Map(params.logros.map((logro) => [logro.slug, logro]));

  return LOGRO_FAMILIAS_ESCALONADAS.map((familia) => {
    const valor = params.stats[familia.stat];
    const fases = familia.fases
      .map((fase, indice) => {
        const rareza = rarezaPorFase(indice, familia.fases.length);
        const logro =
          buscarLogroDeFase(porSlug, params.logros, familia, fase) ??
          ({
            id: -Math.abs(
              Array.from(fase.slug).reduce(
                (hash, letra) => hash * 31 + letra.charCodeAt(0),
                7
              )
            ),
            slug: fase.slug,
            nombre: `${familia.titulo} ${fase.etiqueta}`,
            icono: iconoPorFamilia(familia.id),
            descripcion: `${familia.descripcion} Objetivo: ${fase.umbral} ${familia.unidad}.`,
            rareza,
            pl: plPorRareza(rareza),
            secreto: false,
            n: 0,
          } satisfies LogroCatalogo);
        const conseguida =
          valor >= fase.umbral || (params.conteo.get(logro.id) ?? 0) > 0;
        return {
          ...logro,
          etiqueta: fase.etiqueta,
          umbral: fase.umbral,
          conseguida,
        };
      })

    const faseActual =
      [...fases].reverse().find((fase) => fase.conseguida) ?? null;
    const objetivo =
      fases.find((fase) => !fase.conseguida) ?? fases[fases.length - 1];
    const indiceObjetivo = fases.findIndex((fase) => fase.slug === objetivo.slug);
    const umbralAnterior = indiceObjetivo > 0 ? fases[indiceObjetivo - 1].umbral : 0;
    const completado = fases.every((fase) => fase.conseguida);
    const progresoBase = completado ? objetivo.umbral : umbralAnterior;
    const progresoMaximo = objetivo.umbral;
    const progresoActual = Math.max(
      progresoBase,
      Math.min(valor, progresoMaximo)
    );
    const tramo = Math.max(1, progresoMaximo - progresoBase);
    const progresoPct = completado
      ? 100
      : Math.round(((progresoActual - progresoBase) / tramo) * 100);

    return {
      id: familia.id,
      titulo: familia.titulo,
      descripcion: familia.descripcion,
      unidad: familia.unidad,
      valor,
      fases,
      faseActual,
      objetivo,
      medalla: faseActual ?? objetivo,
      completado,
      progresoBase,
      progresoActual,
      progresoMaximo,
      progresoPct,
      faltan: Math.max(0, progresoMaximo - valor),
    };
  });
}

export default async function LogrosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: catalogo }, { data: mios }, { data: registrosRaw }, { data: participacionesRaw }] =
    await Promise.all([
      supabase
        .from("logros")
        .select("id, slug, nombre, icono, descripcion, rareza, pl, secreto")
        .order("id"),
      supabase
        .from("logros_usuario")
        .select("logro_id")
        .eq("usuario_id", user!.id),
      supabase
        .from("registros")
        .select("noche_id, bebida_tipo_id, bebidas_tipo(nombre, icono)")
        .eq("usuario_id", user!.id)
        .eq("anulado", false),
      supabase
        .from("noche_jugadores")
        .select("noche_id, noches!inner(id, sala_id, estado, inicio)")
        .eq("usuario_id", user!.id)
        .eq("noches.estado", "cerrada"),
    ]);

  const conteo = new Map<number, number>();
  for (const m of mios ?? []) {
    conteo.set(m.logro_id, (conteo.get(m.logro_id) ?? 0) + 1);
  }

  const logros = catalogo ?? [];
  const conseguidos = logros.filter((l) => (conteo.get(l.id) ?? 0) > 0).length;

  const ordenRareza = ["legendaria", "epica", "rara", "comun"];
  const ordenados = [...logros].sort(
    (a, b) =>
      ordenRareza.indexOf(a.rareza) - ordenRareza.indexOf(b.rareza) ||
      a.nombre.localeCompare(b.nombre)
  );
  const logrosCatalogoCompleto: LogroCatalogo[] = ordenados.map((l) => ({
    id: l.id,
    slug: l.slug,
    nombre: l.nombre,
    icono: l.icono,
    descripcion: l.descripcion,
    rareza: l.rareza,
    pl: l.pl,
    secreto: l.secreto,
    n: conteo.get(l.id) ?? 0,
  }));
  const registros = (registrosRaw ?? []) as RegistroHistorico[];
  const participaciones = (participacionesRaw ?? []) as NocheJugadorHistorico[];
  const salaIds = [
    ...new Set(
      participaciones
        .map((p) => relacionUnica(p.noches)?.sala_id)
        .filter((salaId): salaId is string => Boolean(salaId))
    ),
  ];
  const { data: nochesSalaRaw } =
    salaIds.length > 0
      ? await supabase
          .from("noches")
          .select("id, sala_id, inicio")
          .in("sala_id", salaIds)
          .eq("estado", "cerrada")
      : { data: [] };
  const nochesCerradas = (nochesSalaRaw ?? []) as NocheRelacion[];
  const bebidaStats = estadisticasBebidas(registros);
  const stats = {
    ...bebidaStats,
    noches: new Set(participaciones.map((p) => p.noche_id)).size,
    racha: calcularRachaMaxima(participaciones, nochesCerradas),
  };
  const progresos = crearProgresosEscalonados({
    logros: logrosCatalogoCompleto,
    conteo,
    stats,
  });
  const logrosCatalogo = logrosCatalogoCompleto.filter(
    (logro) =>
      !LOGROS_ESCALONADOS_SLUGS.has(logro.slug) &&
      !esNombreDeFaseEscalonada(logro)
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <BackButton />
      <h1 className="mb-1 mt-2 font-titulo text-3xl text-texto">
        📖 Catálogo de logros
      </h1>
      <p className="mb-6 text-sm text-texto2">
        Has conseguido{" "}
        <span className="font-titulo text-ambar">
          {conseguidos}/{logros.length}
        </span>
        . Los secretos aparecen como ❓ hasta que alguien los desbloquea.
      </p>

      <LogrosCatalog logros={logrosCatalogo} progresos={progresos} />
    </main>
  );
}

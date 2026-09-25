import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RegistrosSalaClient, {
  type DesgloseItem,
  type MiembroRanking,
  type RegistroSala,
} from "@/components/RegistrosSalaClient";

export const PAGINA_REGISTROS = 20;

export default async function RegistrosSalaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sala } = await supabase
    .from("salas")
    .select("id, nombre, config")
    .eq("id", id)
    .is("archivada_at", null)
    .single();
  if (!sala) notFound();

  const esPermanente =
    (sala.config as Record<string, unknown> | null)?.tipo === "permanente";
  if (!esPermanente) redirect(`/sala/${id}`);

  const { data: miRolRow } = await supabase
    .from("sala_miembros")
    .select("rol")
    .eq("sala_id", id)
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (!miRolRow) notFound();
  const esAdmin = miRolRow.rol === "admin" || miRolRow.rol === "fundador";

  const { data: miembrosRaw } = await supabase
    .from("sala_miembros")
    .select("usuario_id, perfiles(nombre)")
    .eq("sala_id", id);
  const nombrePorUsuario: Record<string, string> = {};
  for (const m of miembrosRaw ?? []) {
    const p = m.perfiles as unknown as { nombre: string } | null;
    nombrePorUsuario[m.usuario_id] = p?.nombre ?? "???";
  }

  const { data: bebidasTipo } = await supabase
    .from("bebidas_tipo")
    .select("id, nombre, icono")
    .or(`sala_id.is.null,sala_id.eq.${id}`);
  const tipoPorId: Record<number, { nombre: string; icono: string }> = {};
  for (const b of bebidasTipo ?? []) {
    tipoPorId[b.id] = { nombre: b.nombre, icono: b.icono };
  }

  const { data: catalogo } = await supabase
    .from("bebidas_catalogo")
    .select("id, nombre")
    .or(`sala_id.is.null,sala_id.eq.${id}`);
  const nombrePorCatalogo: Record<string, string> = {};
  for (const c of catalogo ?? []) {
    nombrePorCatalogo[c.id] = c.nombre;
  }

  const { data: registrosRaw, error: errorRegistros } = await supabase
    .from("registros")
    .select("id, usuario_id, bebida_tipo_id, bebida_catalogo_id, ts")
    .eq("sala_id", id)
    .order("ts", { ascending: false })
    .range(0, PAGINA_REGISTROS - 1);
  if (errorRegistros) {
    throw new Error(`No se pudieron cargar los registros: ${errorRegistros.message}`);
  }

  const registros: RegistroSala[] = (registrosRaw ?? []).map((r) => {
    const tipo = tipoPorId[r.bebida_tipo_id];
    return {
      id: r.id,
      usuarioId: r.usuario_id,
      nombre: nombrePorUsuario[r.usuario_id] ?? "???",
      bebidaNombre: r.bebida_catalogo_id
        ? nombrePorCatalogo[r.bebida_catalogo_id] ?? tipo?.nombre ?? "???"
        : tipo?.nombre ?? "???",
      icono: tipo?.icono ?? "🥤",
      ts: r.ts,
    };
  });

  const { data: rankingRaw } = await supabase.rpc("ranking_bebidas_sala", {
    p_sala: id,
  });
  const ranking: MiembroRanking[] = ((rankingRaw ?? []) as { usuario_id: string; total: number }[]).map(
    (f) => ({
      usuarioId: f.usuario_id,
      nombre: nombrePorUsuario[f.usuario_id] ?? "???",
      total: Number(f.total),
    })
  );

  const { data: desgloseRaw } = await supabase.rpc("desglose_bebidas_sala", {
    p_sala: id,
  });
  const desglose: DesgloseItem[] = (
    (desgloseRaw ?? []) as {
      usuario_id: string;
      bebida_tipo_id: number;
      bebida_tipo_nombre: string;
      bebida_tipo_icono: string;
      bebida_catalogo_id: string | null;
      bebida_catalogo_nombre: string | null;
      rareza: string | null;
      cantidad: number;
    }[]
  ).map((f) => ({
    usuarioId: f.usuario_id,
    bebidaTipoNombre: f.bebida_tipo_nombre,
    bebidaTipoIcono: f.bebida_tipo_icono,
    bebidaCatalogoNombre: f.bebida_catalogo_id ? f.bebida_catalogo_nombre : null,
    rareza: f.bebida_catalogo_id ? f.rareza : null,
    cantidad: Number(f.cantidad),
  }));

  const miembros = Object.entries(nombrePorUsuario)
    .map(([usuarioId, nombre]) => ({ usuarioId, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <Link href={`/sala/${id}`} className="text-sm text-texto2">
        ← {sala.nombre}
      </Link>
      <h1 className="mb-1 mt-2 font-titulo text-3xl text-texto">
        🥤 Bebidas de la sala
      </h1>
      <p className="mb-6 text-xs text-texto2">
        Lo que ha registrado cada uno fuera de una noche. Puedes borrar las
        tuyas si te equivocaste.
      </p>
      <RegistrosSalaClient
        salaId={id}
        registrosIniciales={registros}
        hayMasInicial={(registrosRaw?.length ?? 0) === PAGINA_REGISTROS}
        ranking={ranking}
        desglose={desglose}
        miembros={miembros}
        userId={user.id}
        esAdmin={esAdmin}
        nombrePorUsuario={nombrePorUsuario}
        tipoPorId={tipoPorId}
        nombrePorCatalogo={nombrePorCatalogo}
      />
    </main>
  );
}

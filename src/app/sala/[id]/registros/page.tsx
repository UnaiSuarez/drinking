import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RegistrosSalaClient, {
  type MiembroRanking,
  type RegistroSala,
} from "@/components/RegistrosSalaClient";

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
  const nombreMap = new Map(
    (miembrosRaw ?? []).map((m) => {
      const p = m.perfiles as unknown as { nombre: string } | null;
      return [m.usuario_id, p?.nombre ?? "???"];
    })
  );

  const { data: bebidasTipo } = await supabase
    .from("bebidas_tipo")
    .select("id, nombre, icono")
    .or(`sala_id.is.null,sala_id.eq.${id}`);
  const tipoMap = new Map(
    (bebidasTipo ?? []).map((b) => [b.id, { nombre: b.nombre, icono: b.icono }])
  );

  const { data: catalogo } = await supabase
    .from("bebidas_catalogo")
    .select("id, nombre")
    .or(`sala_id.is.null,sala_id.eq.${id}`);
  const catalogoMap = new Map((catalogo ?? []).map((c) => [c.id, c.nombre]));

  const registrosRaw: {
    id: string;
    usuario_id: string;
    bebida_tipo_id: number;
    bebida_catalogo_id: string | null;
    ts: string;
  }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase
      .from("registros")
      .select("id, usuario_id, bebida_tipo_id, bebida_catalogo_id, ts")
      .eq("sala_id", id)
      .order("ts", { ascending: false })
      .range(desde, desde + 999);
    if (error) {
      throw new Error(`No se pudieron cargar los registros: ${error.message}`);
    }
    registrosRaw.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }

  const registros: RegistroSala[] = registrosRaw.map((r) => {
    const tipo = tipoMap.get(r.bebida_tipo_id);
    return {
      id: r.id,
      usuarioId: r.usuario_id,
      nombre: nombreMap.get(r.usuario_id) ?? "???",
      bebidaNombre: r.bebida_catalogo_id
        ? catalogoMap.get(r.bebida_catalogo_id) ?? tipo?.nombre ?? "???"
        : tipo?.nombre ?? "???",
      icono: tipo?.icono ?? "🥤",
      ts: r.ts,
    };
  });

  const totales = new Map<string, number>();
  for (const r of registros) {
    totales.set(r.usuarioId, (totales.get(r.usuarioId) ?? 0) + 1);
  }
  const ranking: MiembroRanking[] = [...totales.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([usuarioId, total]) => ({
      usuarioId,
      nombre: nombreMap.get(usuarioId) ?? "???",
      total,
    }));

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
        registrosIniciales={registros}
        ranking={ranking}
        userId={user.id}
        esAdmin={esAdmin}
      />
    </main>
  );
}

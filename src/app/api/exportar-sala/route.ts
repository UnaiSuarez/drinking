import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function celdaCsv(valor: string | number): string {
  const texto = String(valor);
  return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function filaCsv(valores: (string | number)[]): string {
  return valores.map(celdaCsv).join(",") + "\r\n";
}

export async function GET(request: NextRequest) {
  const salaId = request.nextUrl.searchParams.get("sala");
  if (!salaId) {
    return NextResponse.json({ error: "Falta el parámetro sala" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: sala } = await supabase
    .from("salas")
    .select("id, nombre")
    .eq("id", salaId)
    .single();
  if (!sala) return NextResponse.json({ error: "Sala no encontrada" }, { status: 404 });

  const { data: miembro } = await supabase
    .from("sala_miembros")
    .select("rol")
    .eq("sala_id", salaId)
    .eq("usuario_id", user.id)
    .single();
  if (!miembro || (miembro.rol !== "fundador" && miembro.rol !== "admin")) {
    return NextResponse.json({ error: "Solo un admin de la sala puede exportar" }, { status: 403 });
  }

  const { data: noches, error: errorNoches } = await supabase
    .from("noches")
    .select("id, inicio")
    .eq("sala_id", salaId)
    .eq("estado", "cerrada")
    .order("inicio", { ascending: true });
  if (errorNoches) {
    return NextResponse.json({ error: errorNoches.message }, { status: 400 });
  }

  const nocheIds = (noches ?? []).map((n) => n.id);

  const [{ data: jugadoresRaw }, { data: registrosRaw }] = await Promise.all([
    nocheIds.length > 0
      ? supabase
          .from("noche_jugadores")
          .select("noche_id, usuario_id, posicion_final, pl_ganados, perfiles(nombre)")
          .in("noche_id", nocheIds)
      : Promise.resolve({ data: [] as never[] }),
    nocheIds.length > 0
      ? supabase
          .from("registros_sala")
          .select("noche_id, usuario_id")
          .in("noche_id", nocheIds)
          .eq("anulado", false)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const bebidasPorPar = new Map<string, number>();
  for (const r of registrosRaw ?? []) {
    if (!r.noche_id) continue;
    const clave = `${r.noche_id}:${r.usuario_id}`;
    bebidasPorPar.set(clave, (bebidasPorPar.get(clave) ?? 0) + 1);
  }

  const fechaPorNoche = new Map((noches ?? []).map((n) => [n.id, n.inicio]));

  let csv = "﻿"; // BOM: para que Excel detecte UTF-8 y no rompa los acentos
  csv += filaCsv(["fecha", "jugador", "posicion", "pl_ganados", "bebidas"]);
  for (const j of jugadoresRaw ?? []) {
    const nombre = (j.perfiles as unknown as { nombre: string } | null)?.nombre ?? "???";
    const fecha = fechaPorNoche.get(j.noche_id) ?? "";
    const bebidas = bebidasPorPar.get(`${j.noche_id}:${j.usuario_id}`) ?? 0;
    csv += filaCsv([
      fecha ? new Date(fecha).toISOString().slice(0, 10) : "",
      nombre,
      j.posicion_final ?? "",
      j.pl_ganados ?? 0,
      bebidas,
    ]);
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="historial-${sala.nombre.replace(/[^a-z0-9]+/gi, "-")}.csv"`,
    },
  });
}

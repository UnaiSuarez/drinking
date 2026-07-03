import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const RAREZA_ESTILO: Record<string, string> = {
  comun: "border-borde text-texto2",
  rara: "border-cian/60 text-cian",
  epica: "border-rosa/60 text-rosa",
  legendaria: "border-oro text-oro",
};

const RAREZA_NOMBRE: Record<string, string> = {
  comun: "Común",
  rara: "Rara",
  epica: "Épica",
  legendaria: "Legendaria",
};

export default async function LogrosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: catalogo } = await supabase
    .from("logros")
    .select("id, slug, nombre, icono, descripcion, rareza, pl, secreto")
    .order("id");

  const { data: mios } = await supabase
    .from("logros_usuario")
    .select("logro_id")
    .eq("usuario_id", user!.id);

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

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
      <Link href="/" className="text-sm text-texto2">
        ← Volver
      </Link>
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

      <ul className="space-y-3">
        {ordenados.map((l) => {
          const n = conteo.get(l.id) ?? 0;
          const oculto = l.secreto && n === 0;
          const tengo = n > 0;
          return (
            <li
              key={l.slug}
              className={`flex items-center gap-4 rounded-2xl border bg-tarjeta p-4 ${
                tengo
                  ? RAREZA_ESTILO[l.rareza] ?? "border-borde"
                  : "border-borde opacity-60"
              }`}
            >
              <span className="text-4xl">{oculto ? "❓" : l.icono}</span>
              <div className="min-w-0 flex-1">
                <p className="font-titulo text-texto">
                  {oculto ? "???" : l.nombre}
                  {n > 1 && <span className="ml-1 text-ambar">×{n}</span>}
                  {tengo && n === 1 && <span className="ml-1">✓</span>}
                </p>
                <p className="text-xs text-texto2">
                  {oculto
                    ? "Logro secreto — consíguelo para descubrir cómo."
                    : l.descripcion}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-titulo text-[10px] uppercase ${
                    RAREZA_ESTILO[l.rareza]?.split(" ")[1] ?? "text-texto2"
                  }`}
                >
                  {RAREZA_NOMBRE[l.rareza]}
                </p>
                <p className="text-xs text-lima">+{l.pl} PL</p>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

import Link from "next/link";
import { TUTORIAL_CHAPTERS, TUTORIAL_STEPS } from "@/lib/tutorial";

export default function GuiaPage() {
  return <main className="mx-auto max-w-3xl px-5 py-8">
    <Link href="/ajustes" className="text-sm text-cian">Volver a Ajustes</Link>
    <h1 className="mt-5 font-titulo text-3xl">Guía de consulta</h1>
    <p className="mt-3 text-texto2">Abre solo el tema que necesites. Para aprender practicando, entra en el <Link href="/tutorial" className="text-cian underline">tutorial interactivo</Link>.</p>
    {TUTORIAL_CHAPTERS.map((chapter) => <section key={chapter} className="mt-8">
      <h2 className="mb-3 font-titulo text-xl text-ambar">{chapter}</h2>
      {TUTORIAL_STEPS.filter((step) => step.chapter === chapter).map((step) => <details key={step.id} className="border-b border-borde py-3">
        <summary className="min-h-10 cursor-pointer font-bold">{step.title}</summary>
        <p className="my-3 text-sm leading-7 text-texto2">{step.intro}</p>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-7">{step.steps.map((text) => <li key={text}>{text}</li>)}</ol>
        <p className="my-4 border-l-2 border-ambar pl-3 text-sm leading-7 text-texto2">{step.detail}</p>
        {step.note && <p className="text-sm leading-7 text-cian">{step.note}</p>}
      </details>)}
    </section>)}
  </main>;
}

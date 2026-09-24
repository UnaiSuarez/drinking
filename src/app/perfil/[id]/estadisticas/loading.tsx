export default function Loading() {
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6" aria-busy="true">
    <div className="mb-8 h-10 w-24 animate-pulse rounded bg-tarjeta" />
    <div className="mb-8 h-20 animate-pulse rounded bg-tarjeta" />
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded bg-tarjeta" />)}
    </div>
  </main>;
}

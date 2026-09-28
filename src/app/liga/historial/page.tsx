import { redirect } from 'next/navigation';
import { Trophy, Gift } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { calcularDivision, DIVISIONES } from '@/lib/liga';
import BackButton from '@/components/BackButton';

function rewardName(reason: string) {
  if (reason === 'cierre:division') return 'Recompensa de división al cierre';
  if (reason === 'cierre:podio') return 'Podio de temporada';
  return `Ascenso a ${DIVISIONES.find((division) => reason === `ascenso:${division.id}`)?.nombre ?? 'otra división'}`;
}

export default async function LigaHistorialPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const history = await db.from('liga_historial').select('*').eq('usuario_id',user.id).order('cerrado_en',{ascending:false}).limit(50);
  const rewards = await db.from('liga_premios').select('temporada_id,motivo,cofre,chapas,entregado_en,temporadas(nombre)').eq('usuario_id',user.id).order('entregado_en',{ascending:false}).limit(100);
  return <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
    <BackButton />
    <h1 className="my-5 flex items-center gap-2 font-titulo text-2xl"><Trophy />Tu historial de liga</h1>
    {(history.error || rewards.error) && <p role="alert">No se ha podido cargar todo el historial. Inténtalo de nuevo.</p>}
    <h2 className="my-3 font-titulo text-xl">Temporadas</h2>
    {!history.error && !history.data?.length && <p className="text-sm text-texto2">Aquí aparecerán las temporadas que terminen a partir de ahora.</p>}
    <ul className="space-y-3">{history.data?.map((season) => <li key={season.temporada_id} className="rounded-lg border border-borde p-4">
      <h3 className="break-words font-titulo">{season.sala_nombre} · {season.temporada_nombre}</h3>
      <p className="mt-2 text-sm">Puesto {season.posicion} · {season.pl} PL · {season.noches} noches</p>
      <p className="text-sm text-cian">Máxima división por PL: {calcularDivision(season.max_pl,false).nombre}</p>
      <p className="mt-1 text-xs text-texto2">{season.competitivo ? 'Temporada competitiva' : 'Sin recompensa exclusiva competitiva'}</p>
    </li>)}</ul>
    <h2 className="mb-3 mt-8 flex items-center gap-2 font-titulo text-xl"><Gift size={20} />Premios entregados</h2>
    {!rewards.error && !rewards.data?.length && <p className="text-sm text-texto2">Los próximos ascensos tendrán su recompensa aquí y en tu inventario.</p>}
    <ul className="divide-y divide-borde">{rewards.data?.map((reward) => <li key={`${reward.temporada_id}:${reward.motivo}`} className="py-4">
      <p className="font-titulo">{rewardName(reward.motivo)}</p>
      <p className="text-sm text-cian">{reward.cofre ? `1 cofre ${reward.cofre}` : ''}{reward.chapas > 0 ? ` · ${reward.chapas} chapas` : ''}</p>
      <p className="text-xs text-texto2">{new Date(reward.entregado_en).toLocaleDateString('es-ES')}</p>
    </li>)}</ul>
  </main>;
}

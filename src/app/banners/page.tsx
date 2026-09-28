import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BackButton from '@/components/BackButton';
import BannerGallery from '@/components/BannerGallery';
import type { BannerItem } from '@/lib/banners';

export default async function BannersPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const catalog = await db.from('banners_catalogo').select('*').order('precio');
  const owned = await db.from('banners_usuario').select('banner_id').eq('usuario_id',user.id);
  const equipped = await db.from('banner_equipado').select('banner_id').eq('usuario_id',user.id).maybeSingle();
  return <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-24 pt-8">
    <BackButton />
    <div className="mt-5">
      {catalog.error || owned.error || equipped.error ? <p role="alert">No se pudieron cargar los banners. Vuelve a intentarlo.</p> :
        <BannerGallery items={(catalog.data ?? []) as BannerItem[]} owned={(owned.data ?? []).map((row) => row.banner_id)} equipped={equipped.data?.banner_id ?? 'carbon'} />}
    </div>
  </main>;
}

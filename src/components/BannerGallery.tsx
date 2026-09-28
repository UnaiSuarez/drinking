"use client";

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Lock, Palette } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BANNER_NAMES, BANNER_ORDEN_EXCLUSIVO, BANNER_RARITIES, BANNER_REQUIREMENTS, type BannerItem } from '@/lib/banners';
import ProfileBanner from './ProfileBanner';

const RARITY_STYLES: Record<BannerItem['rareza'], { border: string; ring: string; text: string }> = {
  comun: { border: 'border-borde', ring: 'ring-texto2/70', text: 'text-texto2' },
  rara: { border: 'border-cian/70', ring: 'ring-cian', text: 'text-cian' },
  epica: { border: 'border-rosa/70', ring: 'ring-rosa', text: 'text-rosa' },
  legendaria: { border: 'border-oro/80', ring: 'ring-oro', text: 'text-oro' },
  exclusiva: { border: 'border-ambar/80', ring: 'ring-ambar', text: 'text-ambar' },
};

const RAREZA_TIER: Record<BannerItem['rareza'], number> = { comun: 0, rara: 1, epica: 2, legendaria: 3, exclusiva: 4 };

// Mismo tier de rareza primero; dentro de "exclusiva", el orden narrativo
// de BANNER_ORDEN_EXCLUSIVO (precio no sirve: todas valen 0). El resto se
// ordena por precio, como antes.
function compararBanners(a: BannerItem, b: BannerItem): number {
  const tierA = RAREZA_TIER[a.rareza];
  const tierB = RAREZA_TIER[b.rareza];
  if (tierA !== tierB) return tierA - tierB;
  if (a.exclusivo && b.exclusivo) {
    const ia = BANNER_ORDEN_EXCLUSIVO.indexOf(a.id);
    const ib = BANNER_ORDEN_EXCLUSIVO.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  }
  return a.precio - b.precio;
}

// Banners exclusivos: se ven y se explican en la tienda (comprables o no,
// para saber cómo conseguirlos), no en "Mis banners" — así el inventario
// solo muestra lo que ya tienes, sin exclusivos bloqueados de más.
export default function BannerGallery({ items, owned, equipped, shop = false, embedded = false, onSaved }: { items: BannerItem[]; owned: string[]; equipped: string; shop?: boolean; embedded?: boolean; onSaved?: () => Promise<void> }) {
  const router = useRouter();
  const visibleItems = items
    .filter((banner) => shop ? true : !banner.exclusivo && (owned.includes(banner.id) || banner.precio === 0))
    .sort(compararBanners);
  const [selection, setSelection] = useState(visibleItems.some((banner) => banner.id === equipped) ? equipped : visibleItems[0]?.id ?? 'carbon');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [rarity, setRarity] = useState('all');
  const preview = useRef<HTMLDivElement>(null);
  const item = items.find((banner) => banner.id === selection);
  const available = item && (owned.includes(item.id) || item.precio === 0 && !item.exclusivo);
  async function equip() {
    if (!item || busy) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await createClient().rpc('elegir_banner', { p_banner: item.id });
      if (error) { setMessage(error.message); return; }
      if (onSaved) await onSaved();
      setMessage('Banner equipado.'); router.refresh();
    } catch { setMessage('No se pudo guardar. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  }
  return <>
    {embedded ? <h2 className="mb-4 flex items-center gap-2 font-titulo text-xl"><Palette aria-hidden="true" />Banners</h2> : <h1 className="mb-4 flex items-center gap-2 font-titulo text-2xl"><Palette aria-hidden="true" />Mis banners</h1>}
    <Link href={shop ? '/banners' : '/tienda#banners'} className="mb-4 inline-flex min-h-11 items-center text-sm text-cian underline">{shop ? 'Ver mis banners y exclusivos' : 'Comprar banners en la tienda'}</Link>
    <div ref={preview} className="scroll-mt-24"><ProfileBanner id={selection} /></div>
    {item && <div className="my-4">
      <h2 className="font-titulo text-xl">{BANNER_NAMES[item.id] ?? item.nombre}</h2>
      <p className="text-sm text-texto2">{BANNER_RARITIES[item.rareza]}</p>
      {item.exclusivo && !available ? <p className="mt-3 text-sm text-oro">{BANNER_REQUIREMENTS[item.id] ?? 'Se desbloquea jugando.'}</p> :
        <button disabled={busy || equipped === item.id} onClick={equip} className="mt-3 min-h-11 w-full rounded-lg bg-cian px-4 py-2 font-titulo text-fondo disabled:opacity-50">
          {busy ? 'Guardando...' : equipped === item.id ? 'Equipado' : available ? 'Equipar' : `Comprar y equipar · ${item.precio} chapas`}
        </button>}
      <p role="status" className="mt-2 min-h-6 text-sm text-cian">{message}</p>
    </div>}
    <label className="mb-4 flex items-center gap-3 text-sm">Rareza
      <select value={rarity} onChange={(event) => setRarity(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-borde bg-tarjeta px-3">
        <option value="all">Todas</option>
        {Object.entries(BANNER_RARITIES).filter(([value]) => shop || value !== 'exclusiva').map(([value,label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <ul className="grid grid-cols-2 gap-3" aria-label="Catálogo de banners">
      {visibleItems.filter((banner) => rarity === 'all' || banner.rareza === rarity).map((banner) => <li key={banner.id} className="min-w-0">
        <button disabled={busy} onClick={() => { setSelection(banner.id); setMessage(''); preview.current?.scrollIntoView({block:'start'}); }} aria-pressed={selection === banner.id} className={`w-full overflow-hidden rounded-lg border p-2 text-left focus-visible:outline-none focus-visible:ring-2 ${RARITY_STYLES[banner.rareza].border} ${RARITY_STYLES[banner.rareza].ring} ${selection === banner.id ? 'ring-2 ring-offset-2 ring-offset-fondo' : ''}`}>
          <div className="pointer-events-none overflow-hidden rounded"><ProfileBanner id={banner.id} animated={false} compact /></div>
          <span className="mt-2 block break-words font-titulo text-sm">{BANNER_NAMES[banner.id] ?? banner.nombre}</span>
          <span className={`flex min-h-8 items-center gap-1 text-xs ${RARITY_STYLES[banner.rareza].text}`}>
            {equipped === banner.id ? <Check size={14} /> : banner.exclusivo && !owned.includes(banner.id) ? <Lock size={14} /> : null}
            {BANNER_RARITIES[banner.rareza]}{banner.precio === 0 && !banner.exclusivo ? ' · Gratis' : ''}
          </span>
        </button>
      </li>)}
    </ul>
    {!visibleItems.some((banner) => rarity === 'all' || banner.rareza === rarity) && <p className="py-6 text-sm text-texto2">{shop ? 'No hay banners a la venta de esta rareza.' : 'No tienes banners de esta rareza.'}</p>}
  </>;
}

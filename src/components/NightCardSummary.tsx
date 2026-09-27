import Image from "next/image";

export default function NightCardSummary({ image, name, effect, quantity, onClick }: {
  image: string; name: string; effect: string; quantity: number; onClick?: () => void;
}) {
  const content = <><Image src={image} alt={name} width={768} height={768} sizes="64px" className="h-16 w-16 rounded-xl object-cover" />
    <div className="min-w-0 flex-1"><div className="mb-1 flex items-center justify-between gap-2"><p className="font-titulo text-sm text-texto">{name}</p><span className="rounded-full bg-tarjeta px-2 py-0.5 font-titulo text-xs text-ambar">x{quantity}</span></div><p className="text-[11px] leading-snug text-texto2">{effect}</p></div></>;
  return onClick ? <button type="button" onClick={onClick} className="flex w-full gap-3 text-left outline-none">{content}</button> : <div className="flex w-full gap-3 text-left">{content}</div>;
}

export type BannerItem = {
  id: string;
  nombre: string;
  rareza: 'comun' | 'rara' | 'epica' | 'legendaria' | 'exclusiva';
  precio: number;
  exclusivo: boolean;
};

export const BANNER_IMAGES: Record<string, string> = {
  'mesa-billar': '/banners/mesa-billar.webp',
  'costa-serena': '/banners/costa-serena.webp',
  'vinilo': '/banners/vinilo.webp',
  'ruta-montana': '/banners/ruta-montana.webp',
  'jardin-lunar': '/banners/jardin-lunar.webp',
  'ciudad-abismal': '/banners/ciudad-abismal.webp',
  'expreso-celeste': '/banners/expreso-celeste.webp',
  'fenix-imperial': '/banners/fenix-imperial.webp',
  'reloj-eternidad': '/banners/reloj-eternidad.webp',
  'primer-juramento': '/banners/primer-juramento.webp',
  'guardian-esmeralda': '/banners/guardian-esmeralda.webp',
  'corona-mareas': '/banners/corona-mareas.webp',
  'eclipse-real': '/banners/eclipse-real.webp',
  'cenit': '/banners/cenit.webp',
  dragon: '/banners/dragon.webp',
  observatorio: '/banners/observatorio.webp',
  campeon: '/banners/campeon.webp',
  'barra-clasica': '/banners/barra-clasica.webp',
  azotea: '/banners/azotea.webp',
  arcade: '/banners/arcade.webp',
  'biblioteca-arcana': '/banners/biblioteca-arcana.webp',
  'templo-glacial': '/banners/templo-glacial.webp',
  'forja-solar': '/banners/forja-solar.webp',
  'viaje-estelar': '/banners/viaje-estelar.webp',
  'cumbre-after': '/banners/cumbre-after.webp',
  // Temporada de calendario (ver src/lib/temporadaCosmetica.ts): arte pendiente
  'noche-de-brujas': '/banners/noche-de-brujas.webp',
  'luces-de-navidad': '/banners/luces-de-navidad.webp',
  'chiringuito-de-verano': '/banners/chiringuito-de-verano.webp',
};
export const BANNER_NAMES: Record<string, string> = {
  'mesa-billar': 'Mesa de billar',
  'costa-serena': 'Costa serena',
  'vinilo': 'Cara B',
  'ruta-montana': 'Ruta de montaña',
  'jardin-lunar': 'Jardín lunar',
  'ciudad-abismal': 'Ciudad abismal',
  'expreso-celeste': 'Expreso celeste',
  'fenix-imperial': 'Fénix imperial',
  'reloj-eternidad': 'Reloj de la eternidad',
  'primer-juramento': 'Primer juramento',
  'guardian-esmeralda': 'Guardián esmeralda',
  'corona-mareas': 'Corona de las mareas',
  'eclipse-real': 'Eclipse real',
  'cenit': 'Cénit',
  carbon: 'Carbón', jade: 'Jade', carmesi: 'Carmesí', circuito: 'Circuito nocturno',
  'art-deco': 'Salón dorado', damero: 'Última vuelta', aurora: 'Aurora polar',
  ascuas: 'Ascuas del After', tormenta: 'Pulso eléctrico', dragon: 'Guardián de jade',
  observatorio: 'Observatorio astral', campeon: 'Campeón de temporada',
  'barra-clasica': 'Barra clásica', azotea: 'Azotea al atardecer', arcade: 'Una partida más',
  'biblioteca-arcana': 'Biblioteca arcana', 'templo-glacial': 'Templo glacial',
  'forja-solar': 'Forja solar', 'viaje-estelar': 'Viaje estelar', 'cumbre-after': 'Cumbre del After',
  'noche-de-brujas': 'Noche de brujas', 'luces-de-navidad': 'Luces de Navidad',
  'chiringuito-de-verano': 'Chiringuito de verano',
};
export const BANNER_RARITIES = { comun: 'Común', rara: 'Rara', epica: 'Épica', legendaria: 'Legendaria', exclusiva: 'Exclusiva' };
export const BANNER_ANIMATED = new Set(['aurora','ascuas','tormenta','dragon','observatorio','campeon','biblioteca-arcana','templo-glacial','forja-solar','viaje-estelar','cumbre-after']);
export const BANNER_REQUIREMENTS: Record<string,string> = {
  'primer-juramento': 'Se desbloquea al alcanzar Prestigio 1.',
  'guardian-esmeralda': 'Se desbloquea al alcanzar Prestigio 2.',
  'corona-mareas': 'Se desbloquea al alcanzar Prestigio 3.',
  'eclipse-real': 'Se desbloquea al alcanzar Prestigio 4.',
  'cenit': 'Se desbloquea al alcanzar Prestigio 5.',
  campeon: 'Campeón sin empate de una temporada de 7 días, con 3 participantes y 4 noches en días distintos. Debes participar en al menos 2 noches.',
  'cumbre-after': 'Se desbloquea con un nuevo ascenso a Gran Maestro del After (450 PL). No se vende ni se concede por ascensos anteriores.',
  'noche-de-brujas': 'Registra algo entre el 20 de octubre y el 2 de noviembre para llevártela.',
  'luces-de-navidad': 'Registra algo entre el 15 de diciembre y el 6 de enero para llevártela.',
  'chiringuito-de-verano': 'Registra algo entre el 21 de junio y el 21 de septiembre para llevártela.',
};

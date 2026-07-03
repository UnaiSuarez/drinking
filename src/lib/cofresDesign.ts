export type CartaRareza = "comun" | "rara" | "epica" | "legendaria";
export type CartaAlcance = "personal" | "objetivo" | "global" | "defensa" | "economia";

export type CartaCofre = {
  id: string;
  nombre: string;
  rareza: CartaRareza;
  alcance: CartaAlcance;
  oculta?: boolean;
  imagen: string;
  descripcion: string;
  efecto: string;
};

export type CofreTipo = {
  id: "comun" | "epico" | "legendario";
  nombre: string;
  imagen: string;
  cartas: number;
  precio: number;
  garantia: string;
  descripcion: string;
  ratios: Record<"monedas" | CartaRareza | "personajeOculto", number>;
};

export const REVERSOS_CARTA = {
  comun: "/chests/ai/items/card-back-comun.webp",
  epica: "/chests/ai/items/card-back-epica.webp",
  legendaria: "/chests/ai/items/card-back-legendaria.webp",
};

export const MONEDA_COFRES = {
  nombre: "Chapa dorada",
  imagen: "/chests/ai/items/chapa.webp",
  montonImagen: "/chests/ai/items/chapas-monton.webp",
  descripcion: "La moneda para comprar cofres, marcos, avatares y futuras locuras.",
};

export const COFRES_TIPOS: CofreTipo[] = [
  {
    id: "comun",
    nombre: "Cofre Comun",
    imagen: "/chests/ai/items/cofre-comun.webp",
    cartas: 1,
    precio: 90,
    garantia: "Una recompensa sin garantia premium.",
    descripcion: "Barato, rapido y perfecto para rascar cartas de caos.",
    ratios: {
      monedas: 35,
      comun: 45,
      rara: 17,
      epica: 2.5,
      legendaria: 0.4,
      personajeOculto: 0.1,
    },
  },
  {
    id: "epico",
    nombre: "Cofre Epico",
    imagen: "/chests/ai/items/cofre-epico.webp",
    cartas: 2,
    precio: 260,
    garantia: "Mejor probabilidad de cartas raras y epicas.",
    descripcion: "El cofre bueno para preparar una noche con malas intenciones.",
    ratios: {
      monedas: 25,
      comun: 25,
      rara: 30,
      epica: 16,
      legendaria: 3.5,
      personajeOculto: 0.5,
    },
  },
  {
    id: "legendario",
    nombre: "Cofre Legendario",
    imagen: "/chests/ai/items/cofre-legendario.webp",
    cartas: 3,
    precio: 690,
    garantia: "Una recompensa de alto valor asegurada.",
    descripcion: "Premio de campeon: mas brillo, mas caos y mas opcion de personaje oculto.",
    ratios: {
      monedas: 15,
      comun: 10,
      rara: 25,
      epica: 30,
      legendaria: 17,
      personajeOculto: 3,
    },
  },
];

export function cofrePorPodio(posicion: number): CofreTipo["id"] | null {
  if (posicion === 1) return "legendario";
  if (posicion === 2) return "epico";
  if (posicion === 3) return "comun";
  return null;
}

export const CARTAS_COFRES: CartaCofre[] = [
  {
    id: "cubata-obligatorio",
    nombre: "Cubata Obligatorio",
    rareza: "rara",
    alcance: "objetivo",
    imagen: "/cards/ai/items/cubata-obligatorio.webp",
    descripcion: "Elige a alguien y mandale el recado con elegancia.",
    efecto: "El objetivo debe registrar un cubata como proxima bebida o pierde el bonus de su siguiente registro.",
  },
  {
    id: "chupito-castigo",
    nombre: "Chupito Castigo",
    rareza: "comun",
    alcance: "objetivo",
    imagen: "/cards/ai/items/chupito-castigo.webp",
    descripcion: "Una mini sentencia de barra.",
    efecto: "Elige a alguien: su proxima bebida puntua solo si es chupito.",
  },
  {
    id: "ronda-relampago",
    nombre: "Ronda Relampago",
    rareza: "comun",
    alcance: "global",
    imagen: "/cards/ai/items/ronda-relampago.webp",
    descripcion: "La mesa se mueve antes de que nadie pregunte.",
    efecto: "Durante 10 minutos, la primera bebida de cada jugador da +2 PL.",
  },
  {
    id: "escudo-resaca",
    nombre: "Escudo Resaca",
    rareza: "rara",
    alcance: "defensa",
    imagen: "/cards/ai/items/escudo-resaca.webp",
    descripcion: "Agua bendita contra ataques de barra.",
    efecto: "Bloquea la proxima carta de objetivo que te lancen esta noche.",
  },
  {
    id: "cambio-de-vaso",
    nombre: "Cambio de Vaso",
    rareza: "comun",
    alcance: "objetivo",
    imagen: "/cards/ai/items/cambio-de-vaso.webp",
    descripcion: "Uno queria una cosa, ahora quiere otra.",
    efecto: "Cambia el tipo requerido por una carta activa contra ti o contra otro jugador.",
  },
  {
    id: "todos-al-bar",
    nombre: "Todos al Bar",
    rareza: "rara",
    alcance: "global",
    imagen: "/cards/ai/items/todos-al-bar.webp",
    descripcion: "Suena la campana y nadie se esconde.",
    efecto: "Todos tienen 20 minutos para registrar una bebida; quien no lo haga pierde 3 PL.",
  },
  {
    id: "selfie-obligatoria",
    nombre: "Selfie Obligatoria",
    rareza: "comun",
    alcance: "objetivo",
    imagen: "/cards/ai/items/selfie-obligatoria.webp",
    descripcion: "Prueba grafica o sospecha razonable.",
    efecto: "El objetivo debe registrar su proxima bebida con comentario o pierde 2 PL.",
  },
  {
    id: "pirata-del-hielo",
    nombre: "Pirata del Hielo",
    rareza: "comun",
    alcance: "personal",
    imagen: "/cards/ai/items/pirata-del-hielo.webp",
    descripcion: "Frio, barato y con mala idea.",
    efecto: "Tu proximo refresco o agua tambien suma +1 PL.",
  },
  {
    id: "ticket-barra-libre",
    nombre: "Ticket Barra Libre",
    rareza: "rara",
    alcance: "personal",
    imagen: "/cards/ai/items/ticket-barra-libre.webp",
    descripcion: "Un pase dorado para no mirar atras.",
    efecto: "Tu siguiente bebida da +4 PL si no repites el tipo anterior.",
  },
  {
    id: "ultimo-aviso",
    nombre: "Ultimo Aviso",
    rareza: "comun",
    alcance: "global",
    imagen: "/cards/ai/items/ultimo-aviso.webp",
    descripcion: "El reloj aprieta, la mesa mira.",
    efecto: "Durante 15 minutos, registrar bebida da +1 PL extra.",
  },
  {
    id: "salpicon-puntos",
    nombre: "Salpicon de Puntos",
    rareza: "comun",
    alcance: "personal",
    imagen: "/cards/ai/items/salpicon-puntos.webp",
    descripcion: "Puntos pequenos, pero con mucho ruido.",
    efecto: "Gana entre 1 y 5 PL al usarla.",
  },
  {
    id: "brindis-forzado",
    nombre: "Brindis Forzado",
    rareza: "rara",
    alcance: "objetivo",
    imagen: "/cards/ai/items/brindis-forzado.webp",
    descripcion: "Si uno cae, cae acompañado.",
    efecto: "Elige a alguien: si registra bebida en 10 minutos, tu tambien ganas +3 PL.",
  },
  {
    id: "doble-o-nada",
    nombre: "Doble o Nada",
    rareza: "rara",
    alcance: "personal",
    imagen: "/cards/ai/items/doble-o-nada.webp",
    descripcion: "Moderadamente mala idea.",
    efecto: "Tu proxima bebida vale x2, pero si tardas mas de 30 minutos se pierde.",
  },
  {
    id: "triple-amenaza",
    nombre: "Triple Amenaza",
    rareza: "epica",
    alcance: "personal",
    imagen: "/cards/ai/items/triple-amenaza.webp",
    descripcion: "Tres tragos conceptuales, una sola sonrisa.",
    efecto: "Tus proximas 3 bebidas distintas dan +3 PL cada una.",
  },
  {
    id: "noche-x10",
    nombre: "Noche x10",
    rareza: "legendaria",
    alcance: "global",
    imagen: "/cards/ai/items/noche-x10.webp",
    descripcion: "La carta que hace que todos miren la pantalla.",
    efecto: "Durante 5 minutos, todos los PL de bebida se multiplican por 10.",
  },
  {
    id: "happy-hour-salvaje",
    nombre: "Happy Hour Salvaje",
    rareza: "epica",
    alcance: "global",
    imagen: "/cards/ai/items/happy-hour-salvaje.webp",
    descripcion: "Una ventana de caos perfectamente legal.",
    efecto: "Durante 1 hora, cada jugador gana +2 PL por su primera bebida.",
  },
  {
    id: "candado-de-barra",
    nombre: "Candado de Barra",
    rareza: "rara",
    alcance: "defensa",
    imagen: "/cards/ai/items/candado-de-barra.webp",
    descripcion: "Hoy no te roban el plan.",
    efecto: "Bloquea el uso de cartas contra ti durante 15 minutos.",
  },
  {
    id: "mano-larga",
    nombre: "Mano Larga",
    rareza: "rara",
    alcance: "objetivo",
    imagen: "/cards/ai/items/mano-larga.webp",
    descripcion: "Una carta desaparece, nadie sabe nada.",
    efecto: "Roba una carta aleatoria no exclusiva del inventario de otro jugador.",
  },
  {
    id: "copia-de-seguridad",
    nombre: "Copia de Seguridad",
    rareza: "epica",
    alcance: "personal",
    imagen: "/cards/ai/items/copia-de-seguridad.webp",
    descripcion: "Porque una mala idea merece repeticion.",
    efecto: "Duplica una carta comun o rara de tu inventario.",
  },
  {
    id: "espejo-borracho",
    nombre: "Espejo Borracho",
    rareza: "epica",
    alcance: "defensa",
    imagen: "/cards/ai/items/espejo-borracho.webp",
    descripcion: "Lo que venia hacia ti vuelve con efecto.",
    efecto: "Devuelve la proxima carta de objetivo a quien la uso.",
  },
  {
    id: "remontada-imposible",
    nombre: "Remontada Imposible",
    rareza: "epica",
    alcance: "personal",
    imagen: "/cards/ai/items/remontada-imposible.webp",
    descripcion: "Para cuando ir ultimo ya es parte del personaje.",
    efecto: "Si vas ultimo, tus proximas 2 bebidas dan +6 PL.",
  },
  {
    id: "maldicion-del-lider",
    nombre: "Maldicion del Lider",
    rareza: "rara",
    alcance: "objetivo",
    imagen: "/cards/ai/items/maldicion-del-lider.webp",
    descripcion: "La corona pesa cuando la mesa se aburre.",
    efecto: "El lider de la noche pierde 1 PL por cada bebida que registre durante 20 minutos.",
  },
  {
    id: "inmunidad-vip",
    nombre: "Inmunidad VIP",
    rareza: "epica",
    alcance: "defensa",
    imagen: "/cards/ai/items/inmunidad-vip.webp",
    descripcion: "Cordon, sonrisa y nadie pasa.",
    efecto: "Durante 30 minutos no pueden afectarte cartas de objetivo.",
  },
  {
    id: "ruleta-del-bar",
    nombre: "Ruleta del Bar",
    rareza: "rara",
    alcance: "global",
    imagen: "/cards/ai/items/ruleta-del-bar.webp",
    descripcion: "Nadie sabe que va a pasar, que es lo correcto.",
    efecto: "Activa al azar un mini evento comun para toda la noche.",
  },
  {
    id: "trono-del-campeon",
    nombre: "Trono del Campeon",
    rareza: "legendaria",
    alcance: "personal",
    imagen: "/cards/ai/items/trono-del-campeon.webp",
    descripcion: "Sentarse ahi cuesta puntos y dignidad.",
    efecto: "Si acabas primero tras usarla, ganas un cofre epico extra.",
  },
  {
    id: "tormenta-challenger",
    nombre: "Tormenta Challenger",
    rareza: "legendaria",
    alcance: "global",
    imagen: "/cards/ai/items/tormenta-challenger.webp",
    descripcion: "Rayos, ranking y malas decisiones sincronizadas.",
    efecto: "Durante 10 minutos, las bebidas del top 3 valen x2.",
  },
  {
    id: "jackpot-siete",
    nombre: "Jackpot Siete",
    rareza: "rara",
    alcance: "economia",
    imagen: "/cards/ai/items/jackpot-siete.webp",
    descripcion: "Cuando sale, se nota en la tienda.",
    efecto: "Gana una cantidad aleatoria de chapas con opcion de premio grande.",
  },
  {
    id: "luna-llena",
    nombre: "Luna Llena",
    rareza: "epica",
    alcance: "global",
    imagen: "/cards/ai/items/luna-llena.webp",
    descripcion: "La noche se pone rara, como debe ser.",
    efecto: "Durante 20 minutos, los chupitos dan +4 PL extra.",
  },
  {
    id: "confeti-caos",
    nombre: "Confeti Caos",
    rareza: "comun",
    alcance: "global",
    imagen: "/cards/ai/items/confeti-caos.webp",
    descripcion: "No arregla nada, pero queda precioso.",
    efecto: "Lanza una celebracion global y da +1 PL a todos los presentes.",
  },
  {
    id: "sombra-del-after",
    nombre: "Sombra del After",
    rareza: "epica",
    alcance: "personal",
    oculta: true,
    imagen: "/cards/ai/items/sombra-del-after.webp",
    descripcion: "Carta oculta. Su efecto exacto se revela al conseguirla.",
    efecto: "Se activa de madrugada y convierte una desventaja en bonus.",
  },
  {
    id: "dado-maldito",
    nombre: "Dado Maldito",
    rareza: "rara",
    alcance: "global",
    oculta: true,
    imagen: "/cards/ai/items/dado-maldito.webp",
    descripcion: "Carta oculta. Nadie sabe si ayuda o castiga.",
    efecto: "Tira un resultado imprevisible que afecta a toda la sala.",
  },
  {
    id: "brindis-prohibido",
    nombre: "Brindis Prohibido",
    rareza: "epica",
    alcance: "objetivo",
    oculta: true,
    imagen: "/cards/ai/items/brindis-prohibido.webp",
    descripcion: "Carta oculta con brillo morado intenso.",
    efecto: "Obliga a dos jugadores a compartir destino de puntos durante un tramo.",
  },
  {
    id: "coronacion-secreta",
    nombre: "Coronacion Secreta",
    rareza: "legendaria",
    alcance: "personal",
    oculta: true,
    imagen: "/cards/ai/items/coronacion-secreta.webp",
    descripcion: "Carta oculta legendaria. Sale poco y se recuerda mucho.",
    efecto: "Si remontas hasta podio tras usarla, recibes un cofre legendario.",
  },
  {
    id: "lluvia-de-chapas",
    nombre: "Lluvia de Chapas",
    rareza: "rara",
    alcance: "economia",
    imagen: "/cards/ai/items/lluvia-de-chapas.webp",
    descripcion: "La tienda escucha caer metal.",
    efecto: "Gana chapas al instante. Cuanto mejor tu puesto, mas recibes.",
  },
  {
    id: "meteorito-de-caos",
    nombre: "Meteorito de Caos",
    rareza: "epica",
    alcance: "global",
    imagen: "/cards/ai/items/meteorito-de-caos.webp",
    descripcion: "Una carta para romper la calma.",
    efecto: "Cancela todos los bonus activos y reparte +5 PL aleatorios entre 3 jugadores.",
  },
  {
    id: "caliz-final-boss",
    nombre: "Caliz Final Boss",
    rareza: "legendaria",
    alcance: "personal",
    imagen: "/cards/ai/items/caliz-final-boss.webp",
    descripcion: "La copa que aparece cuando la noche pide jefe final.",
    efecto: "Tu ultima bebida antes del cierre vale x5 si acabas en podio.",
  },
];

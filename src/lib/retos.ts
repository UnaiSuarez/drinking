export type RetoInfo = {
  slug: string;
  icono: string;
  nombre: string;
  descripcion: string;
};

export const RETOS_SEMANALES: RetoInfo[] = [
  {
    slug: "prueba_algo_nuevo",
    icono: "🧪",
    nombre: "Prueba algo nuevo",
    descripcion: "Registra 3 tipos de bebida distintos esta semana.",
  },
  {
    slug: "maraton_semanal",
    icono: "🏃",
    nombre: "Maratón semanal",
    descripcion: "Registra 10 bebidas en total esta semana.",
  },
  {
    slug: "sube_al_podio",
    icono: "🏆",
    nombre: "Sube al podio",
    descripcion: "Termina alguna noche cerrada esta semana entre los 3 primeros.",
  },
];

export const RECOMPENSA_RETO = { chapas: 20, xp: 30 };

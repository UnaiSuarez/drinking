import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "El Ranking",
    short_name: "El Ranking",
    description:
      "¿Quién bebe más? Que se entere el grupo, que se ría, y que no se olvide.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0e1a",
    theme_color: "#0d0e1a",
    orientation: "portrait",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

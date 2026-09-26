import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "El Ranking",
    short_name: "El Ranking",
    description:
      "¿Quién bebe más? Que se entere el grupo, que se ría, y que no se olvide.",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0e1a",
    theme_color: "#0d0e1a",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

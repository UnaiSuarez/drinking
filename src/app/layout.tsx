import type { Metadata, Viewport } from "next";
import { Lilita_One, Nunito_Sans } from "next/font/google";
import "./globals.css";

const lilita = Lilita_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-lilita",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "El Ranking",
  description:
    "¿Quién bebe más? Que se entere el grupo, que se ría, y que no se olvide.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "El Ranking",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0e1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${lilita.variable} ${nunito.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}

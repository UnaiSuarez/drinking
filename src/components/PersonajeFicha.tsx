import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import AvatarFrame from "@/components/AvatarFrame";
import { type MarcoPerfil } from "@/lib/marcos";
import { type PersonajeCatalogo } from "@/lib/tienda";

/** Enlace a la ficha del personaje (/personaje/[id]), que es una página propia.
 * El personaje se ve estático dentro del marco. */
export function PersonajeFichaTrigger({
  personaje,
  bloqueado = false,
  marco = "madera",
  portraitOnly = false,
  triggerClassName = "h-24 w-24",
  children,
}: {
  personaje: PersonajeCatalogo;
  bloqueado?: boolean;
  marco?: MarcoPerfil;
  portraitOnly?: boolean;
  triggerClassName?: string;
  children?: ReactNode;
}) {
  const imagen = bloqueado ? (personaje.placeholderImagen ?? personaje.imagen) : personaje.imagen;

  return (
    <Link
      href={`/personaje/${personaje.id}`}
      aria-label={bloqueado ? "Ver ficha del personaje oculto" : `Ver ficha de ${personaje.nombre}`}
      className="inline-flex cursor-pointer rounded-2xl outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-cian"
    >
      {children ??
        (portraitOnly ? (
          <span className={`relative inline-flex overflow-hidden ${triggerClassName}`}>
            <Image src={imagen} alt="" fill sizes="128px" className="object-contain" />
          </span>
        ) : (
          <AvatarFrame
            config={{ ...personaje.config, avatarImagen: imagen }}
            marco={marco}
            className={triggerClassName}
            imageSizes="128px"
          />
        ))}
    </Link>
  );
}

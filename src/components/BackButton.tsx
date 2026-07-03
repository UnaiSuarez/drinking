"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BackButton({
  children = "Volver",
}: {
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [pulsando, setPulsando] = useState(false);

  function handleClick() {
    if (navigator.vibrate) navigator.vibrate(20);
    setPulsando(true);
    router.back();
  }

  return (
    <button
      onClick={handleClick}
      className="mb-2 flex items-center gap-1.5 rounded-full border border-borde bg-tarjeta py-1.5 pl-2 pr-3 text-sm text-texto2 transition active:scale-90 active:border-ambar active:text-ambar"
    >
      <span className={`text-base ${pulsando ? "-translate-x-0.5" : ""} transition-transform`}>
        ←
      </span>
      {children}
    </button>
  );
}

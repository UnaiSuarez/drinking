"use client";

import { useRouter } from "next/navigation";

export default function BackButton({
  children = "← Volver",
  className = "text-sm text-texto2",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button onClick={() => router.back()} className={className}>
      {children}
    </button>
  );
}

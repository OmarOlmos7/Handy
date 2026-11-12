"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Vuelve a pedir la página cada pocos segundos mientras haya evaluaciones en curso. */
export function AutoActualizar({ activo, segundos = 5 }: { activo: boolean; segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!activo) return;
    const t = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(t);
  }, [activo, segundos, router]);
  return null;
}

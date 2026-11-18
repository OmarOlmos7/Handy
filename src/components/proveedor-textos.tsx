"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Diccionario } from "@/lib/i18n/diccionario";
import type { Idioma } from "@/lib/i18n/idiomas";

interface Textos {
  idioma: Idioma;
  t: Diccionario;
  locale: string;
}

const Contexto = createContext<Textos | null>(null);

/** Hace llegar el diccionario del idioma elegido a los componentes de cliente. */
export function ProveedorTextos({ valor, children }: { valor: Textos; children: ReactNode }) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/** Diccionario y formato regional dentro de un componente de cliente. */
export function useTextos(): Textos {
  const v = useContext(Contexto);
  if (!v) throw new Error("useTextos fuera de ProveedorTextos");
  return v;
}

"use client";

import { Boton } from "./ui";

export function BotonImprimir({ texto = "Imprimir" }: { texto?: string }) {
  return <Boton onClick={() => window.print()}>{texto}</Boton>;
}

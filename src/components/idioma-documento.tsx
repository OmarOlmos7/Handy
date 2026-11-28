"use client";

import { useEffect } from "react";

/**
 * Pone el idioma de la vista en <html lang> mientras está montada y, al salir de ella,
 * regresa el de las páginas públicas (el layout raíz no se vuelve a dibujar al navegar).
 */
export function IdiomaDocumento({ idioma, alSalir }: { idioma: string; alSalir: string }) {
  useEffect(() => {
    document.documentElement.lang = idioma;
    return () => {
      document.documentElement.lang = alSalir;
    };
  }, [idioma, alSalir]);
  return null;
}

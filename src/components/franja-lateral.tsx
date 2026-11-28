"use client";

// Herramientas de una página en la franja izquierda del marco. Una vista (o su layout) las pone
// con <Lateral>…</Lateral> y aparecen debajo de las secciones, en la franja fija de la computadora
// o en el cajón del menú del teléfono.
import { createContext, useContext } from "react";
import { createPortal } from "react-dom";

export const DestinoLateral = createContext<HTMLElement | null>(null);

export function Lateral({ children }: { children: React.ReactNode }) {
  const destino = useContext(DestinoLateral);
  return destino ? createPortal(children, destino) : null;
}

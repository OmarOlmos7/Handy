"use client";

import { reiniciarDemo } from "@/app/acciones";
import { Boton } from "./ui";

export function ReiniciarDemo() {
  return (
    <form
      action={reiniciarDemo}
      onSubmit={(e) => {
        if (!confirm("¿Borrar todo lo que subiste y volver a los datos de ejemplo?")) e.preventDefault();
      }}
      className="mt-3"
    >
      <Boton type="submit" variante="secundario">
        Reiniciar demo
      </Boton>
    </form>
  );
}

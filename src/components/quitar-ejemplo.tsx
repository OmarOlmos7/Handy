"use client";

import { quitarDatosEjemplo } from "@/app/acciones";
import { Boton } from "./ui";

export function QuitarEjemplo() {
  return (
    <form
      action={quitarDatosEjemplo}
      onSubmit={(e) => {
        if (!confirm("¿Quitar las actividades de ejemplo? Tus cursos y actividades reales no se tocan.")) e.preventDefault();
      }}
      className="mt-3"
    >
      <Boton type="submit" variante="secundario">
        Quitar datos de ejemplo
      </Boton>
    </form>
  );
}

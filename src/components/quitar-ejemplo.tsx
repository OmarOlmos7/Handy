"use client";

import { quitarDatosEjemplo } from "@/app/acciones";
import { Boton } from "./ui";
import { useTextos } from "./proveedor-textos";

export function QuitarEjemplo() {
  const { t } = useTextos();
  return (
    <form
      action={quitarDatosEjemplo}
      onSubmit={(e) => {
        if (!confirm(t.profesor.creditos.confirmarQuitarEjemplo)) e.preventDefault();
      }}
      className="mt-3"
    >
      <Boton type="submit" variante="secundario">
        {t.profesor.creditos.quitarEjemplo}
      </Boton>
    </form>
  );
}

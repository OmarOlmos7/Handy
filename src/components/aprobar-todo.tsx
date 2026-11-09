"use client";

import { useState } from "react";
import { Boton } from "./ui";

/** Demostración: en producción llama a la API, descuenta créditos y envía los reportes. */
export function AprobarTodo({ pendientes, paginas }: { pendientes: number; paginas: number }) {
  const [hecho, setHecho] = useState(false);
  if (hecho) {
    return (
      <p className="rounded-lg bg-acierto-suave px-4 py-2 text-sm font-medium text-acierto" role="status">
        Publicado: se enviaron {pendientes} reportes y se descontaron {pendientes * paginas} créditos.
      </p>
    );
  }
  return (
    <Boton onClick={() => setHecho(true)} disabled={pendientes === 0}>
      Aprobar y enviar {pendientes} reportes
    </Boton>
  );
}

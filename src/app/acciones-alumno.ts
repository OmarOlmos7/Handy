"use server";

import { revalidatePath } from "next/cache";
import { modificar } from "@/lib/almacen";
import { COLORES } from "@/lib/colores";
import { alumnoActual } from "@/lib/sesion";

/** Color de la tarjeta de un curso en el portal del alumno. Solo cambia su propia vista. */
export async function colorCursoAlumno(grupoId: string, color: string) {
  const alumno = await alumnoActual();
  if (!alumno) throw new Error("No autorizado");
  if (!alumno.cursos.some((c) => c.grupo.id === grupoId)) throw new Error("No autorizado");
  const valido = COLORES.some((c) => c.clave === color) ? color : undefined;
  modificar((db) => {
    const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
    if (!cuenta) return;
    const colores = { ...(cuenta.colores ?? {}) };
    // "ninguno" quita el color propio y vuelve al que puso el profesor.
    if (valido) colores[grupoId] = valido;
    else delete colores[grupoId];
    cuenta.colores = colores;
  });
  revalidatePath("/alumno", "layout");
}

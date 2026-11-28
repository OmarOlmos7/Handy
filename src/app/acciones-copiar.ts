"use server";

import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { modificar, rutaAbsoluta } from "@/lib/almacen";
import { esDelProfesor, nuevoCodigoCurso } from "@/lib/cuentas";
import { copiaDeActividad, copiaDeGrupo, copiaDeProyecto, idUnico, tituloCopia } from "@/lib/copiar";
import { textos } from "@/lib/i18n/servidor";
import { requerirProfesor } from "@/lib/sesion";
import type { BaseDeDatos } from "@/lib/tipos";

type Resultado<T> = T | { error: string };

/**
 * Copia los archivos del profesor de una actividad (hoja escaneada, solución, anexos, imágenes de
 * reactivos, caché de vistas) a la carpeta de la copia. Las entregas de los alumnos no se copian.
 */
function copiarArchivosActividad(origen: string, destino: string) {
  const desde = rutaAbsoluta(`actividades/${origen}`);
  if (!fs.existsSync(desde)) return;
  const entregas = path.join(desde, "entregas");
  fs.cpSync(desde, rutaAbsoluta(`actividades/${destino}`), {
    recursive: true,
    filter: (ruta) => ruta !== entregas && !ruta.startsWith(entregas + path.sep),
  });
}

/** Copia en memoria una actividad del profesor al curso destino (también suyo). Devuelve el id de la copia. */
function copiarEnBase(db: BaseDeDatos, profesorId: string, actividadId: string, grupoDestino: string, sufijo: string) {
  if (!esDelProfesor(db, actividadId, profesorId)) throw new Error("Actividad no encontrada");
  if (!db.grupos.some((g) => g.id === grupoDestino && g.profesorId === profesorId)) throw new Error("Curso no encontrado");
  const original = db.actividades.find((a) => a.id === actividadId)!;
  const ids = new Set(db.actividades.map((a) => a.id));
  const nuevoId = idUnico(original.titulo, ids, "actividad");
  // En el mismo curso el título lleva «(copia)» para distinguirla; en otro curso queda igual.
  const titulo =
    grupoDestino === original.grupoId
      ? tituloCopia(original.titulo, db.actividades.filter((a) => a.grupoId === grupoDestino).map((a) => a.titulo), sufijo)
      : original.titulo;
  db.actividades.push(copiaDeActividad(original, nuevoId, grupoDestino, titulo));
  return { origen: actividadId, destino: nuevoId };
}

/**
 * "Copiar elemento": duplica actividades del profesor en un curso suyo (el mismo u otro). Sirve
 * desde el resumen de la actividad (una) y desde el directorio de la vista del curso (varias).
 */
export async function copiarActividades(actividadIds: string[], grupoDestino: string): Promise<Resultado<{ ids: string[] }>> {
  const profesor = await requerirProfesor();
  const { t } = await textos();
  const unicos = [...new Set(actividadIds)].slice(0, 100);
  if (unicos.length === 0) return { error: t.copiar.elige };
  let pares: { origen: string; destino: string }[];
  try {
    pares = modificar((db) => unicos.map((id) => copiarEnBase(db, profesor.id, id, grupoDestino, t.copiar.sufijo)));
  } catch {
    return { error: t.copiar.noSeCopio };
  }
  for (const p of pares) copiarArchivosActividad(p.origen, p.destino);
  revalidatePath("/profesor", "layout");
  return { ids: pares.map((p) => p.destino) };
}

/**
 * Duplica un curso del profesor: una copia idéntica y vacía (sin alumnos, entregas ni evaluaciones)
 * con sus actividades y el modelo de sus proyectos, lista para un grupo nuevo.
 */
export async function duplicarGrupo(grupoId: string): Promise<Resultado<{ id: string }>> {
  const profesor = await requerirProfesor();
  const { t } = await textos();
  let pares: { origen: string; destino: string }[] = [];
  let nuevoId = "";
  try {
    modificar((db) => {
      const g = db.grupos.find((x) => x.id === grupoId && x.profesorId === profesor.id);
      if (!g) throw new Error("Curso no encontrado");
      nuevoId = idUnico(`${g.materia}-${g.nombre}`, new Set(db.grupos.map((x) => x.id)), "curso");
      const nombre = tituloCopia(g.nombre, db.grupos.filter((x) => x.profesorId === profesor.id && x.materia === g.materia).map((x) => x.nombre), t.copiar.sufijo);
      db.grupos.push(copiaDeGrupo(g, nuevoId, nuevoCodigoCurso(g.materia, db.grupos.map((x) => x.codigo ?? "")), nombre));
      const ids = new Set(db.actividades.map((a) => a.id));
      pares = db.actividades
        .filter((a) => a.grupoId === grupoId)
        .map((a) => {
          const id = idUnico(a.titulo, ids, "actividad");
          db.actividades.push(copiaDeActividad(a, id, nuevoId));
          return { origen: a.id, destino: id };
        });
      const idsProyecto = new Set((db.proyectos ?? []).map((p) => p.id));
      const proyectos = (db.proyectos ?? []).filter((p) => p.grupoId === grupoId);
      if (proyectos.length) db.proyectos = [...(db.proyectos ?? []), ...proyectos.map((p) => copiaDeProyecto(p, idUnico(p.titulo, idsProyecto, "proyecto"), nuevoId))];
    });
  } catch {
    return { error: t.copiar.noSeDuplico };
  }
  for (const p of pares) copiarArchivosActividad(p.origen, p.destino);
  revalidatePath("/profesor", "layout");
  return { id: nuevoId };
}

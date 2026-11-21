"use server";

import { revalidatePath } from "next/cache";
import { leer, modificar } from "@/lib/almacen";
import { ErrorIA, iaDisponible, relacionarTemario, type PosTemario } from "@/lib/ia";
import { claveSubtema, claveTema, claveUnidad, limpiarRuta, relacionesValidas } from "@/lib/mapa-temario";
import { alumnoActual, requerirProfesor } from "@/lib/sesion";
import { asignaturaDelCurso } from "@/lib/asignaturas";

/**
 * El profesor pide a la IA los temas afines de su asignatura. Con instrucciones, la IA mejora las
 * relaciones actuales siguiéndolas (por ejemplo "relaciona la unidad 4 con vectores").
 */
export async function detectarRelaciones(asignaturaId: string, instrucciones = ""): Promise<{ ok: true; n: number } | { error: string }> {
  const profesor = await requerirProfesor();
  const asig = (await leer()).asignaturas?.find((a) => a.id === asignaturaId && a.profesorId === profesor.id);
  if (!asig) return { error: "noEncontrada" };
  if (!iaDisponible()) return { error: "sinIA" };
  try {
    // Clave del mapa → posición (unidad, tema, subtema), para mandar las relaciones actuales.
    const posicion = (clave: string): PosTemario | undefined => {
      const [nu, nt, ns] = clave.split(" › ");
      const u = asig.unidades.findIndex((x) => x.nombre === nu);
      if (u < 0) return undefined;
      if (nt === undefined) return { u };
      const t = asig.unidades[u].temas.findIndex((x) => x.nombre === nt);
      if (t < 0) return undefined;
      if (ns === undefined) return { u, t };
      const s = asig.unidades[u].temas[t].subtemas.indexOf(ns);
      return s < 0 ? undefined : { u, t, s };
    };
    const texto = typeof instrucciones === "string" ? instrucciones.trim().slice(0, 800) : "";
    const actuales = relacionesValidas(asig)
      .map((r) => ({ a: posicion(r.a), b: posicion(r.b), motivo: r.motivo }))
      .filter((r): r is { a: PosTemario; b: PosTemario; motivo: string | undefined } => Boolean(r.a && r.b));
    const pares = await relacionarTemario(asig.unidades, { profesorId: profesor.id }, texto ? { instrucciones: texto, actuales } : undefined);
    const clave = (p: { u: number; t?: number; s?: number }) => {
      const u = asig.unidades[p.u];
      if (u && p.t === undefined) return claveUnidad(u.nombre);
      const t = p.t === undefined ? undefined : u?.temas[p.t];
      if (!u || !t) return undefined;
      return p.s === undefined ? claveTema(u.nombre, t.nombre) : t.subtemas[p.s] !== undefined ? claveSubtema(u.nombre, t.nombre, t.subtemas[p.s]) : undefined;
    };
    const relaciones = pares
      .map((p) => ({ a: clave(p.a), b: clave(p.b), motivo: p.motivo || undefined }))
      .filter((r): r is { a: string; b: string; motivo: string | undefined } => Boolean(r.a && r.b && r.a !== r.b));
    // Solo las válidas (por ejemplo, una unidad no se relaciona con sus propios temas).
    const validas = relacionesValidas({ unidades: asig.unidades, relaciones });
    const relacionesFinales = relaciones.filter((r) => validas.some((v) => v.a === r.a && v.b === r.b)).slice(0, 60);
    modificar((db) => {
      const a = db.asignaturas?.find((x) => x.id === asignaturaId && x.profesorId === profesor.id);
      if (a) a.relaciones = relacionesFinales;
    });
    revalidatePath(`/profesor/asignaturas/${asignaturaId}`);
    return { ok: true, n: relacionesFinales.length };
  } catch (e) {
    return { error: e instanceof ErrorIA ? e.message : "fallaIA" };
  }
}

/** El alumno guarda su ruta de estudio en el mapa del temario de su curso. */
export async function guardarRuta(grupoId: string, nodos: string[]): Promise<{ ok: true } | { error: string }> {
  const alumno = await alumnoActual();
  if (!alumno) return { error: "sinSesion" };
  const curso = alumno.cursos.find((c) => c.grupo.id === grupoId);
  if (!curso) return { error: "noEncontrada" };
  const db = await leer();
  const asig = asignaturaDelCurso(db, curso.grupo);
  if (!asig) return { error: "noEncontrada" };
  const limpia = limpiarRuta(asig, nodos);
  modificar((d) => {
    d.rutas = (d.rutas ?? []).filter((r) => !(r.alumnoId === alumno.id && r.asignaturaId === asig.id));
    if (limpia.length) d.rutas.push({ alumnoId: alumno.id, asignaturaId: asig.id, nodos: limpia, actualizadaEn: new Date().toISOString() });
  });
  return { ok: true };
}

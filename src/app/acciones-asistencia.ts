"use server";

import { revalidatePath } from "next/cache";
import { modificar } from "@/lib/almacen";
import { ErrorAsistencia, leerIdSesion, leerMarcas, registroDe } from "@/lib/asistencia";
import { textos } from "@/lib/i18n/servidor";
import { agregarDescriptor, conocidosDelCurso, leerDescriptor, reconocer, type Coincidencia } from "@/lib/rostros";
import { datosProfesor, requerirProfesor } from "@/lib/sesion";
import type { BaseDeDatos, Grupo, RostroAlumno } from "@/lib/tipos";

type Resultado = { ok: true } | { error: string };

async function errorDe(e: unknown): Promise<{ error: string }> {
  const { t } = await textos();
  if (e instanceof ErrorAsistencia) return { error: t.asistencia.errores[e.clave] };
  console.error("Asistencia", e);
  return { error: t.asistencia.errores.noSeGuardo };
}

function revalidar(grupoId: string) {
  revalidatePath(`/profesor/grupos/${grupoId}`, "layout");
}

/** Corre el cambio sobre un curso del profesor con sesión. */
async function enCurso<T>(grupoId: string, cambio: (db: BaseDeDatos, grupo: Grupo) => T): Promise<T> {
  const profesor = await requerirProfesor();
  return modificar((db) => {
    const g = db.grupos.find((x) => x.id === grupoId && x.profesorId === profesor.id);
    if (!g) throw new ErrorAsistencia("noEncontrado");
    return cambio(db, g);
  });
}

/** Guarda la lista de una sesión (a mano o tras revisar lo que se reconoció en la foto). */
export async function guardarAsistencia(grupoId: string, sesion: string, datos: { marcas: unknown; fin: unknown; metodo: unknown }): Promise<Resultado> {
  try {
    const s = leerIdSesion(sesion);
    const fin = Number(datos.fin);
    if (!s || !Number.isInteger(fin) || fin <= s.inicio || fin > 24 * 60) throw new ErrorAsistencia("sesion");
    await enCurso(grupoId, (db, g) => {
      const marcas = leerMarcas(g, datos.marcas);
      const lista = (db.asistencias ??= []);
      const ya = registroDe(lista, g.id, s.fecha, s.inicio);
      const registro = {
        grupoId: g.id,
        fecha: s.fecha,
        inicio: s.inicio,
        fin,
        marcas,
        metodo: datos.metodo === "foto" ? ("foto" as const) : ("manual" as const),
        actualizadoEn: new Date().toISOString(),
      };
      if (ya) Object.assign(ya, registro);
      else lista.push(registro);
    });
    revalidar(grupoId);
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

/** Borra la lista de una sesión (vuelve a quedar pendiente). */
export async function borrarAsistencia(grupoId: string, sesion: string): Promise<Resultado> {
  try {
    const s = leerIdSesion(sesion);
    if (!s) throw new ErrorAsistencia("sesion");
    await enCurso(grupoId, (db, g) => {
      db.asistencias = (db.asistencias ?? []).filter((r) => !(r.grupoId === g.id && r.fecha === s.fecha && r.inicio === s.inicio));
    });
    revalidar(grupoId);
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

function rostroDe(db: BaseDeDatos, grupoId: string, matricula: string): RostroAlumno | undefined {
  return (db.rostros ?? []).find((r) => r.grupoId === grupoId && r.matricula === matricula);
}

/**
 * El profesor registra que recibió (o que se retiró) el consentimiento expreso y por escrito del
 * alumno o de su tutor para usar su rostro. Al retirarlo se borran sus rostros.
 */
export async function consentimientoRostro(grupoId: string, matriculas: string[], dado: boolean): Promise<Resultado> {
  try {
    await enCurso(grupoId, (db, g) => {
      const del = new Set(g.alumnos.map((a) => a.matricula));
      const ahora = new Date().toISOString();
      for (const m of matriculas) {
        if (!del.has(m)) throw new ErrorAsistencia("noEncontrado");
        const r = rostroDe(db, g.id, m);
        if (dado) {
          if (r) r.consentimiento ??= ahora;
          else (db.rostros ??= []).push({ grupoId: g.id, matricula: m, consentimiento: ahora, descriptores: [], actualizadoEn: ahora });
        } else if (r) db.rostros = db.rostros!.filter((x) => x !== r);
      }
    });
    revalidar(grupoId);
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

/**
 * Guarda los rostros que el profesor asignó a cada alumno en la foto inicial (o en una foto de
 * asistencia, para mejorar el reconocimiento). Solo llegan los números del rostro, nunca la foto.
 */
export async function guardarRostros(grupoId: string, asignados: { matricula: string; descriptor: unknown }[]): Promise<Resultado> {
  try {
    if (!Array.isArray(asignados) || !asignados.length || asignados.length > 200) throw new ErrorAsistencia("rostro");
    await enCurso(grupoId, (db, g) => {
      const del = new Set(g.alumnos.map((a) => a.matricula));
      const ahora = new Date().toISOString();
      for (const a of asignados) {
        const descriptor = leerDescriptor(a?.descriptor);
        if (!descriptor || !del.has(a.matricula)) throw new ErrorAsistencia("rostro");
        const r = rostroDe(db, g.id, a.matricula);
        // Sin consentimiento registrado no se guarda nada del rostro.
        if (!r?.consentimiento) throw new ErrorAsistencia("consentimiento");
        agregarDescriptor(r, descriptor);
        r.actualizadoEn = ahora;
      }
    });
    revalidar(grupoId);
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

/** Borra los rostros de un alumno (o de todo el curso) y conserva su consentimiento. */
export async function borrarRostros(grupoId: string, matricula?: string): Promise<Resultado> {
  try {
    await enCurso(grupoId, (db, g) => {
      for (const r of db.rostros ?? []) {
        if (r.grupoId === g.id && (!matricula || r.matricula === matricula)) {
          r.descriptores = [];
          r.actualizadoEn = new Date().toISOString();
        }
      }
    });
    revalidar(grupoId);
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

/**
 * Compara los rostros de la foto de la clase con los registrados del curso. La comparación se hace
 * en el servidor para que los rostros guardados no salgan de él; la foto nunca llega aquí.
 */
export async function reconocerRostros(grupoId: string, descriptores: unknown[]): Promise<{ ok: true; coincidencias: Coincidencia[] } | { error: string }> {
  try {
    if (!Array.isArray(descriptores) || descriptores.length > 200) throw new ErrorAsistencia("rostro");
    const leidos = descriptores.map((d) => leerDescriptor(d));
    if (leidos.some((d) => !d)) throw new ErrorAsistencia("rostro");
    const { db } = await datosProfesor();
    const g = db.grupos.find((x) => x.id === grupoId);
    if (!g) throw new ErrorAsistencia("noEncontrado");
    const conocidos = conocidosDelCurso(db.rostros ?? [], g.id, new Set(g.alumnos.map((a) => a.matricula)));
    return { ok: true, coincidencias: reconocer(leidos as number[][], conocidos) };
  } catch (e) {
    return errorDe(e);
  }
}

"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { modificar } from "@/lib/almacen";
import {
  ErrorAsesoriaCurso,
  agendaNueva,
  ahoraEnMexico,
  cerrarAsesoria,
  fechaValida,
  fechasSemana,
  leerFechasCurso,
  limpiarSolicitud,
  lunesDe,
  podarAgenda,
  revisarFranja,
  yaEmpezo,
  type CeldaAgenda,
} from "@/lib/asesorias";
import { avisarCancelacion } from "@/lib/asesorias-avisos";
import { textos } from "@/lib/i18n/servidor";
import { alumnoActual, matriculaEnCurso, requerirProfesor } from "@/lib/sesion";
import type { Asesoria } from "@/lib/tipos";

type Resultado = { ok: true } | { error: string };

async function errorDe(e: unknown): Promise<Resultado> {
  const { t } = await textos();
  if (e instanceof ErrorAsesoriaCurso) return { error: t.asesorias.errores[e.clave] };
  console.error("Asesorías", e);
  return { error: t.asesorias.registrar.noSeGuardo };
}

function revalidar() {
  revalidatePath("/profesor", "layout");
  revalidatePath("/alumno", "layout");
}

const celdas = (lista: unknown): CeldaAgenda[] =>
  Array.isArray(lista)
    ? lista
        .filter((c): c is CeldaAgenda => Boolean(c) && typeof c === "object" && typeof (c as CeldaAgenda).inicio === "number" && typeof (c as CeldaAgenda).tipo === "string")
        .map((c) => ({ dia: c.dia, fecha: c.fecha, inicio: c.inicio, tipo: c.tipo, titulo: typeof c.titulo === "string" ? c.titulo : undefined }))
    : [];

/**
 * Guarda la agenda del profesor desde el editor de una semana: el horario de cada semana completo y
 * los cambios de esa semana.
 */
export async function guardarAgenda(semana: string, semanales: CeldaAgenda[], deLaSemana: CeldaAgenda[]): Promise<Resultado> {
  const profesor = await requerirProfesor();
  try {
    const lunes = fechaValida(semana);
    if (!lunes) throw new ErrorAsesoriaCurso("agenda");
    const fechas = fechasSemana(lunesDe(lunes));
    const validos = new Set(["clase", "comida", "proyecto", "reunion", "otro", "asesoria", "libre"]);
    const filtrar = (l: CeldaAgenda[]) => celdas(l).filter((c) => validos.has(c.tipo));
    modificar((db) => {
      const agendas = (db.agendas ??= []);
      let agenda = agendas.find((a) => a.profesorId === profesor.id);
      if (!agenda) agendas.push((agenda = { profesorId: profesor.id, bloques: [], actualizadaEn: "" }));
      agenda.bloques = podarAgenda(agendaNueva(agenda.bloques, filtrar(semanales), filtrar(deLaSemana), fechas), ahoraEnMexico().fecha);
      agenda.actualizadaEn = new Date().toISOString();
    });
    revalidar();
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

/** Fechas de inicio y fin del curso (engrane de la tarjeta). */
export async function fechasCurso(grupoId: string, inicio: string, fin: string): Promise<Resultado> {
  const profesor = await requerirProfesor();
  try {
    const fechas = leerFechasCurso(inicio, fin);
    modificar((db) => {
      const g = db.grupos.find((x) => x.id === grupoId && x.profesorId === profesor.id);
      if (!g) throw new ErrorAsesoriaCurso("noEncontrada");
      delete g.inicio;
      delete g.fin;
      Object.assign(g, fechas);
    });
    revalidar();
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

/** El profesor anota lo revisado y las acciones tomadas (o que el alumno no asistió). */
export async function registrarAsesoria(
  id: string,
  datos: { estado: "realizada" | "no_asistio"; revisado: string; acuerdos: string; minutos?: number },
): Promise<Resultado> {
  const profesor = await requerirProfesor();
  try {
    modificar((db) => {
      const a = (db.asesorias ?? []).find((x) => x.id === id && x.profesorId === profesor.id);
      if (!a) throw new ErrorAsesoriaCurso("noEncontrada");
      cerrarAsesoria(a, { ...datos, estado: datos.estado === "no_asistio" ? "no_asistio" : "realizada" });
    });
    revalidar();
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

/** El profesor cancela una asesoría: libera la franja y avisa al alumno. */
export async function cancelarAsesoriaProfesor(id: string): Promise<Resultado> {
  const profesor = await requerirProfesor();
  try {
    modificar((db) => {
      const a = (db.asesorias ?? []).find((x) => x.id === id && x.profesorId === profesor.id);
      if (!a) throw new ErrorAsesoriaCurso("noEncontrada");
      a.estado = "cancelada";
      a.canceladaPor = "profesor";
      a.cerradaEn = new Date().toISOString();
    });
    after(() => avisarCancelacion(id));
    revalidar();
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

/** El alumno pide una asesoría en una franja libre de su profesor. */
export async function agendarAsesoria(datos: {
  grupoId: string;
  fecha: string;
  inicio: number;
  duracion: number;
  tema: string;
  motivo: string;
  comentarios: string;
}): Promise<Resultado> {
  const alumno = await alumnoActual();
  const matricula = matriculaEnCurso(alumno, datos.grupoId);
  const { idioma } = await textos();
  try {
    if (!alumno || !matricula) throw new ErrorAsesoriaCurso("noEncontrada");
    const solicitud = limpiarSolicitud(datos.tema, datos.motivo, datos.comentarios);
    const inicio = Number(datos.inicio);
    const duracion = Number(datos.duracion);
    modificar((db) => {
      const grupo = db.grupos.find((g) => g.id === datos.grupoId);
      if (!grupo?.profesorId) throw new ErrorAsesoriaCurso("noEncontrada");
      const asesorias = (db.asesorias ??= []);
      const agenda = (db.agendas ?? []).find((a) => a.profesorId === grupo.profesorId);
      revisarFranja({ agenda, asesorias, grupo, matricula }, datos.fecha, inicio, duracion);
      const nueva: Asesoria = {
        id: randomUUID().replace(/-/g, "").slice(0, 16),
        grupoId: grupo.id,
        profesorId: grupo.profesorId,
        matricula,
        alumnoId: alumno.id,
        fecha: datos.fecha,
        inicio,
        duracion,
        ...solicitud,
        estado: "agendada",
        creadaEn: new Date().toISOString(),
        idioma,
      };
      asesorias.push(nueva);
    });
    revalidar();
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

/** El alumno cancela su asesoría antes de que empiece. */
export async function cancelarAsesoriaAlumno(id: string): Promise<Resultado> {
  const alumno = await alumnoActual();
  try {
    modificar((db) => {
      const a = (db.asesorias ?? []).find((x) => x.id === id);
      if (!a || !alumno || matriculaEnCurso(alumno, a.grupoId) !== a.matricula) throw new ErrorAsesoriaCurso("noEncontrada");
      if (a.estado !== "agendada") throw new ErrorAsesoriaCurso("cerrada");
      if (yaEmpezo(a)) throw new ErrorAsesoriaCurso("empezada");
      a.estado = "cancelada";
      a.canceladaPor = "alumno";
      a.cerradaEn = new Date().toISOString();
    });
    revalidar();
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

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
import { ErrorAsistencia, leerFrecuencia, leerHorario } from "@/lib/asistencia";
import { textos } from "@/lib/i18n/servidor";
import { alumnoActual, matriculaEnCurso, requerirProfesor } from "@/lib/sesion";
import { paisDeAsuetos } from "@/lib/asuetos";
import type { Asesoria, ClaseHorario, EtiquetaAgenda } from "@/lib/tipos";

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

const texto = (x: unknown, max = 80) => (typeof x === "string" && x ? x.slice(0, max) : undefined);

const celdas = (lista: unknown): CeldaAgenda[] =>
  Array.isArray(lista)
    ? lista
        .filter((c): c is CeldaAgenda => Boolean(c) && typeof c === "object" && typeof (c as CeldaAgenda).inicio === "number" && typeof (c as CeldaAgenda).tipo === "string")
        .slice(0, 20000)
        .map((c) => ({
          dia: typeof c.dia === "number" ? c.dia : undefined,
          fecha: texto(c.fecha, 10),
          inicio: c.inicio,
          tipo: c.tipo,
          titulo: texto(c.titulo),
          desde: texto(c.desde, 10),
          hasta: texto(c.hasta, 10),
          grupoId: texto(c.grupoId),
          etiqueta: texto(c.etiqueta, 40),
          comun: c.comun === true ? true : undefined,
        }))
    : [];

function etiquetasLimpias(lista: unknown): EtiquetaAgenda[] {
  if (!Array.isArray(lista)) return [];
  const vistas = new Set<string>();
  return lista
    .filter((e): e is EtiquetaAgenda => Boolean(e) && typeof e === "object" && typeof e.id === "string" && typeof e.nombre === "string")
    .map((e) => ({ id: e.id.slice(0, 40), nombre: e.nombre.replace(/\s+/g, " ").trim().slice(0, 30), color: typeof e.color === "string" ? e.color.slice(0, 20) : "cian" }))
    .filter((e) => e.nombre && !vistas.has(e.id) && vistas.add(e.id))
    .slice(0, 12);
}

/**
 * Guarda la agenda del profesor desde el editor de una semana: el horario de cada semana completo y
 * los cambios de esa semana.
 */
export async function guardarAgenda(
  semana: string,
  semanales: CeldaAgenda[],
  deLaSemana: CeldaAgenda[],
  ajustes?: { etiquetas?: EtiquetaAgenda[]; pais?: string; asuetos?: boolean },
): Promise<Resultado> {
  const profesor = await requerirProfesor();
  try {
    const lunes = fechaValida(semana);
    if (!lunes) throw new ErrorAsesoriaCurso("agenda");
    const fechas = fechasSemana(lunesDe(lunes));
    modificar((db) => {
      const agendas = (db.agendas ??= []);
      let agenda = agendas.find((a) => a.profesorId === profesor.id);
      if (!agenda) agendas.push((agenda = { profesorId: profesor.id, bloques: [], actualizadaEn: "" }));
      if (ajustes) {
        agenda.etiquetas = etiquetasLimpias(ajustes.etiquetas);
        if (typeof ajustes.pais === "string") agenda.pais = paisDeAsuetos(ajustes.pais);
        if (typeof ajustes.asuetos === "boolean") agenda.asuetos = ajustes.asuetos;
      }
      // Solo cursos del profesor y etiquetas que existen.
      const suyos = new Set(db.grupos.filter((g) => g.profesorId === profesor.id).map((g) => g.id));
      const etiquetas = new Set((agenda.etiquetas ?? []).map((e) => e.id));
      const filtrar = (l: CeldaAgenda[]) =>
        celdas(l).map((c) => ({ ...c, grupoId: c.grupoId && suyos.has(c.grupoId) ? c.grupoId : undefined })).filter((c) => c.tipo !== "personal" || etiquetas.has(c.etiqueta ?? ""));
      agenda.bloques = podarAgenda(agendaNueva(agenda.bloques, filtrar(semanales), filtrar(deLaSemana), fechas), ahoraEnMexico().fecha).filter(
        (b) => b.tipo !== "personal" || etiquetas.has(b.etiqueta ?? ""),
      );
      agenda.actualizadaEn = new Date().toISOString();
    });
    revalidar();
    return { ok: true };
  } catch (e) {
    return errorDe(e);
  }
}

/**
 * Fechas de inicio y fin del curso y, si viene, su horario de clase (engrane de la tarjeta). Con el
 * horario y las fechas se arman las sesiones de la lista de asistencia.
 */
export async function fechasCurso(
  grupoId: string,
  inicio: string,
  fin: string,
  horario?: { clases: unknown; cadaSemanas: unknown },
): Promise<Resultado> {
  const profesor = await requerirProfesor();
  try {
    const fechas = leerFechasCurso(inicio, fin);
    let clases: ClaseHorario[] | undefined;
    try {
      clases = horario ? leerHorario(horario.clases) : undefined;
    } catch (e) {
      if (e instanceof ErrorAsistencia) {
        const { t } = await textos();
        return { error: t.asistencia.horario.invalido };
      }
      throw e;
    }
    modificar((db) => {
      const g = db.grupos.find((x) => x.id === grupoId && x.profesorId === profesor.id);
      if (!g) throw new ErrorAsesoriaCurso("noEncontrada");
      delete g.inicio;
      delete g.fin;
      Object.assign(g, fechas);
      if (clases && horario) {
        if (clases.length) g.horario = clases;
        else delete g.horario;
        if (leerFrecuencia(horario.cadaSemanas) === 2) g.cadaSemanas = 2;
        else delete g.cadaSemanas;
      }
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

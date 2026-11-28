"use server";

import { revalidatePath } from "next/cache";
import { borrarCarpeta, modificar } from "@/lib/almacen";
import { normalizarCorreo } from "@/lib/cuentas";
import { diccionarioDe } from "@/lib/i18n/diccionario";
import { esIdioma } from "@/lib/i18n/idiomas";
import {
  MAX_CRITERIOS,
  MAX_EQUIPOS,
  MAX_ETAPAS,
  MAX_EVALUADORES,
  TIPOS_ETAPA,
  limpiarCompetencias,
  limpiarCriterio,
  limpiarEntregables,
  limpiarEvaluacion,
  limpiarNiveles,
  nuevoIdCorto,
  puedeEvaluar,
  repartirCien,
  revisarModelo,
  valoresTipoEtapa,
} from "@/lib/proyectos";
import { accesoProyecto } from "@/lib/proyectos-servidor";
import { requerirProfesor } from "@/lib/sesion";
import type { CriterioProyecto, EquipoProyecto, EtapaProyecto, EvaluacionProyecto, Proyecto, TipoEtapaProyecto } from "@/lib/tipos";

type ErrorProyecto =
  | "titulo"
  | "sinEtapas"
  | "nombreEtapa"
  | "pesos"
  | "sinCriterios"
  | "porcentajes"
  | "equipoRepetido"
  | "correo"
  | "yaEsta"
  | "maxEvaluadores"
  | "general"
  | "noAutorizado";

class FalloProyecto extends Error {
  constructor(readonly codigo: ErrorProyecto) {
    super(codigo);
  }
}

type Respuesta<T = object> = ({ ok: true } & T) | { error: ErrorProyecto };

function revalidar(proyectoId?: string) {
  revalidatePath("/profesor", "layout");
  revalidatePath("/alumno", "layout");
  if (proyectoId) revalidatePath(`/profesor/proyectos/${proyectoId}`, "layout");
}

async function conProyecto<T extends object>(proyectoId: string, soloDueno: boolean, cambio: (p: Proyecto, db: Parameters<Parameters<typeof modificar>[0]>[0], profesorId: string) => T): Promise<Respuesta<T>> {
  const profesor = await requerirProfesor();
  try {
    const r = modificar((db) => {
      const acceso = accesoProyecto(db, proyectoId, profesor.id);
      if (!acceso || (soloDueno && !acceso.esDueno)) throw new FalloProyecto("noAutorizado");
      return cambio(acceso.proyecto, db, profesor.id);
    });
    revalidar(proyectoId);
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof FalloProyecto) return { error: e.codigo };
    console.error(e);
    return { error: "general" };
  }
}

function etapaNueva(tipo: TipoEtapaProyecto, nombre: string, peso: number): EtapaProyecto {
  return { id: nuevoIdCorto("e"), nombre, tipo, instrucciones: "", peso, ...valoresTipoEtapa(tipo), criterios: [] };
}

const fechaValida = (f: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(f ?? "")) ? String(f) : undefined);

/** Alta del proyecto en un curso del profesor, con una etapa por cada tipo elegido. */
export async function crearProyecto(datos: {
  grupoId: string;
  titulo: string;
  descripcion: string;
  objetivo?: string;
  competencias?: string[] | string;
  tipos: string[];
  idioma?: string;
}): Promise<Respuesta<{ id: string }>> {
  const profesor = await requerirProfesor();
  const titulo = String(datos.titulo ?? "").trim().slice(0, 140);
  if (!titulo) return { error: "titulo" };
  const tipos = (Array.isArray(datos.tipos) ? datos.tipos : []).filter((t): t is TipoEtapaProyecto => (TIPOS_ETAPA as string[]).includes(t)).slice(0, MAX_ETAPAS);
  if (!tipos.length) return { error: "sinEtapas" };
  const idioma = esIdioma(datos.idioma) ? datos.idioma : undefined;
  const nombres = diccionarioDe(idioma ?? "es").proyecto.tipos;
  const pesos = repartirCien(tipos.map(() => 1));
  try {
    const id = modificar((db) => {
      const grupo = db.grupos.find((g) => g.id === datos.grupoId && g.profesorId === profesor.id);
      if (!grupo) throw new FalloProyecto("noAutorizado");
      const p: Proyecto = {
        id: nuevoIdCorto("proy"),
        grupoId: grupo.id,
        profesorId: profesor.id,
        titulo,
        descripcion: String(datos.descripcion ?? "").trim().slice(0, 3000),
        objetivo: String(datos.objetivo ?? "").trim().slice(0, 1500) || undefined,
        competencias: limpiarCompetencias(datos.competencias),
        idioma,
        creadoEn: new Date().toISOString(),
        etapas: tipos.map((t, i) => etapaNueva(t, nombres[t], pesos[i])),
        evaluadores: [],
        equipos: [],
      };
      (db.proyectos ??= []).push(p);
      return p.id;
    });
    revalidar();
    return { ok: true, id };
  } catch (e) {
    if (e instanceof FalloProyecto) return { error: e.codigo };
    console.error(e);
    return { error: "general" };
  }
}

export interface DatosModelo {
  titulo: string;
  descripcion: string;
  objetivo?: string;
  competencias?: string[];
  etapas: EtapaProyecto[];
  equipos: EquipoProyecto[];
}

/**
 * Paso A de la ruta del proyecto: guarda la información general (contexto, título, objetivo,
 * competencias), las etapas con sus fechas, pesos y entregables, y los equipos. La rúbrica de cada
 * etapa (paso B) se conserva tal como está. Solo el profesor del curso.
 */
export async function guardarModelo(proyectoId: string, datos: DatosModelo): Promise<Respuesta> {
  return conProyecto(proyectoId, true, (p, db) => {
    const grupo = db.grupos.find((g) => g.id === p.grupoId)!;
    const enLista = new Set(grupo.alumnos.map((a) => a.matricula));
    const etapas: EtapaProyecto[] = (Array.isArray(datos.etapas) ? datos.etapas : []).slice(0, MAX_ETAPAS).map((e) => {
      const previa = p.etapas.find((x) => x.id === e.id);
      const tipo = (TIPOS_ETAPA as string[]).includes(e.tipo) ? e.tipo : "reporte";
      return {
        id: previa ? previa.id : nuevoIdCorto("e"),
        nombre: String(e.nombre ?? "").trim().slice(0, 120),
        tipo,
        instrucciones: String(e.instrucciones ?? "").trim().slice(0, 4000),
        fechaInicio: fechaValida(e.fechaInicio),
        fecha: fechaValida(e.fecha),
        entregables: limpiarEntregables(e.entregables),
        peso: Number.isFinite(Number(e.peso)) ? Math.max(0, Math.min(100, Math.round(Number(e.peso) * 10) / 10)) : 0,
        porEquipo: Boolean(e.porEquipo),
        conEvidencia: Boolean(e.conEvidencia),
        // La rúbrica se edita en su propio paso.
        niveles: previa?.niveles,
        criterios: previa?.criterios ?? [],
        // El cierre solo cambia con su botón.
        cerradaEn: previa?.cerradaEn,
      };
    });
    const equipos: EquipoProyecto[] = (Array.isArray(datos.equipos) ? datos.equipos : []).slice(0, MAX_EQUIPOS).map((q, i) => ({
      id: String(q.id || nuevoIdCorto("q")).slice(0, 40),
      nombre: String(q.nombre ?? "").trim().slice(0, 80) || `#${i + 1}`,
      matriculas: [...new Set((Array.isArray(q.matriculas) ? q.matriculas : []).map(String).filter((m) => enLista.has(m)))],
    }));
    const titulo = String(datos.titulo ?? "").trim().slice(0, 140);
    const problema = revisarModelo({ titulo, etapas, equipos });
    // Pesos incompletos se avisan en pantalla pero no impiden guardar el borrador.
    if (problema === "titulo" || problema === "nombreEtapa" || problema === "equipoRepetido" || problema === "sinEtapas") throw new FalloProyecto(problema);
    const quitadas = p.etapas.filter((e) => !etapas.some((x) => x.id === e.id)).map((e) => e.id);
    p.titulo = titulo;
    p.descripcion = String(datos.descripcion ?? "").trim().slice(0, 3000);
    p.objetivo = String(datos.objetivo ?? "").trim().slice(0, 1500) || undefined;
    p.competencias = limpiarCompetencias(datos.competencias);
    p.etapas = etapas;
    p.equipos = equipos;
    if (quitadas.length) {
      db.evaluacionesProyecto = (db.evaluacionesProyecto ?? []).filter((e) => !(e.proyectoId === p.id && quitadas.includes(e.etapaId)));
      db.entregasProyecto = (db.entregasProyecto ?? []).filter((e) => !(e.proyectoId === p.id && quitadas.includes(e.etapaId)));
      for (const id of quitadas) borrarCarpeta(`proyectos/${p.id}/${id}`);
    }
    return {};
  });
}

/**
 * Paso B de la ruta del proyecto: guarda la rúbrica de cada etapa (niveles de desempeño con su
 * rango de puntos y elementos con su porcentaje y la descripción de cada nivel). Solo el profesor
 * del curso. Las evaluaciones hechas conservan sus puntajes y se recalculan con los porcentajes nuevos.
 */
export async function guardarRubricas(
  proyectoId: string,
  datos: { etapas: { id: string; niveles?: { nombre: string; min: number; max: number }[]; criterios: CriterioProyecto[] }[] },
): Promise<Respuesta> {
  return conProyecto(proyectoId, true, (p) => {
    for (const d of Array.isArray(datos.etapas) ? datos.etapas : []) {
      const etapa = p.etapas.find((e) => e.id === d.id);
      if (!etapa) continue;
      const niveles = limpiarNiveles(d.niveles);
      const n = niveles?.length ?? 4;
      etapa.niveles = niveles;
      etapa.criterios = (Array.isArray(d.criterios) ? d.criterios : []).slice(0, MAX_CRITERIOS).map((c, i) => limpiarCriterio(c, i, n));
      // Ids de elementos únicos dentro de la etapa.
      const vistos = new Set<string>();
      etapa.criterios.forEach((c, i) => {
        if (vistos.has(c.id)) c.id = `c${i + 1}-${nuevoIdCorto("x").slice(2, 6)}`;
        vistos.add(c.id);
      });
    }
    return {};
  });
}

/** Agrega como evaluador a un profesor registrado, por su correo. */
export async function invitarEvaluador(proyectoId: string, correo: string): Promise<Respuesta<{ evaluador: { id: string; nombre: string; correo: string } }>> {
  const buscado = normalizarCorreo(String(correo ?? ""));
  return conProyecto(proyectoId, true, (p, db) => {
    const otro = db.profesores.find((x) => normalizarCorreo(x.correo) === buscado);
    if (!otro) throw new FalloProyecto("correo");
    if (puedeEvaluar(p, otro.id)) throw new FalloProyecto("yaEsta");
    if (p.evaluadores.length >= MAX_EVALUADORES) throw new FalloProyecto("maxEvaluadores");
    p.evaluadores.push(otro.id);
    return { evaluador: { id: otro.id, nombre: otro.nombre, correo: otro.correo } };
  });
}

/** Quita a un evaluador invitado; sus evaluaciones dejan de contar en el promedio. */
export async function quitarEvaluador(proyectoId: string, profesorId: string): Promise<Respuesta> {
  return conProyecto(proyectoId, true, (p, db) => {
    p.evaluadores = p.evaluadores.filter((x) => x !== profesorId);
    db.evaluacionesProyecto = (db.evaluacionesProyecto ?? []).filter((e) => !(e.proyectoId === p.id && e.evaluadorId === profesorId));
    return {};
  });
}

/** Guarda la evaluación del profesor con sesión (borrador o terminada) mientras la etapa esté abierta. */
export async function guardarEvaluacion(
  proyectoId: string,
  etapaId: string,
  sujeto: string,
  datos: { criterios: { criterioId: string; puntaje?: number | null; comentario: string }[]; comentario: string; mejoras: string; terminada: boolean },
): Promise<Respuesta<{ terminada: boolean }>> {
  return conProyecto(proyectoId, false, (p, db, profesorId) => {
    const etapa = p.etapas.find((e) => e.id === etapaId);
    if (!etapa || etapa.cerradaEn) throw new FalloProyecto("noAutorizado");
    const grupo = db.grupos.find((g) => g.id === p.grupoId)!;
    const valido = sujeto.startsWith("equipo:")
      ? etapa.porEquipo && p.equipos.some((q) => `equipo:${q.id}` === sujeto)
      : grupo.alumnos.some((a) => a.matricula === sujeto);
    if (!valido) throw new FalloProyecto("noAutorizado");
    const limpia = limpiarEvaluacion(etapa, datos);
    const lista = (db.evaluacionesProyecto ??= []);
    const previa = lista.find((e) => e.proyectoId === p.id && e.etapaId === etapaId && e.sujeto === sujeto && e.evaluadorId === profesorId);
    const nueva: EvaluacionProyecto = { proyectoId: p.id, etapaId, sujeto, evaluadorId: profesorId, ...limpia, actualizadaEn: new Date().toISOString() };
    if (previa) Object.assign(previa, nueva);
    else lista.push(nueva);
    return { terminada: limpia.terminada };
  });
}

/** Cierra la etapa (los alumnos ven su calificación y retroalimentación) o la reabre. */
export async function cerrarEtapa(proyectoId: string, etapaId: string, cerrar: boolean): Promise<Respuesta> {
  return conProyecto(proyectoId, true, (p) => {
    const etapa = p.etapas.find((e) => e.id === etapaId);
    if (!etapa) throw new FalloProyecto("noAutorizado");
    etapa.cerradaEn = cerrar ? new Date().toISOString() : undefined;
    return {};
  });
}

/** Borra el proyecto con sus evidencias y evaluaciones. No se puede deshacer. */
export async function borrarProyecto(proyectoId: string): Promise<Respuesta> {
  const r = await conProyecto(proyectoId, true, (p, db) => {
    db.proyectos = (db.proyectos ?? []).filter((x) => x.id !== p.id);
    db.entregasProyecto = (db.entregasProyecto ?? []).filter((e) => e.proyectoId !== p.id);
    db.evaluacionesProyecto = (db.evaluacionesProyecto ?? []).filter((e) => e.proyectoId !== p.id);
    return {};
  });
  if ("ok" in r) borrarCarpeta(`proyectos/${proyectoId}`);
  return r;
}


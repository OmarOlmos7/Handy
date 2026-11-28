"use server";

import { revalidatePath } from "next/cache";
import { borrarCarpeta, leer, modificar } from "@/lib/almacen";
import { ErrorAlumnoGrupo, altaAlumno, altaVarios, bajaAlumno, cambiarAlumno, type ErrorAlumno } from "@/lib/alumnos-grupo";
import { correoConfigurado, enviarCorreo } from "@/lib/correo";
import { destinatariosCodigo, nombreSaludo } from "@/lib/enviar-codigo";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { urlBase } from "@/lib/qr";
import { requerirProfesor } from "@/lib/sesion";
import type { BaseDeDatos, Grupo } from "@/lib/tipos";

type Respuesta<T = object> = ({ ok: true } & T) | { error: ErrorAlumno | "general" };

/** Corre el cambio en un curso del profesor con sesión y traduce los errores a códigos. */
async function enCursoPropio<T extends object>(grupoId: string, cambio: (db: BaseDeDatos, grupo: Grupo) => T): Promise<Respuesta<T>> {
  const profesor = await requerirProfesor();
  try {
    const r = modificar((db) => {
      const grupo = db.grupos.find((g) => g.id === grupoId && g.profesorId === profesor.id);
      if (!grupo) throw new ErrorAlumnoGrupo("noEncontrado");
      return cambio(db, grupo);
    });
    revalidatePath("/profesor", "layout");
    return { ok: true, ...r };
  } catch (e) {
    if (e instanceof ErrorAlumnoGrupo) return { error: e.codigo };
    console.error(e);
    return { error: "general" };
  }
}

/** Alta de un alumno en la lista del curso. */
export async function darDeAltaAlumno(grupoId: string, datos: { matricula: string; nombre: string; correo: string }) {
  return enCursoPropio(grupoId, (_db, grupo) => ({ matricula: altaAlumno(grupo, datos).matricula }));
}

/** Alta de varios alumnos pegados de Excel o de una lista. */
export async function darDeAltaLista(grupoId: string, lista: string) {
  return enCursoPropio(grupoId, (_db, grupo) => altaVarios(grupo, String(lista).slice(0, 200_000)));
}

/** Cambia nombre, matrícula o correo; su trabajo en el curso sigue con él. */
export async function cambiarDatosAlumno(grupoId: string, matricula: string, datos: { matricula: string; nombre: string; correo: string }) {
  return enCursoPropio(grupoId, (db, grupo) => ({ matricula: cambiarAlumno(db, grupo, matricula, datos).matricula }));
}

/** Baja del alumno: sale de la lista y se borra su trabajo en este curso. No se puede deshacer. */
export async function darDeBajaAlumno(grupoId: string, matricula: string) {
  let archivos: string[] = [];
  const r = await enCursoPropio(grupoId, (db, grupo) => {
    archivos = bajaAlumno(db, grupo, matricula).archivos;
    return {};
  });
  if ("ok" in r) for (const a of archivos) borrarCarpeta(a);
  return r;
}

export type ResultadoEnvioCodigo =
  | { ok: true; enviados: number; fallidos: number; sinCorreo: number; sinConfigurar?: boolean }
  | { error: "elige" | "sinCodigo" | "general" };

/**
 * Manda por correo, a cada alumno elegido y por separado, el código del curso con el que paga su
 * membresía (licencia). Si el servidor no tiene correo configurado no sale nada y se avisa.
 */
export async function enviarCodigoCurso(grupoId: string, matriculas: string[]): Promise<ResultadoEnvioCodigo> {
  const profesor = await requerirProfesor();
  try {
    const db = await leer();
    const grupo = db.grupos.find((g) => g.id === grupoId && g.profesorId === profesor.id);
    if (!grupo) return { error: "general" };
    if (!grupo.codigo) return { error: "sinCodigo" };
    const { para, sinCorreo } = destinatariosCodigo(grupo, Array.isArray(matriculas) ? matriculas.slice(0, 2000) : []);
    if (para.length === 0) return sinCorreo ? { ok: true, enviados: 0, fallidos: 0, sinCorreo } : { error: "elige" };
    if (!correoConfigurado()) return { ok: true, enviados: 0, fallidos: 0, sinCorreo, sinConfigurar: true };
    const { t } = await textos();
    const tc = t.marco.enviarCodigo;
    const curso = `${grupo.materia} · ${grupo.nombre}`;
    const url = `${await urlBase()}/alumno/licencias?codigo=${encodeURIComponent(grupo.codigo)}`;
    const enviados: string[] = [];
    let fallidos = 0;
    // Uno por uno: cada alumno recibe su propio correo y no ve las direcciones de los demás.
    for (const a of para) {
      try {
        await enviarCorreo(
          a.correo,
          formato(tc.asunto, { curso }),
          formato(tc.cuerpo, { nombre: nombreSaludo(a.nombre), profesor: profesor.nombre, curso, codigo: grupo.codigo, url }),
        );
        enviados.push(a.matricula);
      } catch (e) {
        fallidos++;
        console.error("Código por correo", e instanceof Error ? e.message : e);
      }
    }
    if (enviados.length) {
      const ahora = new Date().toISOString();
      modificar((d) => {
        const g = d.grupos.find((x) => x.id === grupoId);
        for (const al of g?.alumnos ?? []) if (enviados.includes(al.matricula)) al.codigoEnviado = ahora;
      });
      revalidatePath(`/profesor/grupos/${grupoId}/alumnos`);
    }
    return { ok: true, enviados: enviados.length, fallidos, sinCorreo };
  } catch (e) {
    console.error(e);
    return { error: "general" };
  }
}

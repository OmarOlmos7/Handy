"use server";

// Perfil de aprendizaje (Modelo CREAR), etapa 1. Todo queda detrás de la bandera perfil_cognitivo:
// con la bandera apagada estas acciones no hacen nada.
import { revalidatePath } from "next/cache";
import { leer, modificar } from "@/lib/almacen";
import { alumnoEnGrupo } from "@/lib/cuentas";
import { perfilActivo } from "@/lib/banderas";
import { conConsentimiento, nuevoConsentimiento, retirarConsentimiento, tieneConsentimiento } from "@/lib/perfil/consentimiento";
import { esDisciplina, guardarModelo, limpiarEtapas } from "@/lib/perfil/crear";
import { finesDeCursos } from "@/lib/perfil/diagnostico-inicial";
import { limpiarEnsayos, momentoPendiente, resumirStroop, semestreDe } from "@/lib/perfil/stroop";
import { alumnoActual, requerirProfesor } from "@/lib/sesion";

type Resultado = { ok: true } | { error: string };

/** El alumno da su consentimiento informado (y, si es menor, el de su madre, padre o tutor). */
export async function darConsentimientoPerfil(datos: {
  acepta: boolean;
  menor: boolean;
  tutorNombre?: string;
  tutorParentesco?: string;
  aceptaTutor?: boolean;
}): Promise<Resultado> {
  if (!perfilActivo()) return { error: "noDisponible" };
  const alumno = await alumnoActual();
  if (!alumno) return { error: "sinSesion" };
  const r = nuevoConsentimiento(alumno.id, {
    acepta: datos.acepta === true,
    menor: datos.menor === true,
    tutorNombre: datos.tutorNombre,
    tutorParentesco: datos.tutorParentesco,
    aceptaTutor: datos.aceptaTutor === true,
  });
  if (!r.ok) return { error: r.error };
  modificar((db) => {
    db.consentimientosPerfil = conConsentimiento(db.consentimientosPerfil, r.consentimiento);
  });
  revalidatePath("/alumno", "layout");
  return { ok: true };
}

/** El alumno retira su consentimiento: se deja de registrar su perfil. */
export async function retirarConsentimientoPerfil(): Promise<Resultado> {
  if (!perfilActivo()) return { error: "noDisponible" };
  const alumno = await alumnoActual();
  if (!alumno) return { error: "sinSesion" };
  modificar((db) => {
    db.consentimientosPerfil = retirarConsentimiento(db.consentimientosPerfil, alumno.id);
  });
  revalidatePath("/alumno", "layout");
  return { ok: true };
}

/**
 * Guarda la prueba de Stroop que le toca al alumno (inicio o cierre del semestre). El momento y el
 * resumen los decide el servidor; del navegador solo se toman los ensayos, ya validados.
 */
export async function guardarStroop(grupoId: string | undefined, entrada: { ensayos?: unknown; omitir?: boolean }): Promise<Resultado> {
  if (!perfilActivo()) return { error: "noDisponible" };
  const alumno = await alumnoActual();
  if (!alumno) return { error: "sinSesion" };
  const db = await leer();
  if (!tieneConsentimiento(db.consentimientosPerfil, alumno.id)) return { error: "sinConsentimiento" };
  const ahora = new Date();
  const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
  const fines = cuenta ? finesDeCursos(db.grupos.filter((g) => alumnoEnGrupo(g, cuenta))) : [];
  const momento = momentoPendiente(db.stroop, alumno.id, ahora, fines);
  if (!momento) return { error: "noToca" };
  const omitida = entrada.omitir === true;
  const ensayos = omitida ? [] : limpiarEnsayos(entrada.ensayos);
  if (!ensayos) return { error: "incompleta" };
  const curso = grupoId && alumno.cursos.some((c) => c.grupo.id === grupoId) ? grupoId : undefined;
  modificar((d) => {
    const lista = (d.stroop ??= []);
    // Si dos pestañas envían a la vez, la segunda no duplica la aplicación.
    if (lista.some((a) => a.alumnoId === alumno.id && a.semestre === semestreDe(ahora) && a.momento === momento)) return;
    lista.push({
      alumnoId: alumno.id,
      semestre: semestreDe(ahora),
      momento,
      fecha: ahora.toISOString(),
      ...(curso ? { grupoId: curso } : {}),
      ...(omitida ? { omitida: true } : { resumen: resumirStroop(ensayos) }),
      ensayos,
    });
  });
  revalidatePath("/alumno", "layout");
  return { ok: true };
}

/** El profesor guarda el Modelo CREAR adaptado a la disciplina de su curso. */
export async function guardarModeloCrear(grupoId: string, disciplina: string, etapas: unknown): Promise<{ ok: true; version: number; cambio: boolean } | { error: string }> {
  if (!perfilActivo()) return { error: "noDisponible" };
  const profesor = await requerirProfesor();
  const db = await leer();
  const grupo = db.grupos.find((g) => g.id === grupoId);
  if (!grupo || grupo.profesorId !== profesor.id) return { error: "noEncontrado" };
  if (!esDisciplina(disciplina)) return { error: "disciplina" };
  const limpias = limpiarEtapas(etapas, disciplina);
  const r = modificar((d) => {
    const g = guardarModelo(d.modelosCrear, grupoId, disciplina, limpias);
    d.modelosCrear = g.lista;
    return { cambio: g.cambio, version: g.lista.find((m) => m.grupoId === grupoId)?.version ?? 0 };
  });
  revalidatePath(`/profesor/grupos/${grupoId}`, "layout");
  return { ok: true, ...r };
}

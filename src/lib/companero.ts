// Datos del compañero de estudio para un alumno: su ánimo, lo que le sugiere y los temas de sus
// cursos. Toma solo los datos del propio alumno.
import { animoCompanero, pendientesDelAlumno, restantesHoy, sugerenciasCompanero, temasDelCurso, type Animo, type Sugerencia } from "./autoestudio";
import { analiticasAlumnoCurso } from "./portal-alumno";
import type { BaseDeDatos, Grupo, Alumno } from "./tipos";

export interface CursoCompanero {
  id: string;
  nombre: string;
  temas: string[];
}

export interface DatosDelCompanero {
  animo: Animo;
  sugerencias: Sugerencia[];
  cursos: CursoCompanero[];
  restantes: number;
}

export function datosCompanero(
  db: Pick<BaseDeDatos, "actividades" | "entregas" | "autoactividades">,
  alumnoId: string,
  cursos: { grupo: Grupo; alumno: Alumno }[],
  ahora: Date = new Date(),
): DatosDelCompanero {
  const ids = new Set(cursos.map((c) => c.grupo.id));
  const autoactividades = (db.autoactividades ?? []).filter((a) => a.alumnoId === alumnoId && ids.has(a.grupoId));
  const matriculaPorGrupo = Object.fromEntries(cursos.map((c) => [c.grupo.id, c.alumno.matricula]));
  const { proximas, vencidas } = pendientesDelAlumno(
    db.actividades.filter((a) => ids.has(a.grupoId)),
    db.entregas,
    matriculaPorGrupo,
    ahora,
  );
  const temasBajos = cursos
    .flatMap(({ grupo, alumno }) =>
      analiticasAlumnoCurso(grupo, db.actividades, db.entregas, alumno.matricula, ahora).temas.map((t) => ({ tema: t.nombre, acierto: t.acierto, grupoId: grupo.id })),
    )
    .sort((a, b) => a.acierto - b.acierto);
  const lista = cursos.map(({ grupo }) => ({ id: grupo.id, nombre: `${grupo.materia} · ${grupo.nombre}`, temas: temasDelCurso(db.actividades, grupo.id) }));
  const temas = lista.flatMap((c) => c.temas.map((tema) => ({ tema, grupoId: c.id })));
  const datos = { autoactividades, proximas, vencidas, temasBajos, temas, ahora };
  return {
    animo: animoCompanero(datos),
    sugerencias: sugerenciasCompanero(datos).slice(0, 8),
    cursos: lista,
    restantes: restantesHoy(db.autoactividades ?? [], alumnoId, ahora),
  };
}

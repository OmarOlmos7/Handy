// Ruta de aprendizaje de un alumno en un curso, con los datos guardados (lo usan la vista del
// alumno y la del profesor).
import { calificacion, escalaDe } from "./estadisticas";
import { aPorcentaje } from "./mapa-temario";
import { actividadesVisibles, resultadoVisible } from "./portal-alumno";
import { rutaDeAprendizaje, type ActividadParaRuta, type RutaAprendizaje } from "./ruta-aprendizaje";
import type { Asignatura, BaseDeDatos, ValoracionInicial } from "./tipos";

/**
 * Ruta de un alumno de un curso con los datos guardados: actividades visibles del curso (con su
 * calificación solo si ya se liberó), su autoestudio en el curso y su valoración inicial.
 */
export function rutaDelAlumno(
  db: Pick<BaseDeDatos, "actividades" | "entregas" | "autoactividades" | "valoraciones">,
  grupoId: string,
  asignatura: Pick<Asignatura, "id" | "unidades">,
  alumno: { cuentaId?: string; matricula: string },
  ahora: Date = new Date(),
): { ruta: RutaAprendizaje; valoracion?: ValoracionInicial } {
  const actividades = actividadesVisibles(db.actividades, grupoId, ahora)
    .filter((a) => a.temario?.asignaturaId === asignatura.id)
    .map((a): ActividadParaRuta => {
      const entrega = db.entregas.find((e) => e.actividadId === a.id && e.matricula === alumno.matricula);
      const visible = resultadoVisible(a, entrega, ahora);
      return {
        id: a.id,
        titulo: a.titulo,
        temario: a.temario,
        entregada: !!entrega && entrega.estado !== "sin_entregar",
        porcentaje: visible && entrega ? aPorcentaje(calificacion(a, entrega), escalaDe(a)) : null,
      };
    });
  const autoactividades = (db.autoactividades ?? []).filter((x) => x.grupoId === grupoId && (alumno.cuentaId ? x.alumnoId === alumno.cuentaId : x.matricula === alumno.matricula));
  const valoracion = (db.valoraciones ?? []).find(
    (v) => v.grupoId === grupoId && v.asignaturaId === asignatura.id && (alumno.cuentaId ? v.alumnoId === alumno.cuentaId : v.matricula === alumno.matricula),
  );
  return { ruta: rutaDeAprendizaje({ asignatura, niveles: valoracion?.niveles, actividades, autoactividades }), valoracion };
}

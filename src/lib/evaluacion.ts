// Evaluación con IA de la entrega de un alumno. Se dispara sola al recibir las fotos
// (y al confirmar la rúbrica); el profesor también puede reintentarla a mano.
// Cobra 1 crédito por página al profesor dueño del curso.
import "server-only";
import { actividadDe, grupoDe, leerAhora, modificar } from "./almacen";
import { saldoDe } from "./cuentas";
import { ErrorIA, evaluarEntrega } from "./ia";
import { imagenesParaIA } from "./imagenes";

export type ResultadoEvaluacion = { ok: true } | { ok: false; error: string; status: number };

/** Una evaluación en vuelo por servidor: así el saldo no se cobra dos veces ni se satura la API. */
let cola: Promise<unknown> = Promise.resolve();

/** Minutos tras los que una evaluación "en curso" se considera abandonada (por ejemplo, si se reinició el servidor). */
const MINUTOS_ABANDONO = 10;

export function evaluandoAhora(evaluandoDesde: string | undefined): boolean {
  return Boolean(evaluandoDesde && Date.now() - Date.parse(evaluandoDesde) < MINUTOS_ABANDONO * 60_000);
}

function marcar(actividadId: string, matricula: string, cambios: { evaluandoDesde?: string; error?: string }) {
  modificar((d) => {
    const e = d.entregas.find((x) => x.actividadId === actividadId && x.matricula === matricula);
    if (e) Object.assign(e, cambios);
  });
}

async function evaluarAhora(actividadId: string, matricula: string): Promise<ResultadoEvaluacion> {
  const db = leerAhora();
  const actividad = actividadDe(db, actividadId);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  if (!actividad || !grupo) return { ok: false, error: "Actividad no encontrada", status: 404 };
  if (!actividad.rubricaConfirmada || actividad.reactivos.length === 0) {
    return { ok: false, error: "Primero confirma la rúbrica", status: 409 };
  }
  const entrega = db.entregas.find((e) => e.actividadId === actividadId && e.matricula === matricula);
  if (!entrega?.imagenes?.length) return { ok: false, error: "Esta entrega no tiene fotos", status: 400 };
  if (entrega.estado !== "entregada") return { ok: true };
  const paginas = entrega.imagenes.length;
  if (!grupo.profesorId || saldoDe(db, grupo.profesorId) < paginas) {
    const error = "No hay créditos suficientes para evaluar. Compra créditos y vuelve a intentar.";
    marcar(actividadId, matricula, { evaluandoDesde: undefined, error });
    return { ok: false, error, status: 402 };
  }
  const nombre = grupo.alumnos.find((a) => a.matricula === matricula)?.nombre ?? matricula;
  const imagenes = entrega.imagenes;
  marcar(actividadId, matricula, { evaluandoDesde: new Date().toISOString(), error: undefined });

  try {
    // A la IA solo van las fotos y la rúbrica: nunca el nombre ni la matrícula.
    const evaluacion = await evaluarEntrega(actividad, imagenesParaIA(imagenes));
    modificar((d) => {
      const e = d.entregas.find((x) => x.actividadId === actividadId && x.matricula === matricula);
      // Si el alumno volvió a entregar mientras se evaluaba, no se pisa su entrega nueva.
      if (!e || e.estado !== "entregada" || e.imagenes?.join() !== imagenes.join()) return;
      // Se libera al alumno en cuanto se evalúa (respetando la fecha de visualización de la actividad);
      // el profesor puede corregirla después y el reporte del alumno se actualiza.
      Object.assign(e, evaluacion, { estado: "aprobada", evaluadaEn: new Date().toISOString(), error: undefined, evaluandoDesde: undefined });
      d.movimientos.unshift({
        profesorId: grupo.profesorId,
        fecha: new Date().toISOString().slice(0, 10),
        concepto: `Evaluación · ${actividad.titulo} · ${nombre}`,
        cantidad: -paginas,
      });
    });
    return { ok: true };
  } catch (e) {
    const error = e instanceof ErrorIA ? e.message : "No se pudo evaluar la entrega.";
    console.error(e);
    marcar(actividadId, matricula, { evaluandoDesde: undefined, error });
    return { ok: false, error, status: 502 };
  }
}

/** Evalúa una entrega. Las evaluaciones se forman en fila y corren una a la vez. */
export function evaluarYGuardar(actividadId: string, matricula: string): Promise<ResultadoEvaluacion> {
  const turno = cola.then(() => evaluarAhora(actividadId, matricula));
  cola = turno.catch(() => undefined);
  return turno;
}

/** Marca entregas como "en fila" para que el profesor vea el avance, o las desmarca. */
export function marcarEnFila(actividadId: string, matriculas: string[], enFila = true) {
  const ahora = new Date().toISOString();
  modificar((d) => {
    for (const e of d.entregas) {
      if (e.actividadId === actividadId && matriculas.includes(e.matricula) && e.estado === "entregada") {
        e.evaluandoDesde = enFila ? ahora : undefined;
        if (enFila) e.error = undefined;
      }
    }
  });
}

/** Entregas con fotos que esperan evaluación y no están ya en curso. */
export function entregasPorEvaluar(actividadId: string): string[] {
  return leerAhora()
    .entregas.filter((e) => e.actividadId === actividadId && e.estado === "entregada" && e.imagenes?.length && !evaluandoAhora(e.evaluandoDesde))
    .map((e) => e.matricula);
}

/** Evalúa en orden las entregas indicadas (por ejemplo, todas las pendientes al confirmar la rúbrica). */
export async function evaluarVarias(actividadId: string, matriculas: string[]) {
  for (const [i, m] of matriculas.entries()) {
    const r = await evaluarYGuardar(actividadId, m);
    if (!r.ok && (r.status === 402 || r.status === 409)) {
      const resto = matriculas.slice(i + 1);
      modificar((d) => {
        for (const e of d.entregas) {
          if (e.actividadId === actividadId && resto.includes(e.matricula) && e.estado === "entregada") {
            e.evaluandoDesde = undefined;
            e.error = r.error;
          }
        }
      });
      break;
    }
  }
}

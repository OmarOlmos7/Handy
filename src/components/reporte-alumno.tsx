// Reporte de retroalimentación del alumno, con el formato acordado:
// 1) identificación, 2) resumen (positivos, mejoras, elementos y calificación),
// 3) la actividad anexa con las correcciones.
import type { Actividad, Alumno, Entrega, Grupo } from "@/lib/tipos";
import { calificacion, puntosObtenidos, puntosTotales } from "@/lib/estadisticas";
import { HojaEntrega, paginasDe } from "./hoja-entrega";
import { colorCalificacion, fechaLarga } from "./ui";

const nombreTipo: Record<string, string> = {
  verdadero_falso: "Verdadero o falso",
  opcion_multiple: "Opción múltiple",
  relacion_columnas: "Relación de columnas",
  parentesis: "Paréntesis",
  desarrollo: "Desarrollo",
  abierto: "Respuesta abierta",
};

export function ReporteAlumno({
  actividad,
  alumno,
  entrega,
  grupo,
}: {
  actividad: Actividad;
  alumno: Alumno;
  entrega: Entrega;
  grupo: Grupo;
}) {
  const cal = calificacion(actividad, entrega);
  const grupoTexto = `${grupo.materia} · ${grupo.nombre}`;
  return (
    <article className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">1. Datos del alumno</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Nombre</dt>
            <dd className="font-medium">{alumno.nombre}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Matrícula</dt>
            <dd className="font-mono">{alumno.matricula}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Grupo</dt>
            <dd>{grupoTexto}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Actividad</dt>
            <dd>{actividad.titulo}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Fecha de aplicación</dt>
            <dd>{fechaLarga(actividad.fechaAplicacion)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Calificación</dt>
            <dd className={`text-2xl font-semibold ${colorCalificacion(cal)}`}>
              {cal.toFixed(1)} <span className="text-sm font-normal text-slate-500">/ 10</span>
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">2. Resumen de la retroalimentación</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-acierto-suave/60 p-4">
            <h3 className="font-medium text-acierto">Puntos positivos</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {entrega.positivos.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-error-suave/60 p-4">
            <h3 className="font-medium text-error">Puntos de mejora</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {entrega.mejoras.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3 font-medium">Reactivo</th>
                <th className="py-2 pr-3 font-medium">Tipo</th>
                <th className="py-2 pr-3 font-medium">Tema</th>
                <th className="py-2 pr-3 font-medium">Comentario</th>
                <th className="py-2 text-right font-medium">Puntos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actividad.reactivos.map((r) => {
                const res = entrega.resultados.find((x) => x.numero === r.numero)!;
                const completo = res.puntosObtenidos === r.puntos;
                return (
                  <tr key={r.numero}>
                    <td className="py-2 pr-3 font-medium">{r.numero}</td>
                    <td className="py-2 pr-3 text-slate-600">{nombreTipo[r.tipo]}</td>
                    <td className="py-2 pr-3 text-slate-600">{r.tema}</td>
                    <td className="py-2 pr-3 text-slate-700">{res.comentario}</td>
                    <td className={`py-2 text-right font-medium ${completo ? "text-acierto" : "text-error"}`}>
                      {res.puntosObtenidos}/{r.puntos}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300">
                <td colSpan={4} className="py-2 font-medium">
                  Total
                </td>
                <td className="py-2 text-right font-semibold">
                  {puntosObtenidos(entrega)}/{puntosTotales(actividad)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          3. Tu actividad con correcciones
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: paginasDe(actividad, entrega) }, (_, i) => (
            <HojaEntrega
              key={i}
              actividad={actividad}
              pagina={i + 1}
              alumno={alumno}
              entrega={entrega}
              grupoTexto={grupoTexto}
            />
          ))}
        </div>
      </section>
    </article>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BarrasH, Columnas, LeyendaDesempeno, Pastel, Radar } from "@/components/graficas";
import { Tarjeta, fechaLarga } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { APROBATORIA, analiticasCurso, type ResumenAlumno } from "@/lib/analiticas";
import { colorDesempeno } from "@/lib/escala-color";
import { datosProfesor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Analíticas de aprendizaje" };

const num = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 1 });

/** Color del texto de un puntaje sobre 100, con los mismos umbrales del resto de la app. */
function tonoPuntaje(p: number) {
  if (p >= 85) return "text-acierto";
  if (p >= 70) return "text-aviso";
  return "text-error";
}

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

function Seccion({ titulo, nota, children, className = "" }: { titulo: string; nota?: string; children: ReactNode; className?: string }) {
  return (
    <Tarjeta className={className}>
      <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
      {nota && <p className="mt-0.5 text-xs text-slate-500">{nota}</p>}
      <div className="mt-4">{children}</div>
    </Tarjeta>
  );
}

function TablaAlumnos({ filas, vacio, motivos }: { filas: ResumenAlumno[]; vacio: string; motivos?: boolean }) {
  if (filas.length === 0) return <p className="text-sm text-slate-500">{vacio}</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
          <th className="pb-2 font-medium">Alumno</th>
          <th className="pb-2 text-right font-medium">Promedio</th>
          {motivos ? <th className="pb-2 pl-4 font-medium">Motivo</th> : <th className="pb-2 text-right font-medium">Entregas</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {filas.map((r) => (
          <tr key={r.alumno.matricula}>
            <td className="py-2 text-slate-800">{r.alumno.nombre}</td>
            <td className={`py-2 text-right font-semibold tabular-nums ${tonoPuntaje(r.promedio)}`}>{num(r.promedio)}</td>
            {motivos ? (
              <td className="py-2 pl-4 text-xs text-slate-600">{r.motivos.join(" · ")}</td>
            ) : (
              <td className="py-2 text-right tabular-nums text-slate-600">
                {r.puntajes.length - r.noEntregadas}/{r.puntajes.length}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Tablero con los resultados de todas las actividades del curso. */
export default async function AnaliticasCurso({ params }: PageProps<"/profesor/grupos/[id]/analiticas">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const actividades = db.actividades.filter((a) => a.grupoId === id);
  const ids = new Set(actividades.map((a) => a.id));
  const a = analiticasCurso(grupo, actividades, db.entregas.filter((e) => ids.has(e.actividadId)));
  const g = a.general;
  const hay = a.actividades.length > 0;

  return (
    <>
      <div className="mb-6">
        <nav className="mb-1 flex flex-wrap gap-1 text-sm text-slate-500" aria-label="Ruta">
          <Link href="/profesor" className="hover:text-tinta-700">Panel</Link>
          <span>/</span>
          <Link href={`/profesor/grupos/${grupo.id}`} className="hover:text-tinta-700">
            {grupo.materia} · {grupo.nombre}
          </Link>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analíticas de aprendizaje</h1>
        <p className="mt-1 text-sm text-slate-600">
          {a.actividades.length} {a.actividades.length === 1 ? "actividad evaluada" : "actividades evaluadas"} · {g.alumnos}{" "}
          {g.alumnos === 1 ? "alumno" : "alumnos"} · Puntajes sobre 100; un trabajo no entregado cuenta como 0.
        </p>
      </div>

      {!hay ? (
        <Tarjeta className="text-sm text-slate-600">
          Aún no hay actividades evaluadas en este curso. Las analíticas aparecen en cuanto se evalúe la primera entrega.
        </Tarjeta>
      ) : (
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Cifra titulo="Promedio general" valor={num(g.promedio)} detalle={`${num(g.promedioEntregadas)} sin contar lo no entregado`} />
            <Cifra titulo="Mediana" valor={num(g.mediana)} detalle="De los promedios por alumno" />
            <Cifra titulo="Desviación estándar" valor={num(g.desviacion)} detalle="Qué tan dispersos están los promedios" />
            <Cifra titulo="Aprobación" valor={`${g.aprobacion}%`} detalle={`Alumnos con promedio de ${APROBATORIA} o más`} />
            <Cifra titulo="Tasa de entrega" valor={`${g.tasaEntrega}%`} detalle={`${g.noEntregadas} sin entregar`} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Seccion titulo="Aprobados vs. no aprobados" nota={`Por promedio del alumno; aprueba con ${APROBATORIA} o más.`}>
              <Pastel
                centro={`${g.aprobacion}%`}
                subcentro="aprobados"
                rebanadas={[
                  { nombre: "Aprobados", valor: g.aprobados, color: "#22c55e" },
                  { nombre: "No aprobados", valor: g.reprobados, color: "#ef4444" },
                ]}
              />
            </Seccion>
            <Seccion titulo="Niveles de desempeño" nota="Alumnos según su promedio.">
              <Pastel
                centro={String(g.alumnos)}
                subcentro="alumnos"
                rebanadas={[
                  { nombre: "Alto (85 o más)", valor: a.niveles.alto, color: "#16a34a" },
                  { nombre: "Medio (70 a 84)", valor: a.niveles.medio, color: "#f59e0b" },
                  { nombre: "Bajo (menos de 70)", valor: a.niveles.bajo, color: "#dc2626" },
                ]}
              />
            </Seccion>
            <Seccion titulo="Entregas" nota="Trabajos de las actividades evaluadas.">
              <Pastel
                centro={`${g.tasaEntrega}%`}
                subcentro="entregados"
                rebanadas={[
                  { nombre: "Entregados", valor: g.entregadas, color: "#3b6ef6" },
                  { nombre: "No entregados (0)", valor: g.noEntregadas, color: "#94a3b8" },
                ]}
              />
            </Seccion>
          </div>

          <Seccion titulo="Hallazgos" nota="Calculados con los resultados del curso.">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {a.hallazgos.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </Seccion>

          <div className="flex justify-end">
            <LeyendaDesempeno aprobatoria={APROBATORIA} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {a.porTipo.length >= 3 ? (
              <Seccion titulo="Desempeño por tipo de actividad" nota="Promedio sobre 100. El anillo punteado marca la calificación aprobatoria.">
                <Radar aprobatoria={APROBATORIA} ejes={a.porTipo.map((t) => ({ nombre: t.nombre, valor: t.promedio }))} />
              </Seccion>
            ) : a.actividades.length >= 3 ? (
              <Seccion
                titulo="Desempeño por actividad"
                nota="Promedio de cada actividad, con su tipo. El radar por tipo aparece con 3 o más tipos de actividad."
              >
                <Radar
                  aprobatoria={APROBATORIA}
                  ejes={a.actividades.map((s) => ({ nombre: `${s.etiqueta ?? "Sin tipo"}: ${s.titulo}`, valor: s.promedio }))}
                />
              </Seccion>
            ) : (
              <Seccion titulo="Promedio por tipo de actividad" nota="La línea gris marca la calificación aprobatoria.">
                <BarrasH
                  aprobatoria={APROBATORIA}
                  filas={a.porTipo.map((t) => ({
                    nombre: t.nombre,
                    valor: t.promedio,
                    detalle: `${t.cantidad} ${t.cantidad === 1 ? "actividad" : "actividades"}`,
                  }))}
                />
              </Seccion>
            )}
            {a.temas.length >= 3 ? (
              <Seccion
                titulo="Acierto por tema"
                nota={
                  a.temas.length > 8
                    ? "Los 8 temas con menor acierto: porcentaje de puntos logrados en sus reactivos."
                    : "Porcentaje de puntos logrados en los reactivos de cada tema."
                }
              >
                <Radar aprobatoria={APROBATORIA} ejes={[...a.temas].reverse().slice(0, 8).map((t) => ({ nombre: t.nombre, valor: t.acierto }))} />
              </Seccion>
            ) : (
              <Seccion titulo="Temas con menor acierto" nota="Porcentaje de puntos logrados en los reactivos de cada tema.">
                <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={a.temasDebiles.map((t) => ({ nombre: t.nombre, valor: t.acierto }))} />
              </Seccion>
            )}
            {a.porTipo.length >= 1 && (a.porTipo.length >= 3 || a.actividades.length >= 3) && (
              <Seccion titulo="Promedio por tipo de actividad" nota="La línea gris marca la calificación aprobatoria.">
                <BarrasH
                  aprobatoria={APROBATORIA}
                  filas={a.porTipo.map((t) => ({
                    nombre: t.nombre,
                    valor: t.promedio,
                    detalle: `${t.cantidad} ${t.cantidad === 1 ? "actividad" : "actividades"}`,
                  }))}
                />
              </Seccion>
            )}
            {a.temas.length >= 3 && (
              <Seccion titulo="Temas con menor acierto" nota="Los cinco temas con menos puntos logrados.">
                <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={a.temasDebiles.map((t) => ({ nombre: t.nombre, valor: t.acierto }))} />
              </Seccion>
            )}
            <Seccion titulo="Evolución del promedio" nota="Promedio de cada actividad, en orden de fecha. La línea punteada es la aprobatoria.">
              <Columnas
                max={100}
                lineaEn={APROBATORIA}
                filas={a.actividades.map((s) => ({ nombre: s.titulo, valor: s.promedio, detalle: fechaLarga(s.fecha) }))}
              />
            </Seccion>
            <Seccion titulo="Distribución de promedios" nota="Cuántos alumnos hay en cada rango.">
              <Columnas
                max={Math.max(...a.distribucion.map((d) => d.cantidad))}
                sufijo=" alumnos"
                filas={a.distribucion.map((d, i) => ({ nombre: d.rango, valor: d.cantidad, color: colorDesempeno([30, 65, 75, 85, 95][i] ?? 50) }))}
              />
            </Seccion>
            <Seccion titulo="Mejores resultados" nota="Los cinco promedios más altos.">
              <TablaAlumnos filas={a.mejores} vacio="Aún no hay alumnos destacados." />
            </Seccion>
            <Seccion
              titulo="Atención urgente"
              nota={`Promedio menor a ${APROBATORIA}, dos o más trabajos sin entregar, o una caída de 15 puntos o más.`}
              className="ring-red-200"
            >
              <TablaAlumnos filas={a.atencion} vacio="Ningún alumno requiere atención urgente." motivos />
            </Seccion>
          </div>

          <Seccion titulo="Estadísticas por actividad" nota="Sobre 100. El promedio cuenta como 0 lo no entregado.">
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 font-medium">Actividad</th>
                    <th className="pb-2 font-medium">Tipo</th>
                    <th className="pb-2 text-right font-medium">Entrega</th>
                    <th className="pb-2 text-right font-medium">Promedio</th>
                    <th className="pb-2 text-right font-medium" title="Promedio solo de quienes entregaron">Prom. entregados</th>
                    <th className="pb-2 text-right font-medium">Mediana</th>
                    <th className="pb-2 text-right font-medium">Desv. est.</th>
                    <th className="pb-2 text-right font-medium">Mín.</th>
                    <th className="pb-2 text-right font-medium">Máx.</th>
                    <th className="pb-2 text-right font-medium">Aprobación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {a.actividades.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2 pr-3">
                        <Link href={`/profesor/actividades/${s.id}/reporte`} className="font-medium text-slate-800 hover:text-tinta-700">
                          {s.titulo}
                        </Link>
                        <span className="block text-xs text-slate-500">
                          {fechaLarga(s.fecha)}
                          {s.pendientes > 0 && ` · ${s.pendientes} por evaluar`}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{s.etiqueta ?? "—"}</td>
                      <td className="py-2 text-right text-slate-600">{s.tasaEntrega}%</td>
                      <td className={`py-2 text-right font-semibold ${tonoPuntaje(s.promedio)}`}>{num(s.promedio)}</td>
                      <td className="py-2 text-right text-slate-700">{num(s.promedioEntregadas)}</td>
                      <td className="py-2 text-right text-slate-700">{num(s.mediana)}</td>
                      <td className="py-2 text-right text-slate-700">{num(s.desviacion)}</td>
                      <td className="py-2 text-right text-slate-700">{num(s.minima)}</td>
                      <td className="py-2 text-right text-slate-700">{num(s.maxima)}</td>
                      <td className="py-2 text-right text-slate-700">{s.aprobacion}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {a.sinResultados.length > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                Sin resultados todavía (no cuentan): {a.sinResultados.map((s) => s.titulo).join(", ")}.
              </p>
            )}
          </Seccion>
        </div>
      )}
    </>
  );
}

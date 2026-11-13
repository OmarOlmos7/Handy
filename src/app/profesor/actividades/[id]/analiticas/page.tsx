import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DescargasReporte } from "@/components/descargas-reporte";
import { ConFlujo } from "@/components/flujo-actividad";
import { BarrasH, Columnas, LeyendaDesempeno, Pastel, Radar } from "@/components/graficas";
import { PestanasActividad } from "@/components/pestanas-actividad";
import { Cifra, Seccion, TablaAlumnos, num } from "@/components/tablero";
import { BotonLink, Encabezado, InsigniaNivel, Tarjeta, colorCalificacion, fechaLarga } from "@/components/ui";
import { actividadDe, entregasDe, grupoDe } from "@/lib/almacen";
import { APROBATORIA, analiticasCurso } from "@/lib/analiticas";
import { colorDesempeno } from "@/lib/escala-color";
import { formatoCal, reporteGrupo } from "@/lib/estadisticas";
import { datosProfesor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Analíticas de la actividad" };

const nombreTipo: Record<string, string> = {
  verdadero_falso: "V/F",
  opcion_multiple: "Opción múltiple",
  relacion_columnas: "Relación",
  parentesis: "Paréntesis",
  desarrollo: "Desarrollo",
  abierto: "Abierto",
};

/** Métricas de aprendizaje de una sola actividad, con el mismo tablero que el del grupo. */
export default async function AnaliticasActividad({ params }: PageProps<"/profesor/actividades/[id]/analiticas">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const entregas = entregasDe(db, id);
  const a = analiticasCurso(grupo, [actividad], entregas);
  const rep = reporteGrupo(actividad, entregas, grupo.alumnos);
  const g = a.general;
  const s = a.actividades[0];
  const hay = Boolean(s);

  const hallazgos = [...a.hallazgos];
  if (rep.porReactivo.length >= 2) {
    const debiles = [...rep.porReactivo].sort((x, y) => x.acierto - y.acierto).slice(0, 2);
    hallazgos.splice(1, 0, `Conviene repasar los reactivos ${debiles.map((d) => `${d.numero} (${d.acierto}%)`).join(" y ")}, que tuvieron el menor acierto.`);
  }
  const fuerte = rep.porHabilidad[0];
  const debil = rep.porHabilidad[rep.porHabilidad.length - 1];
  if (fuerte && debil && fuerte.nombre !== debil.nombre) {
    hallazgos.push(`La habilidad mejor lograda es ${fuerte.nombre} (${fuerte.acierto}%) y la más débil, ${debil.nombre} (${debil.acierto}%).`);
  }

  const sinEntregar = grupo.alumnos.filter((al) => !rep.filas.some((f) => f.alumno.matricula === al.matricula));

  return (
    <>
      <Encabezado
        migas={[
          { texto: "Panel", href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: actividad.titulo, href: `/profesor/actividades/${id}` },
        ]}
        titulo="Analíticas de la actividad"
        subtitulo={`${actividad.titulo} · aplicada ${fechaLarga(actividad.fechaAplicacion)} · puntajes sobre 100 (la actividad se califica sobre ${rep.escala}); un trabajo no entregado cuenta como 0.`}
        acciones={
          <>
            {rep.entregadas > 0 && (
              <DescargasReporte
                filas={rep.filas}
                actividad={actividad.titulo}
                actividadId={actividad.id}
                grupo={grupo.nombre}
                materia={grupo.materia}
                fecha={actividad.fechaAplicacion}
              />
            )}
            <BotonLink href={`/profesor/grupos/${grupo.id}/analiticas`} variante="secundario">
              Analíticas del grupo
            </BotonLink>
          </>
        }
      />
      <ConFlujo vista={4} db={db} actividad={actividad}>
        <PestanasActividad id={id} activa="analiticas" />
        {!hay ? (
          <Tarjeta className="text-sm text-slate-600">Las analíticas aparecen en cuanto haya entregas evaluadas.</Tarjeta>
        ) : (
          <div className="min-w-0 space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Cifra titulo="Promedio" valor={num(s.promedio)} detalle={`${num(s.promedioEntregadas)} sin contar lo no entregado`} />
              <Cifra titulo="Mediana" valor={num(s.mediana)} detalle={`Mín. ${num(s.minima)} · máx. ${num(s.maxima)}`} />
              <Cifra titulo="Desviación estándar" valor={num(s.desviacion)} detalle="Qué tan dispersos están los puntajes" />
              <Cifra titulo="Aprobación" valor={`${s.aprobacion}%`} detalle={`Alumnos con ${APROBATORIA} o más`} />
              <Cifra titulo="Tasa de entrega" valor={`${s.tasaEntrega}%`} detalle={`${s.noEntregadas} sin entregar${s.pendientes ? ` · ${s.pendientes} por evaluar` : ""}`} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Seccion titulo="Aprobados vs. no aprobados" nota={`Aprueba con ${APROBATORIA} o más.`}>
                <Pastel
                  centro={`${g.aprobacion}%`}
                  subcentro="aprobados"
                  rebanadas={[
                    { nombre: "Aprobados", valor: g.aprobados, color: "#22c55e" },
                    { nombre: "No aprobados", valor: g.reprobados, color: "#ef4444" },
                  ]}
                />
              </Seccion>
              <Seccion titulo="Niveles de desempeño" nota="Alumnos según su puntaje.">
                <Pastel
                  centro={String(g.aprobados + g.reprobados)}
                  subcentro="alumnos"
                  rebanadas={[
                    { nombre: "Alto (85 o más)", valor: a.niveles.alto, color: "#16a34a" },
                    { nombre: "Medio (70 a 84)", valor: a.niveles.medio, color: "#f59e0b" },
                    { nombre: "Bajo (menos de 70)", valor: a.niveles.bajo, color: "#dc2626" },
                  ]}
                />
              </Seccion>
              <Seccion titulo="Entregas" nota="Alumnos del curso.">
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

            <Seccion titulo="Hallazgos" nota="Calculados con los resultados de la actividad.">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {hallazgos.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </Seccion>

            <div className="flex justify-end">
              <LeyendaDesempeno aprobatoria={APROBATORIA} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {rep.porReactivo.length >= 3 ? (
                <Seccion titulo="Acierto por reactivo" nota="Porcentaje de puntos logrados en cada reactivo. El anillo punteado marca 60.">
                  <Radar
                    aprobatoria={APROBATORIA}
                    ejes={rep.porReactivo.map((r) => ({ nombre: `${r.numero}. ${nombreTipo[r.tipo] ?? r.tipo}`, valor: r.acierto }))}
                  />
                </Seccion>
              ) : (
                <Seccion titulo="Acierto por reactivo" nota="Porcentaje de puntos logrados en cada reactivo.">
                  <BarrasH
                    aprobatoria={APROBATORIA}
                    sufijo="%"
                    filas={rep.porReactivo.map((r) => ({ nombre: `${r.numero}. ${nombreTipo[r.tipo] ?? r.tipo}`, valor: r.acierto }))}
                  />
                </Seccion>
              )}
              {a.temas.length >= 3 ? (
                <Seccion titulo="Acierto por tema" nota="Porcentaje de puntos logrados en los reactivos de cada tema.">
                  <Radar aprobatoria={APROBATORIA} ejes={[...a.temas].reverse().slice(0, 8).map((t) => ({ nombre: t.nombre, valor: t.acierto }))} />
                </Seccion>
              ) : (
                <Seccion titulo="Acierto por tema" nota="Porcentaje de puntos logrados en los reactivos de cada tema.">
                  <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={a.temas.map((t) => ({ nombre: t.nombre, valor: t.acierto }))} />
                </Seccion>
              )}
              <Seccion titulo="Habilidades" nota="Sobresalientes arriba, áreas de mejora abajo.">
                <BarrasH aprobatoria={APROBATORIA} sufijo="%" filas={rep.porHabilidad.map((h) => ({ nombre: h.nombre, valor: h.acierto }))} />
              </Seccion>
              <Seccion titulo="Distribución de puntajes" nota="Cuántos alumnos hay en cada rango (sobre 100).">
                <Columnas
                  max={Math.max(...a.distribucion.map((d) => d.cantidad))}
                  sufijo=" alumnos"
                  filas={a.distribucion.map((d, i) => ({ nombre: d.rango, valor: d.cantidad, color: colorDesempeno([30, 65, 75, 85, 95][i] ?? 50) }))}
                />
              </Seccion>
              <Seccion titulo="Mejores resultados" nota="Los cinco puntajes más altos.">
                <TablaAlumnos filas={a.mejores} vacio="Aún no hay alumnos destacados." titulo="Puntaje" entregas={false} />
              </Seccion>
              <Seccion titulo="Atención urgente" nota={`Puntaje menor a ${APROBATORIA} o trabajo sin entregar.`} className="ring-red-200">
                <TablaAlumnos filas={a.atencion} vacio="Ningún alumno requiere atención urgente." titulo="Puntaje" motivos />
              </Seccion>
            </div>

            <Seccion titulo="Calificaciones de la actividad" nota={`Calificación sobre ${rep.escala}. Toca un nombre para revisar su hoja.`}>
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Alumno</th>
                      <th className="pb-2 font-medium">Matrícula</th>
                      <th className="pb-2 font-medium">Nivel</th>
                      <th className="pb-2 text-right font-medium">Calificación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rep.filas.map((f, i) => (
                      <tr key={f.alumno.matricula}>
                        <td className="py-2 text-slate-400">{i + 1}</td>
                        <td className="py-2">
                          {f.entrega.resultados.length > 0 ? (
                            <Link href={`/profesor/actividades/${id}/revision/${f.alumno.matricula}`} className="font-medium hover:text-tinta-700">
                              {f.alumno.nombre}
                            </Link>
                          ) : (
                            <span className="font-medium">{f.alumno.nombre}</span>
                          )}
                        </td>
                        <td className="py-2 font-mono text-xs text-slate-600">{f.alumno.matricula}</td>
                        <td className="py-2">
                          <InsigniaNivel nivel={f.nivel} />
                        </td>
                        <td className={`py-2 text-right font-semibold ${colorCalificacion(f.calificacion, rep.escala)}`}>
                          {formatoCal(f.calificacion, rep.escala)}
                        </td>
                      </tr>
                    ))}
                    {sinEntregar.map((al) => (
                      <tr key={al.matricula} className="text-slate-500">
                        <td className="py-2 text-slate-300">—</td>
                        <td className="py-2">{al.nombre}</td>
                        <td className="py-2 font-mono text-xs">{al.matricula}</td>
                        <td className="py-2 text-xs">Sin calificación</td>
                        <td className="py-2 text-right font-semibold text-error">0 NE</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Seccion>
          </div>
        )}
      </ConFlujo>
    </>
  );
}

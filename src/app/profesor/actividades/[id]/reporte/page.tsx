import { notFound } from "next/navigation";
import Link from "next/link";
import { DescargasReporte } from "@/components/descargas-reporte";
import { PestanasActividad } from "@/components/pestanas-actividad";
import { Barra, Encabezado, InsigniaNivel, Tarjeta, colorCalificacion, fechaLarga } from "@/components/ui";
import { actividadDe, entregasDe, grupoDe } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";
import { UMBRALES, reporteGrupo, resumenNarrativo } from "@/lib/estadisticas";

const nombreTipo: Record<string, string> = {
  verdadero_falso: "V/F",
  opcion_multiple: "Opción múltiple",
  relacion_columnas: "Relación",
  parentesis: "Paréntesis",
  desarrollo: "Desarrollo",
  abierto: "Abierto",
};

export default async function ReporteGrupo({ params }: PageProps<"/profesor/actividades/[id]/reporte">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;
  const rep = reporteGrupo(actividad, entregasDe(db, id), grupo.alumnos);
  const maxDist = Math.max(1, ...rep.distribucion.map((d) => d.cantidad));
  const menores = [...rep.porReactivo].sort((a, b) => a.acierto - b.acierto).slice(0, 3);

  const encabezado = (
    <>
      <Encabezado
        migas={[
          { texto: "Panel", href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: "/profesor" },
        ]}
        titulo={actividad.titulo}
        subtitulo={`Reporte de desempeño del grupo · aplicada ${fechaLarga(actividad.fechaAplicacion)}`}
        acciones={
          rep.entregadas > 0 ? (
            <DescargasReporte
              filas={rep.filas}
              actividad={actividad.titulo}
              actividadId={actividad.id}
              grupo={grupo.nombre}
              materia={grupo.materia}
              fecha={actividad.fechaAplicacion}
            />
          ) : undefined
        }
      />
      <PestanasActividad id={id} activa="reporte" />
    </>
  );

  if (rep.entregadas === 0) {
    return (
      <>
        {encabezado}
        <Tarjeta className="text-sm text-slate-600">El reporte aparecerá cuando haya entregas evaluadas.</Tarjeta>
      </>
    );
  }

  return (
    <>
      {encabezado}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta>
          <p className="text-sm text-slate-500">Promedio del grupo</p>
          <p className={`mt-1 text-3xl font-semibold ${colorCalificacion(rep.promedio)}`}>{rep.promedio}</p>
          <p className="text-xs text-slate-500">Mediana {rep.mediana}</p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm text-slate-500">Rango</p>
          <p className="mt-1 text-3xl font-semibold">
            {rep.minima.toFixed(1)} – {rep.maxima.toFixed(1)}
          </p>
          <p className="text-xs text-slate-500">Mínima y máxima</p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm text-slate-500">Entregas evaluadas</p>
          <p className="mt-1 text-3xl font-semibold">{rep.entregadas}</p>
          <p className="text-xs text-slate-500">{rep.pendientes} sin entregar</p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm text-slate-500">Alumnos por nivel</p>
          <p className="mt-2 flex gap-3 text-sm">
            <span className="font-semibold text-acierto">{rep.niveles.alto.length} alto</span>
            <span className="font-semibold text-aviso">{rep.niveles.medio.length} medio</span>
            <span className="font-semibold text-error">{rep.niveles.bajo.length} bajo</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Alto ≥ {UMBRALES.alto} · medio ≥ {UMBRALES.medio}
          </p>
        </Tarjeta>
      </div>

      <Tarjeta className="mt-6 border-l-4 border-tinta-500">
        <h2 className="text-sm font-semibold text-tinta-700">Resumen del grupo</h2>
        <p className="mt-2 text-slate-700">{resumenNarrativo(rep)}</p>
      </Tarjeta>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="font-semibold">Acierto por reactivo</h2>
          <p className="text-sm text-slate-500">Porcentaje promedio de puntos obtenidos.</p>
          <ul className="mt-4 space-y-3">
            {rep.porReactivo.map((r) => (
              <li key={r.numero} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate text-slate-700">
                  {r.numero}. {nombreTipo[r.tipo]}
                </span>
                <Barra valor={r.acierto} />
                <span className="text-right font-medium">{r.acierto}%</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-600">
            Reactivos con menor acierto: <span className="font-medium">{menores.map((m) => m.numero).join(", ")}</span>.
          </p>
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-semibold">Distribución de calificaciones</h2>
          <div className="mt-4 flex h-44 items-end gap-3">
            {rep.distribucion.map((d) => (
              <div key={d.rango} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-sm font-medium">{d.cantidad}</span>
                <div className="w-full rounded-t-md bg-tinta-500" style={{ height: `${(d.cantidad / maxDist) * 120 + 2}px` }} />
                <span className="text-xs text-slate-500">{d.rango}</span>
              </div>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-semibold">Temas</h2>
          <p className="text-sm text-slate-500">Conocimientos mejor y peor evaluados.</p>
          <ul className="mt-4 space-y-3">
            {rep.porTema.map((t) => (
              <li key={t.nombre} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate text-slate-700">{t.nombre}</span>
                <Barra valor={t.acierto} />
                <span className="text-right font-medium">{t.acierto}%</span>
              </li>
            ))}
          </ul>
        </Tarjeta>

        <Tarjeta>
          <h2 className="font-semibold">Habilidades</h2>
          <p className="text-sm text-slate-500">Sobresalientes arriba, áreas de mejora abajo.</p>
          <ul className="mt-4 space-y-3">
            {rep.porHabilidad.map((t) => (
              <li key={t.nombre} className="grid grid-cols-[minmax(8rem,13rem)_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate text-slate-700">{t.nombre}</span>
                <Barra valor={t.acierto} />
                <span className="text-right font-medium">{t.acierto}%</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Alumno</th>
              <th className="px-4 py-3 font-medium">Matrícula</th>
              <th className="px-4 py-3 font-medium">Nivel</th>
              <th className="px-4 py-3 text-right font-medium">Calificación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rep.filas.map((f, i) => (
              <tr key={f.alumno.matricula}>
                <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                <td className="px-4 py-2">
                  <Link href={`/profesor/actividades/${id}/revision/${f.alumno.matricula}`} className="font-medium hover:text-tinta-700">
                    {f.alumno.nombre}
                  </Link>
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-600">{f.alumno.matricula}</td>
                <td className="px-4 py-2">
                  <InsigniaNivel nivel={f.nivel} />
                </td>
                <td className={`px-4 py-2 text-right font-semibold ${colorCalificacion(f.calificacion)}`}>
                  {f.calificacion.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

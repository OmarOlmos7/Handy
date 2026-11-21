import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TablaCuaderno } from "@/components/tabla-cuaderno";
import { Tarjeta } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { cuadernoCurso } from "@/lib/cuaderno";
import { PlanEvaluacionCurso } from "@/components/plan-evaluacion";
import { notaFinal } from "@/lib/plan-evaluacion";
import { notaConAutoestudio, resumenAutoestudio } from "@/lib/autoestudio";
import { datosProfesor } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";
import { formato } from "@/lib/i18n/idiomas";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.cuaderno.titulo };
}

/** Bitácora de calificaciones del curso: ver resultados y corregir notas. */
export default async function CuadernoCurso({ params }: PageProps<"/profesor/grupos/[id]/cuaderno">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const actividades = db.actividades.filter((a) => a.grupoId === id);
  const ids = new Set(actividades.map((a) => a.id));
  const { t } = await textos();
  const tc = t.profesor.comun;
  const tq = t.profesor.cuaderno;
  const cuaderno = cuadernoCurso(grupo, actividades, db.entregas.filter((e) => ids.has(e.actividadId)), t.profesor.calculo.sinEtiqueta);
  const plan = grupo.planEvaluacion;
  const nf = plan ? notaFinal(cuaderno, plan) : undefined;
  const tp = tq.plan;
  // Actividades autoasignadas por los alumnos: su promedio por alumno y su peso en la nota final.
  const autoactividades = (db.autoactividades ?? []).filter((a) => a.grupoId === grupo.id);
  const peso = grupo.pesoAutoestudio ?? 0;
  const auto = Object.fromEntries(grupo.alumnos.map((al) => [al.matricula, resumenAutoestudio(autoactividades, grupo.id, al.matricula)]));
  const base = (m: string) => (nf ? (nf.porAlumno.get(m) ?? null) : (cuaderno.filas.find((f) => f.matricula === m)?.promedio ?? null));
  const finales = Object.fromEntries(grupo.alumnos.map((al) => [al.matricula, notaConAutoestudio(base(al.matricula), auto[al.matricula].promedio, peso, cuaderno.escala)]));
  const valoresFinales = Object.values(finales).filter((v): v is number => v !== null);
  const promedioFinal = valoresFinales.length ? Math.round((valoresFinales.reduce((s, v) => s + v, 0) / valoresFinales.length) * 10) / 10 : null;
  const final = nf || peso > 0 ? { porAlumno: finales, promedioGrupo: peso > 0 ? promedioFinal : (nf?.promedioGrupo ?? null) } : undefined;
  const etiquetas = [...new Set(actividades.map((a) => a.etiqueta?.trim()).filter((e): e is string => !!e))].sort((a, b) => a.localeCompare(b, "es"));
  const nombreTipo = (e: string) => e || t.profesor.calculo.sinEtiqueta;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <nav className="mb-1 flex flex-wrap gap-1 text-sm text-slate-500" aria-label={tc.ruta}>
          <Link href="/profesor" className="hover:text-tinta-700">
            {tc.panel}
          </Link>
          <span>/</span>
          <Link href={`/profesor/grupos/${grupo.id}`} className="hover:text-tinta-700">
            {grupo.materia} · {grupo.nombre}
          </Link>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{tq.titulo}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {formato(tq.resumen, {
            a: formato(actividades.length === 1 ? tc.actividad1 : tc.actividadN, { n: actividades.length }),
            b: formato(grupo.alumnos.length === 1 ? tc.alumno1 : tc.alumnoN, { n: grupo.alumnos.length }),
            e: cuaderno.escala,
          })}
        </p>
        </div>
        <div className="shrink-0">
          <PlanEvaluacionCurso grupoId={grupo.id} plan={plan} etiquetas={etiquetas} />
        </div>
      </div>
      {plan && nf && (
        <div className="mb-4 rounded-xl bg-tinta-50 px-4 py-3 text-sm text-tinta-900 ring-1 ring-tinta-100">
          <p>
            <span className="font-semibold">{tp.titulo}:</span> {plan.pesos.map((p) => `${nombreTipo(p.etiqueta)} ${p.porcentaje} %`).join(" · ")}
          </p>
          {nf.sinCalificar.length > 0 && (
            <p className="mt-1 text-xs text-tinta-800">
              {formato(tp.parcial, { n: nf.ponderacionActual, tipos: nf.sinCalificar.map(nombreTipo).join(", ") })}
            </p>
          )}
        </div>
      )}
      {grupo.alumnos.length === 0 || actividades.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">
          {tq.vacio}
        </Tarjeta>
      ) : (
        <TablaCuaderno
          cuaderno={cuaderno}
          info={{ materia: grupo.materia, grupo: grupo.nombre, ciclo: grupo.ciclo }}
          plan={plan}
          final={final}
          autoestudio={{
            grupoId: grupo.id,
            peso,
            porAlumno: Object.fromEntries(Object.entries(auto).map(([m, r]) => [m, { promedio: r.promedio, total: r.total, alertas: r.alertas }])),
          }}
        />
      )}
    </>
  );
}

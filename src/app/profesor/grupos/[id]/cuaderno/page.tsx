import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TablaCuaderno } from "@/components/tabla-cuaderno";
import { Tarjeta } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { cuadernoCurso } from "@/lib/cuaderno";
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

  return (
    <>
      <div className="mb-6">
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
      {grupo.alumnos.length === 0 || actividades.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">
          {tq.vacio}
        </Tarjeta>
      ) : (
        <TablaCuaderno cuaderno={cuaderno} info={{ materia: grupo.materia, grupo: grupo.nombre, ciclo: grupo.ciclo }} />
      )}
    </>
  );
}

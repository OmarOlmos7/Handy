import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TablaCuaderno } from "@/components/tabla-cuaderno";
import { Tarjeta } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { cuadernoCurso } from "@/lib/cuaderno";
import { datosProfesor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Cuaderno de calificaciones" };

/** Bitácora de calificaciones del curso: ver resultados y corregir notas. */
export default async function CuadernoCurso({ params }: PageProps<"/profesor/grupos/[id]/cuaderno">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const actividades = db.actividades.filter((a) => a.grupoId === id);
  const ids = new Set(actividades.map((a) => a.id));
  const cuaderno = cuadernoCurso(grupo, actividades, db.entregas.filter((e) => ids.has(e.actividadId)));

  return (
    <>
      <div className="mb-6">
        <nav className="mb-1 flex flex-wrap gap-1 text-sm text-slate-500" aria-label="Ruta">
          <Link href="/profesor" className="hover:text-tinta-700">
            Panel
          </Link>
          <span>/</span>
          <Link href={`/profesor/grupos/${grupo.id}`} className="hover:text-tinta-700">
            {grupo.materia} · {grupo.nombre}
          </Link>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Cuaderno de calificaciones</h1>
        <p className="mt-1 text-sm text-slate-600">
          {actividades.length} {actividades.length === 1 ? "actividad" : "actividades"} · {grupo.alumnos.length}{" "}
          {grupo.alumnos.length === 1 ? "alumno" : "alumnos"} · Cada actividad en su escala; el promedio del alumno va sobre{" "}
          {cuaderno.escala}.
        </p>
      </div>
      {grupo.alumnos.length === 0 || actividades.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">
          El cuaderno se llena en cuanto el curso tenga alumnos y actividades.
        </Tarjeta>
      ) : (
        <TablaCuaderno cuaderno={cuaderno} />
      )}
    </>
  );
}

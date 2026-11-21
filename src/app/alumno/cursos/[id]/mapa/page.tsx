import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { MapaTemario } from "@/components/mapa-temario";
import { Encabezado, Tarjeta } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { calificacion, escalaDe } from "@/lib/estadisticas";
import { textos } from "@/lib/i18n/servidor";
import { aPorcentaje, avanceTemario, relacionesValidas } from "@/lib/mapa-temario";
import { actividadesVisibles } from "@/lib/portal-alumno";
import { resultadosDisponibles } from "@/lib/resultados";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.alumno.cursos.mapa };
}

/**
 * Mapa del temario para el alumno: su propio avance por tema (solo calificaciones ya liberadas)
 * y la ruta de estudio que arma eligiendo temas.
 */
export default async function MapaCursoAlumno({ params }: PageProps<"/alumno/cursos/[id]/mapa">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo, alumno: enCurso } = curso;
  const { t } = await textos();
  const tc = t.alumno.cursos;
  const db = await leer();
  const asignatura = asignaturaDelCurso(db, grupo);
  const migas = [
    { texto: t.alumno.panel.titulo, href: "/alumno" },
    { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/alumno/cursos/${grupo.id}` },
  ];

  if (!asignatura || asignatura.unidades.length === 0) {
    return (
      <>
        <Encabezado migas={migas} rutaEtiqueta={t.profesor.comun.ruta} titulo={tc.mapa} />
        <Tarjeta className="text-sm text-slate-600">{tc.sinMapa}</Tarjeta>
      </>
    );
  }

  const ahora = new Date();
  const actividades = actividadesVisibles(db.actividades, grupo.id, ahora).filter((a) => a.temario?.asignaturaId === asignatura.id);
  const porId = new Map(actividades.map((a) => [a.id, a]));
  const avance = avanceTemario(asignatura, actividades, (actId) => {
    const act = porId.get(actId)!;
    const entrega = db.entregas.find((e) => e.actividadId === actId && e.matricula === enCurso.matricula);
    if (!entrega) return { porcentaje: null, entregada: false };
    const liberada = entrega.estado === "aprobada" && resultadosDisponibles(act, ahora);
    return { porcentaje: liberada ? aPorcentaje(calificacion(act, entrega), escalaDe(act)) : null, entregada: true };
  });
  const ruta = db.rutas?.find((r) => r.alumnoId === alumno.id && r.asignaturaId === asignatura.id)?.nodos ?? [];

  return (
    <>
      <Encabezado migas={migas} rutaEtiqueta={t.profesor.comun.ruta} titulo={`${tc.mapa} · ${asignatura.nombre}`} />
      <MapaTemario
        asignatura={{ id: asignatura.id, nombre: asignatura.nombre, unidades: asignatura.unidades }}
        relaciones={relacionesValidas(asignatura)}
        avance={avance}
        modo="alumno"
        enlaceActividad="/alumno/reporte/"
        rutaInicial={ruta}
        grupoId={grupo.id}
      />
    </>
  );
}

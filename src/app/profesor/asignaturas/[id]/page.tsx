import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorTemario } from "@/components/editor-temario";
import { MapaTemario } from "@/components/mapa-temario";
import { Encabezado } from "@/components/ui";
import { resumenTemario } from "@/lib/asignaturas";
import { calificacion, escalaDe } from "@/lib/estadisticas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { avanceTemario, porcentajeGrupo, relacionesValidas } from "@/lib/mapa-temario";
import { datosProfesor } from "@/lib/sesion";

/** Asignatura del profesor: el temario en tabla (editable) o como mapa con el avance de sus cursos. */
export default async function PaginaAsignatura({ params, searchParams }: PageProps<"/profesor/asignaturas/[id]">) {
  const { id } = await params;
  const q = await searchParams;
  const vista = q.vista === "mapa" ? "mapa" : "tabla";
  const { db } = await datosProfesor();
  const asignatura = db.asignaturas?.find((a) => a.id === id);
  if (!asignatura) notFound();
  const { t } = await textos();
  const ta = t.profesor.asignaturas;
  const r = resumenTemario(asignatura.unidades);

  // Avance: actividades del profesor ligadas a esta asignatura, con el promedio de cada curso.
  const conTemario = db.actividades.filter((a) => a.temario?.asignaturaId === asignatura.id);
  const cursos = db.grupos.filter((g) => conTemario.some((a) => a.grupoId === g.id));
  const curso = typeof q.curso === "string" ? cursos.find((g) => g.id === q.curso) : undefined;
  const actividades = curso ? conTemario.filter((a) => a.grupoId === curso.id) : conTemario;
  const porId = new Map(actividades.map((a) => [a.id, a]));
  const avance =
    vista === "mapa"
      ? avanceTemario(asignatura, actividades, (actId) => {
          const act = porId.get(actId)!;
          const entregas = db.entregas.filter((e) => e.actividadId === actId);
          return { porcentaje: porcentajeGrupo(entregas, (e) => calificacion(act, e), escalaDe(act)) };
        })
      : {};

  const base = `/profesor/asignaturas/${asignatura.id}`;
  const pestana = (activa: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium ${activa ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`;
  const enlaceCurso = (g?: string) => `${base}?vista=mapa${g ? `&curso=${g}` : ""}`;

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: ta.titulo, href: "/profesor/asignaturas" },
        ]}
        titulo={asignatura.nombre}
        subtitulo={`${asignatura.nivel ? `${asignatura.nivel} · ` : ""}${formato(ta.resumen, { u: r.unidades, t: r.temas, s: r.subtemas })}. ${vista === "tabla" ? ta.editarAyuda : ""}`}
        acciones={
          <nav className="inline-flex rounded-lg bg-slate-100 p-1" aria-label={t.profesor.mapa.capas}>
            <Link href={base} className={pestana(vista === "tabla")} aria-current={vista === "tabla" ? "page" : undefined}>
              {ta.vistaTabla}
            </Link>
            <Link href={`${base}?vista=mapa`} className={pestana(vista === "mapa")} aria-current={vista === "mapa" ? "page" : undefined}>
              {ta.vistaMapa}
            </Link>
          </nav>
        }
      />
      {vista === "tabla" ? (
        <div className="mx-auto max-w-4xl">
          <EditorTemario key={asignatura.id} asignatura={asignatura} />
        </div>
      ) : (
        <div className="space-y-3">
          {cursos.length > 1 && (
            <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label={ta.cursoAvance}>
              <span className="mr-1 text-slate-500">{ta.cursoAvance}</span>
              <Link href={enlaceCurso()} className={`rounded-full px-3 py-1 ring-1 ${!curso ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-700 ring-slate-200"}`}>
                {ta.todosLosCursos}
              </Link>
              {cursos.map((g) => (
                <Link
                  key={g.id}
                  href={enlaceCurso(g.id)}
                  className={`rounded-full px-3 py-1 ring-1 ${curso?.id === g.id ? "bg-slate-800 text-white ring-slate-800" : "bg-white text-slate-700 ring-slate-200"}`}
                >
                  {g.nombre}
                </Link>
              ))}
            </nav>
          )}
          <MapaTemario
            key={asignatura.id}
            asignatura={asignatura}
            relaciones={relacionesValidas(asignatura)}
            relacionesIA={Boolean(asignatura.relaciones?.length)}
            avance={avance}
            modo="profesor"
            enlaceActividad="/profesor/actividades/"
          />
        </div>
      )}
    </>
  );
}

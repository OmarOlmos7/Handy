import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListaAvisos, NuevoAviso } from "@/components/avisos";
import { Encabezado } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { avisosDelGrupo, equiposDelGrupo, sinLeerProfesor } from "@/lib/avisos";
import { vistaProfesor } from "@/lib/avisos-vista";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.avisos.meta };
}

/** Avisos del curso: el profesor escribe al grupo, a un equipo o a alumnos y ve quién los leyó. */
export default async function AvisosCursoProfesor({ params }: PageProps<"/profesor/grupos/[id]/avisos">) {
  const { id } = await params;
  const { db, profesor } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t, locale } = await textos();
  const ta = t.avisos;
  const tc = t.profesor.comun;
  const todos = avisosDelGrupo(db.avisos ?? [], grupo.id);
  const avisos = todos.map((a) => vistaProfesor(a, { grupo, todos, nombreProfesor: profesor.nombre, locale }));
  const sinLeer = sinLeerProfesor(todos, grupo.id);
  const alumnos = [...grupo.alumnos].sort((a, b) => a.nombre.localeCompare(b.nombre, locale)).map((a) => ({ matricula: a.matricula, nombre: a.nombre }));
  const equipos = equiposDelGrupo(db, grupo.id).map((e) => ({ valor: `equipo:${e.proyectoId}:${e.equipoId}`, nombre: e.nombre, proyecto: e.proyecto, n: e.matriculas.length }));

  return (
    <>
      <Encabezado
        migas={[
          { texto: tc.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
        ]}
        rutaEtiqueta={tc.ruta}
        titulo={`${ta.titulo} · ${grupo.materia} · ${grupo.nombre}`}
        subtitulo={sinLeer ? `${formato(ta.sinLeerN, { n: sinLeer })} · ${ta.subtituloProfesor}` : ta.subtituloProfesor}
      />
      <div className="space-y-6">
        <NuevoAviso grupoId={grupo.id} opciones={{ alumnos, equipos }} />
        <ListaAvisos avisos={avisos} vacio={ta.vacio} />
      </div>
    </>
  );
}

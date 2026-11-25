import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdministrarAlumnos } from "@/components/administrar-alumnos";
import { Encabezado } from "@/components/ui";
import { grupoDe, leer } from "@/lib/almacen";
import { filasAlumnos } from "@/lib/alumnos-grupo";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.alumnosGrupo.meta };
}

/** Lista de alumnos del curso: altas, cambios de datos y bajas. */
export default async function AlumnosCurso({ params }: PageProps<"/profesor/grupos/[id]/alumnos">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t, locale } = await textos();
  const tc = t.profesor.comun;
  const ta = t.alumnosGrupo;
  // Solo los correos con cuenta, para marcar quién ya puede ver sus resultados.
  const correosConCuenta = new Set((await leer()).cuentasAlumno.map((c) => c.correo));
  const n = grupo.alumnos.length;

  return (
    <>
      <Encabezado
        migas={[
          { texto: tc.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
        ]}
        titulo={`${ta.titulo} · ${grupo.materia} · ${grupo.nombre}`}
        subtitulo={`${formato(n === 1 ? tc.alumno1 : tc.alumnoN, { n })} · ${ta.subtitulo}`}
      />
      <AdministrarAlumnos grupoId={grupo.id} alumnos={filasAlumnos(db, grupo, correosConCuenta, locale)} />
    </>
  );
}

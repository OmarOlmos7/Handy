import { Encabezado } from "@/components/ui";
import { NuevaAsignatura } from "@/components/nueva-asignatura";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";

export default async function PaginaNuevaAsignatura({ searchParams }: PageProps<"/profesor/asignaturas/nueva">) {
  const { t } = await textos();
  const ta = t.profesor.asignaturas;
  const { nombre, curso } = await searchParams;
  // Viene de "Nuevo curso" o del lápiz de la tarjeta: la asignatura se enlaza a ese curso.
  const { db } = await datosProfesor();
  const grupo = typeof curso === "string" ? db.grupos.find((g) => g.id === curso) : undefined;
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: ta.titulo, href: "/profesor/asignaturas" },
        ]}
        titulo={ta.nueva}
        subtitulo={ta.subtitulo}
      />
      {grupo && (
        <p className="mx-auto mb-4 max-w-3xl rounded-lg bg-tinta-50 px-4 py-2 text-sm text-tinta-800 ring-1 ring-tinta-100">
          🔗 {formato(t.profesor.nuevoCurso.seEnlazara, { curso: `${grupo.materia} · ${grupo.nombre}` })}
        </p>
      )}
      <NuevaAsignatura nombreInicial={typeof nombre === "string" ? nombre.slice(0, 120) : ""} cursoId={grupo?.id} />
    </>
  );
}

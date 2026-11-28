import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PruebaStroop } from "@/components/prueba-stroop";
import { Encabezado, Tarjeta } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { perfilActivo } from "@/lib/banderas";
import { alumnoEnGrupo } from "@/lib/cuentas";
import { textos } from "@/lib/i18n/servidor";
import { tieneConsentimiento } from "@/lib/perfil/consentimiento";
import { finesDeCursos } from "@/lib/perfil/diagnostico-inicial";
import { momentoPendiente } from "@/lib/perfil/stroop";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.stroop.titulo };
}

/** Prueba de Stroop del semestre (inicio o cierre), desde el perfil de un curso. */
export default async function StroopCurso({ params }: PageProps<"/alumno/cursos/[id]/perfil/stroop">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  if (!perfilActivo()) notFound();
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo } = curso;
  const { t } = await textos();
  const ts = t.perfil.stroop;
  const db = await leer();
  const base = `/alumno/cursos/${grupo.id}/perfil`;
  if (!tieneConsentimiento(db.consentimientosPerfil, alumno.id)) redirect(base);
  const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
  const fines = cuenta ? finesDeCursos(db.grupos.filter((g) => alumnoEnGrupo(g, cuenta))) : [];
  const momento = momentoPendiente(db.stroop, alumno.id, new Date(), fines);
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/alumno/cursos/${grupo.id}` },
          { texto: t.perfil.titulo, href: base },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={momento ? `${ts.titulo} · ${ts.momento[momento]}` : ts.titulo}
      />
      <div className="mx-auto max-w-2xl">
        <Tarjeta>
          <PruebaStroop grupoId={grupo.id} volver={base} pendiente={Boolean(momento)} />
        </Tarjeta>
      </div>
    </>
  );
}

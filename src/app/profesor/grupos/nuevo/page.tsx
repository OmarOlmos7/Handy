import type { Metadata } from "next";
import { crearGrupo } from "@/app/acciones";
import { Boton, Encabezado, campo } from "@/components/ui";
import { datosProfesor } from "@/lib/sesion";
import { CamposNuevoCurso } from "@/components/asignatura-curso";
import { textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.nuevoCurso.titulo };
}

export default async function NuevoGrupo() {
  const { db } = await datosProfesor();
  const { t } = await textos();
  const c = t.profesor.comun;
  const tn = t.profesor.nuevoCurso;
  return (
    <>
      <Encabezado titulo={tn.titulo} subtitulo={tn.subtitulo} migas={[{ texto: c.panel, href: "/profesor" }]} rutaEtiqueta={c.ruta} />
      <form action={crearGrupo} className="mx-auto max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <CamposNuevoCurso
          asignaturas={(db.asignaturas ?? []).map((a) => ({ id: a.id, nombre: a.nombre, nivel: a.nivel }))}
          ejemploMateria={tn.ejemploMateria}
          ejemploGrupo={tn.ejemploGrupo}
        />
        <label className="block text-sm font-medium text-slate-700">
          {tn.alumnosOpcional}
          <textarea
            name="alumnos"
            rows={10}
            className={`${campo} font-mono`}
            placeholder={"A0301, Ana López Ruiz, ana@escuela.mx\nA0302, Bruno Díaz Soto"}
          />
        </label>
        <p className="text-xs text-slate-500">
          {tn.ayuda}
        </p>
        <div className="flex justify-end">
          <Boton type="submit">{tn.crear}</Boton>
        </div>
      </form>
    </>
  );
}

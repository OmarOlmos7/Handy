import type { Metadata } from "next";
import { crearGrupo } from "@/app/acciones";
import { Boton, Encabezado, campo } from "@/components/ui";
import { requerirProfesor } from "@/lib/sesion";
import { textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.nuevoCurso.titulo };
}

export default async function NuevoGrupo() {
  await requerirProfesor();
  const { t } = await textos();
  const c = t.profesor.comun;
  const tn = t.profesor.nuevoCurso;
  return (
    <>
      <Encabezado titulo={tn.titulo} subtitulo={tn.subtitulo} migas={[{ texto: c.panel, href: "/profesor" }]} rutaEtiqueta={c.ruta} />
      <form action={crearGrupo} className="mx-auto max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            {c.materia}
            <input name="materia" required className={campo} placeholder={tn.ejemploMateria} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {c.grupo}
            <input name="nombre" required className={campo} placeholder={tn.ejemploGrupo} />
          </label>
        </div>
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

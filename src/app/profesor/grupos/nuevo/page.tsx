import type { Metadata } from "next";
import { crearGrupo } from "@/app/acciones";
import { campo } from "@/components/nueva-actividad";
import { Boton, Encabezado } from "@/components/ui";

export const metadata: Metadata = { title: "Nuevo grupo" };

export default function NuevoGrupo() {
  return (
    <>
      <Encabezado titulo="Nuevo grupo" subtitulo="Registra la materia y la lista de alumnos." migas={[{ texto: "Panel", href: "/profesor" }]} />
      <form action={crearGrupo} className="mx-auto max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Materia
            <input name="materia" required className={campo} placeholder="Ej. Física" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Grupo
            <input name="nombre" required className={campo} placeholder="Ej. 3° B" />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Alumnos
          <textarea
            name="alumnos"
            required
            rows={10}
            className={`${campo} font-mono`}
            placeholder={"A0301, Ana López Ruiz, ana@escuela.mx\nA0302, Bruno Díaz Soto"}
          />
        </label>
        <p className="text-xs text-slate-500">
          Una línea por alumno: matrícula, nombre completo y correo (opcional). Puedes pegar directo desde Excel.
        </p>
        <div className="flex justify-end">
          <Boton type="submit">Guardar grupo</Boton>
        </div>
      </form>
    </>
  );
}

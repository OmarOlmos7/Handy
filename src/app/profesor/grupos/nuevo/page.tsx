import type { Metadata } from "next";
import { crearGrupo } from "@/app/acciones";
import { Boton, Encabezado, campo } from "@/components/ui";
import { requerirProfesor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Nuevo curso" };

export default async function NuevoGrupo() {
  await requerirProfesor();
  return (
    <>
      <Encabezado titulo="Nuevo curso" subtitulo="Registra la materia y el grupo. Tus alumnos se suman solos al entregar su primera actividad con su correo y clave de acceso." migas={[{ texto: "Panel", href: "/profesor" }]} />
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
          Alumnos (opcional)
          <textarea
            name="alumnos"
            rows={10}
            className={`${campo} font-mono`}
            placeholder={"A0301, Ana López Ruiz, ana@escuela.mx\nA0302, Bruno Díaz Soto"}
          />
        </label>
        <p className="text-xs text-slate-500">
          Una línea por alumno: matrícula, nombre completo y correo (opcional). Puedes pegar directo desde Excel. Si la dejas vacía, cada alumno se registra solo al entregar su primera actividad. Si pones su correo, el alumno ve sus resultados al crear su cuenta con ese mismo correo.
        </p>
        <div className="flex justify-end">
          <Boton type="submit">Crear curso</Boton>
        </div>
      </form>
    </>
  );
}

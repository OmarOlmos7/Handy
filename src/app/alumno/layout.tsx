import { salirAlumno } from "@/app/acciones-cuenta";
import { BarraApp } from "@/components/barra-app";
import { alumnoActual } from "@/lib/sesion";

export default async function LayoutAlumno({ children }: LayoutProps<"/alumno">) {
  const alumno = await alumnoActual();
  return (
    <>
      <BarraApp
        enlaces={[{ href: "/alumno", texto: "Mis actividades", exacto: true }]}
        usuario={alumno ? { nombre: alumno.nombre, rol: alumno.correo } : { nombre: "Alumno", rol: "Sin sesión" }}
        extra={
          alumno && (
            <form action={salirAlumno}>
              <button type="submit" className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                Salir
              </button>
            </form>
          )
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}

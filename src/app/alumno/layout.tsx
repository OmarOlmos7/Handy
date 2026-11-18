import { salirAlumno } from "@/app/acciones-cuenta";
import { BarraApp } from "@/components/barra-app";
import { textos } from "@/lib/i18n/servidor";
import { alumnoActual } from "@/lib/sesion";

export default async function LayoutAlumno({ children }: LayoutProps<"/alumno">) {
  const alumno = await alumnoActual();
  const { idioma, t } = await textos();
  return (
    <>
      <BarraApp
        enlaces={[{ href: "/alumno", texto: t.barra.misActividades, exacto: true }]}
        usuario={alumno ? { nombre: alumno.nombre, rol: alumno.correo } : { nombre: t.barra.alumno, rol: t.barra.sinSesion }}
        idioma={{ actual: idioma, etiqueta: t.comun.idioma }}
        extra={
          alumno && (
            <form action={salirAlumno}>
              <button type="submit" className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                {t.comun.salir}
              </button>
            </form>
          )
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}

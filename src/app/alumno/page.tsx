import type { Metadata } from "next";
import { InstalarApp } from "@/components/instalar-app";
import { Encabezado, colorCalificacion } from "@/components/ui";
import { num } from "@/components/tablero";
import { TarjetaCursoAlumno } from "@/components/tarjeta-curso-alumno";
import { agruparPorColor } from "@/lib/colores";
import { resumenCursoAlumno } from "@/lib/portal-alumno";
import { FormIngresoAlumno, FormRegistroAlumno } from "@/components/formularios-alumno";
import { SelectorPerfil } from "@/components/selector-perfil";
import { leer } from "@/lib/almacen";
import { textosInstalar } from "@/lib/i18n/cuenta";
import { textos } from "@/lib/i18n/servidor";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.alumno.panel.titulo };
}

export default async function PanelAlumno({ searchParams }: PageProps<"/alumno">) {
  const alumno = await alumnoActual();
  const { t } = await textos();
  const tp = t.alumno.panel;
  if (!alumno) {
    const { error, crear } = await searchParams;
    const creando = crear === "1";
    return (
      <div className="mx-auto max-w-md">
        <Encabezado
          titulo={tp.titulo}
          subtitulo={creando ? tp.subtituloCrear : tp.subtituloEntrar}
        />
        <SelectorPerfil actual="alumno" hrefProfesor="/ingresar" hrefAlumno="/alumno" t={t} />
        {creando ? (
          <FormRegistroAlumno t={t} error={typeof error === "string" ? error : undefined} />
        ) : (
          <FormIngresoAlumno t={t} error={typeof error === "string" ? error : undefined} />
        )}
        <InstalarApp textos={textosInstalar(t)} />
        <p className="mt-4 text-sm text-slate-500">{tp.comoEntregar}</p>
      </div>
    );
  }

  const db = await leer();
  const ahora = new Date();
  const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
  const tc = t.alumno.cursos;
  const tarjetas = alumno.cursos.map(({ grupo, alumno: enCurso }) => ({
    grupo,
    // El color que eligió el alumno; si no eligió, el que puso el profesor.
    color: cuenta?.colores?.[grupo.id] ?? grupo.color,
    resumen: resumenCursoAlumno(grupo, db.actividades, db.entregas, enCurso.matricula, ahora),
  }));
  return (
    <>
      <Encabezado
        titulo={tp.titulo}
        subtitulo={`${alumno.nombre} · ${alumno.correo}. ${tp.subtituloSesion}`}
      />
      {tarjetas.length === 0 ? (
        <p className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{tp.sinActividades}</p>
      ) : (
        <>
          <h2 className="mb-3 text-lg font-semibold">{tc.misCursos}</h2>
          <div className="space-y-6">
            {agruparPorColor(tarjetas).map(({ color, items }, _i, todos) => (
              <section key={color?.clave ?? "sin-color"}>
                {/* Con un solo grupo sin color no hace falta encabezado. */}
                {(todos.length > 1 || color) && (
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <span className={`h-3 w-3 rounded-full ${color ? color.punto : "border-2 border-dashed border-slate-400"}`} />
                    {color ? t.profesor.comun.nombresColores[color.clave as keyof typeof t.profesor.comun.nombresColores] : t.profesor.comun.sinColor}
                  </h3>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map(({ grupo, color: c, resumen }) => (
                    <TarjetaCursoAlumno
                      key={grupo.id}
                      id={grupo.id}
                      materia={grupo.materia}
                      nombre={grupo.nombre}
                      ciclo={grupo.ciclo}
                      color={c}
                      actividades={resumen.actividades}
                      porEntregar={resumen.porEntregar}
                      promedio={resumen.promedio === null ? undefined : num(resumen.promedio)}
                      colorPromedio={resumen.promedio === null ? undefined : colorCalificacion(resumen.promedio, 100)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}

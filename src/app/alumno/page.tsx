import type { Metadata } from "next";
import { CompaneroDelAlumno } from "@/components/companero-servidor";
import { InstalarApp } from "@/components/instalar-app";
import { BotonLink, Encabezado, colorCalificacion } from "@/components/ui";
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
  const tl = t.licencias.alumno;
  const ta = t.archivados;
  // Los cursos que el alumno quitó con el bote ya no se muestran (vuelven si ingresa su código).
  const quitados = new Set(cuenta?.quitados ?? []);
  const porActivar = alumno.porActivar.filter(({ grupo }) => !quitados.has(grupo.id));
  const todas = alumno.cursos.filter(({ grupo }) => !quitados.has(grupo.id)).map(({ grupo, alumno: enCurso }) => ({
    grupo,
    // El color que eligió el alumno; si no eligió, el que puso el profesor.
    color: cuenta?.colores?.[grupo.id] ?? grupo.color,
    resumen: resumenCursoAlumno(grupo, db.actividades, db.entregas, enCurso.matricula, ahora),
  }));
  // Los que el alumno archivó salen de la vista principal y van a la sección plegable de abajo.
  const archivados = cuenta?.archivados ?? {};
  const tarjetas = todas.filter((x) => !archivados[x.grupo.id]);
  const tarjetasArchivadas = todas.filter((x) => archivados[x.grupo.id]);
  return (
    <>
      <Encabezado
        titulo={tp.titulo}
        subtitulo={`${alumno.nombre} · ${alumno.correo}. ${tp.subtituloSesion}`}
      />
      <CompaneroDelAlumno db={db} alumno={alumno} />
      {porActivar.length > 0 && (
        <section className="mb-6 rounded-xl border border-aviso/30 bg-aviso-suave p-5" aria-labelledby="por-activar">
          <h2 id="por-activar" className="font-semibold text-slate-900">
            {tl.porActivarTitulo}
          </h2>
          <p className="mt-1 text-sm text-slate-700">{tl.porActivarTexto}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {porActivar.map(({ grupo }) => (
              <li key={grupo.id}>
                <BotonLink href={`/alumno/licencias?codigo=${encodeURIComponent(grupo.codigo ?? "")}`}>
                  {tl.activar}: {grupo.materia} · {grupo.nombre}
                </BotonLink>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mb-6 text-sm">
        <BotonLink href="/alumno/licencias" variante="secundario">
          {tl.unirme}
        </BotonLink>
      </p>
      {tarjetas.length === 0 && tarjetasArchivadas.length === 0 ? (
        <p className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{tp.sinActividades}</p>
      ) : (
        <>
          {tarjetas.length > 0 && <h2 className="mb-3 text-lg font-semibold">{tc.misCursos}</h2>}
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
          {tarjetasArchivadas.length > 0 && (
            <details id="archivados" className="group mt-8 overflow-visible rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-5 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="text-slate-400 transition group-open:rotate-90">▸</span>
                <span className="text-xl" aria-hidden>
                  🗄️
                </span>
                <h2 className="text-base font-semibold text-slate-900">{ta.alumno.titulo}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{tarjetasArchivadas.length}</span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                <p className="mb-3 text-sm text-slate-500">{ta.alumno.texto}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tarjetasArchivadas.map(({ grupo, color: c, resumen }) => (
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
                      archivado
                    />
                  ))}
                </div>
              </div>
            </details>
          )}
        </>
      )}
    </>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { guardarCuentaAlumno } from "@/app/acciones-alumno";
import { num } from "@/components/tablero";
import { TarjetaCursoAlumno } from "@/components/tarjeta-curso-alumno";
import { Boton, Encabezado, Tarjeta, campo, colorCalificacion } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { LARGO_MINIMO_CLAVE } from "@/lib/cuentas-alumno";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { resumenCursoAlumno } from "@/lib/portal-alumno";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.ajustesAlumno.meta };
}

/** Ajustes del alumno (engrane): nombre, cambio de clave de acceso y cursos archivados. */
export default async function AjustesAlumno({ searchParams }: PageProps<"/alumno/configuracion">) {
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const { t } = await textos();
  const a = t.ajustesAlumno;
  const ta = t.archivados;
  const db = await leer();
  const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
  const ahora = new Date();
  const archivados = cuenta?.archivados ?? {};
  const tarjetas = alumno.cursos
    .filter(({ grupo }) => archivados[grupo.id])
    .map(({ grupo, alumno: enCurso }) => ({
      grupo,
      color: cuenta?.colores?.[grupo.id] ?? grupo.color,
      resumen: resumenCursoAlumno(grupo, db.actividades, db.entregas, enCurso.matricula, ahora),
    }));

  const q = await searchParams;
  const ok = typeof q.ok === "string" ? q.ok : undefined;
  const error = typeof q.error === "string" ? q.error : undefined;
  const avisos = a.avisos as Record<string, string>;
  const aviso = (k: string) => formato(avisos[k] ?? k, { n: LARGO_MINIMO_CLAVE });

  return (
    <>
      <Encabezado titulo={a.titulo} subtitulo={a.subtitulo} migas={[{ texto: t.barra.misActividades, href: "/alumno" }]} />
      <div className="space-y-6">
        <Tarjeta>
          <h2 id="cuenta" className="scroll-mt-6 text-lg font-semibold">
            {a.cuentaTitulo}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{formato(a.correo, { correo: alumno.correo, matricula: alumno.matricula })}</p>
          <form action={guardarCuentaAlumno} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2 sm:max-w-md">
              {a.nombre}
              <input name="nombre" required minLength={3} maxLength={120} defaultValue={alumno.nombre} autoComplete="name" className={campo} />
              <span className="mt-1 block text-xs font-normal text-slate-500">{a.notaNombre}</span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {a.claveActual}
              <input name="actual" type="password" autoComplete="current-password" className={campo} />
            </label>
            <span className="hidden sm:block" />
            <label className="block text-sm font-medium text-slate-700">
              {a.claveNueva}
              <input name="nueva" type="password" minLength={LARGO_MINIMO_CLAVE} autoComplete="new-password" className={campo} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {a.claveConfirmar}
              <input name="confirmar" type="password" minLength={LARGO_MINIMO_CLAVE} autoComplete="new-password" className={campo} />
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Boton type="submit">{a.guardar}</Boton>
              <span className="text-xs text-slate-500">{formato(a.notaClave, { n: LARGO_MINIMO_CLAVE })}</span>
            </div>
          </form>
          {error && <p className="mt-4 rounded-lg bg-error-suave p-3 text-sm text-error">{aviso(error)}</p>}
          {ok && (
            <p className="mt-4 rounded-lg bg-acierto-suave p-3 text-sm text-acierto" role="status">
              {aviso(ok)}
            </p>
          )}
        </Tarjeta>

        <Tarjeta>
          <details id="archivados" open className="group scroll-mt-6">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="text-slate-400 transition group-open:rotate-90">▸</span>
              <h2 className="text-lg font-semibold">🗄️ {ta.alumno.titulo}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{tarjetas.length}</span>
            </summary>
            <p className="mt-2 text-sm text-slate-500">{ta.alumno.texto}</p>
            {tarjetas.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">{a.archivadosNinguno}</p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tarjetas.map(({ grupo, color, resumen }) => (
                  <TarjetaCursoAlumno
                    key={grupo.id}
                    id={grupo.id}
                    materia={grupo.materia}
                    nombre={grupo.nombre}
                    ciclo={grupo.ciclo}
                    color={color}
                    actividades={resumen.actividades}
                    porEntregar={resumen.porEntregar}
                    promedio={resumen.promedio === null ? undefined : num(resumen.promedio)}
                    colorPromedio={resumen.promedio === null ? undefined : colorCalificacion(resumen.promedio, 100)}
                    archivado
                  />
                ))}
              </div>
            )}
          </details>
        </Tarjeta>
      </div>
    </>
  );
}

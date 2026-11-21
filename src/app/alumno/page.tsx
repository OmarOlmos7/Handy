import type { Metadata } from "next";
import Link from "next/link";
import { ingresarAlumno, registrarAlumno } from "@/app/acciones-cuenta";
import { AceptarAvisos } from "@/components/aceptar-avisos";
import { datosResponsable } from "@/lib/legal/documentos";
import { InstalarApp } from "@/components/instalar-app";
import { Boton, Encabezado, Insignia, campo, colorCalificacion, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { calificacion, escalaDe, formatoCal } from "@/lib/estadisticas";
import { conPuntaje } from "@/lib/modalidad";
import { errorAlumno } from "@/lib/i18n/alumno";
import { textosInstalar } from "@/lib/i18n/cuenta";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { fechaHoraLarga, resultadosDisponibles } from "@/lib/resultados";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.alumno.panel.titulo };
}

export default async function PanelAlumno({ searchParams }: PageProps<"/alumno">) {
  const alumno = await alumnoActual();
  const { t, locale } = await textos();
  const tp = t.alumno.panel;
  const tc = t.alumno.campos;
  if (!alumno) {
    const { error, crear } = await searchParams;
    const creando = crear === "1";
    return (
      <div className="mx-auto max-w-md">
        <Encabezado
          titulo={tp.titulo}
          subtitulo={creando ? tp.subtituloCrear : tp.subtituloEntrar}
        />
        {creando ? (
          <form action={registrarAlumno} className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <label className="block text-sm font-medium text-slate-700">
              {tc.nombre}
              <input name="nombre" required autoComplete="name" className={campo} placeholder={tc.nombreEjemplo} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {tc.matricula}
              <input name="matricula" required className={`${campo} font-mono uppercase`} placeholder={tc.matriculaEjemplo} autoCapitalize="characters" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {tc.correo}
              <input name="correo" type="email" required autoComplete="email" className={campo} placeholder={tc.correoEjemplo} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {tc.claveNueva}
              <input name="clave" type="password" required minLength={6} autoComplete="new-password" className={campo} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {tc.repiteClave}
              <input name="clave2" type="password" required minLength={6} autoComplete="new-password" className={campo} />
            </label>
            <AceptarAvisos t={t.legal} tipo="alumno" correo={datosResponsable(process.env).correo} />
            {typeof error === "string" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{errorAlumno(t, error)}</p>}
            <Boton type="submit" className="w-full">
              {tp.crearCuenta}
            </Boton>
            <p className="text-center text-sm text-slate-600">
              {tp.yaTienesCuenta}{" "}
              <Link href="/alumno" className="font-medium text-tinta-700 hover:underline">
                {tp.entraAqui}
              </Link>
            </p>
          </form>
        ) : (
          <form action={ingresarAlumno} className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <label className="block text-sm font-medium text-slate-700">
              {tc.correo}
              <input name="correo" type="email" required autoComplete="email" className={campo} placeholder={tc.correoEjemplo} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {tc.clave}
              <input name="clave" type="password" required autoComplete="current-password" className={campo} />
              <Link href="/recuperar?tipo=alumno" className="mt-1 inline-block text-xs font-medium text-tinta-700 hover:underline">
                {t.recuperar.olvideAlumno}
              </Link>
            </label>
            {typeof error === "string" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{errorAlumno(t, error)}</p>}
            <Boton type="submit" className="w-full">
              {tp.verResultados}
            </Boton>
            <p className="text-center text-sm text-slate-600">
              {tp.primeraVez}{" "}
              <Link href="/alumno?crear=1" className="font-medium text-tinta-700 hover:underline">
                {tp.creaTuCuenta}
              </Link>
            </p>
          </form>
        )}
        <InstalarApp textos={textosInstalar(t)} />
        <p className="mt-4 text-sm text-slate-500">{tp.comoEntregar}</p>
      </div>
    );
  }

  const db = await leer();
  const actividades = alumno.cursos.flatMap(({ grupo, alumno: enCurso }) =>
    db.actividades.filter((a) => a.grupoId === grupo.id).map((a) => ({ a, grupo, matricula: enCurso.matricula })),
  );
  return (
    <>
      <Encabezado
        titulo={tp.titulo}
        subtitulo={`${alumno.nombre} · ${alumno.correo}. ${tp.subtituloSesion}`}
      />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <ul className="divide-y divide-slate-100">
          {actividades.length === 0 && (
            <li className="px-5 py-4 text-sm text-slate-500">
              {tp.sinActividades}
            </li>
          )}
          {actividades.map(({ a, grupo, matricula }) => {
            const e = db.entregas.find((x) => x.actividadId === a.id && x.matricula === matricula);
            const aprobada = e?.estado === "aprobada";
            const disponible = resultadosDisponibles(a);
            const publicada = aprobada && disponible;
            const contenido = (
              <>
                <div className="flex-1">
                  <p className="font-medium">{a.titulo}</p>
                  <p className="text-sm text-slate-500">
                    {grupo.materia} · {fechaLarga(a.fechaAplicacion, locale)}
                  </p>
                  {a.resultadosDesde && (
                    <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-tinta-50 px-2 py-0.5 text-xs font-medium text-tinta-700">
                      {formato(tp.fechaVisualizacion, { fecha: fechaHoraLarga(a.resultadosDesde, locale) })}
                    </p>
                  )}
                </div>
                {publicada && !conPuntaje(a) ? (
                  <Insignia tono="verde">{tp.revisada}</Insignia>
                ) : publicada ? (
                  <span className={`text-xl font-semibold ${colorCalificacion(calificacion(a, e!), escalaDe(a))}`}>
                    {formatoCal(calificacion(a, e!), escalaDe(a))}
                    <span className="text-sm font-normal text-slate-400"> / {escalaDe(a)}</span>
                  </span>
                ) : aprobada ? (
                  <Insignia tono="ambar">{tp.listosEnFecha}</Insignia>
                ) : e && e.estado !== "sin_entregar" ? (
                  <Insignia tono="azul">{tp.evaluando}</Insignia>
                ) : (
                  <Link href={`/entregar/${a.id}`} className="text-sm font-medium text-tinta-700 hover:underline">
                    {tp.entregarFotos}
                  </Link>
                )}
              </>
            );
            return (
              <li key={a.id}>
                {publicada ? (
                  <Link href={`/alumno/reporte/${a.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                    {contenido}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-4">{contenido}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

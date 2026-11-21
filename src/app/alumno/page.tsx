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
import { actividadVisible, aperturaEnvio, estadoEnvio } from "@/lib/periodo";

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
  const ahora = new Date();
  // Cada curso con sus actividades ya dadas de alta (las que tienen fecha de alta futura no se ven).
  const cursos = alumno.cursos
    .map(({ grupo, alumno: enCurso }) => ({
      grupo,
      matricula: enCurso.matricula,
      actividades: db.actividades.filter((a) => a.grupoId === grupo.id && actividadVisible(a, ahora)),
    }))
    .filter((c) => c.actividades.length > 0);
  const f = (iso: string) => fechaHoraLarga(iso, locale);
  return (
    <>
      <Encabezado
        titulo={tp.titulo}
        subtitulo={`${alumno.nombre} · ${alumno.correo}. ${tp.subtituloSesion}`}
      />
      {cursos.length === 0 && (
        <p className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{tp.sinActividades}</p>
      )}
      <div className="space-y-6">
        {cursos.map(({ grupo, matricula, actividades }) => (
          <section key={grupo.id} aria-labelledby={`curso-${grupo.id}`}>
            <h2 id={`curso-${grupo.id}`} className="mb-2 text-base font-semibold text-slate-800">
              {grupo.materia} <span className="font-normal text-slate-500">· {grupo.nombre}</span>
            </h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              {actividades.map((a) => {
                const e = db.entregas.find((x) => x.actividadId === a.id && x.matricula === matricula);
                const enviada = Boolean(e && e.estado !== "sin_entregar");
                const publicada = e?.estado === "aprobada" && resultadosDisponibles(a, ahora);
                const recepcion = estadoEnvio(a, ahora);
                const apertura = aperturaEnvio(a);
                const periodo =
                  apertura && a.envioHasta
                    ? formato(tp.recepcion, { desde: f(apertura), hasta: f(a.envioHasta) })
                    : a.envioHasta
                      ? formato(tp.recepcionHasta, { hasta: f(a.envioHasta) })
                      : apertura
                        ? formato(tp.recepcionDesde, { desde: f(apertura) })
                        : undefined;
                const contenido = (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{a.titulo}</p>
                      <p className="text-sm text-slate-500">{fechaLarga(a.fechaAplicacion, locale)}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs font-medium">
                        {periodo && <span className="rounded-md bg-tinta-50 px-2 py-0.5 text-tinta-700 ring-1 ring-tinta-200">{periodo}</span>}
                        {!enviada &&
                          (recepcion === "abierto" ? (
                            <span className="rounded-md bg-acierto-suave px-2 py-0.5 text-acierto">{tp.abierta}</span>
                          ) : recepcion === "proximo" ? (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">{formato(tp.abre, { f: f(apertura!) })}</span>
                          ) : (
                            <span className="rounded-md bg-error-suave px-2 py-0.5 text-error">{tp.cerrada}</span>
                          ))}
                        {a.resultadosDesde && (
                          <span className="rounded-md bg-aviso-suave px-2 py-0.5 text-aviso ring-1 ring-aviso/30">
                            {formato(tp.fechaVisualizacion, { fecha: f(a.resultadosDesde) })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                      {publicada ? (
                        <>
                          <Insignia tono="verde">{tp.solucionRetro}</Insignia>
                          {conPuntaje(a) && (
                            <span className={`text-xl font-semibold ${colorCalificacion(calificacion(a, e!), escalaDe(a))}`}>
                              {formatoCal(calificacion(a, e!), escalaDe(a))}
                              <span className="text-sm font-normal text-slate-400"> / {escalaDe(a)}</span>
                            </span>
                          )}
                        </>
                      ) : enviada ? (
                        <>
                          <Insignia tono="azul">{tp.enviado}</Insignia>
                          <span className="text-xs text-slate-500">{e!.estado === "aprobada" ? tp.listosEnFecha : tp.evaluando}</span>
                        </>
                      ) : recepcion === "abierto" ? (
                        <Link href={`/entregar/${a.id}`} className="rounded-lg bg-tinta-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-tinta-700">
                          {tp.entregarFotos}
                        </Link>
                      ) : null}
                    </div>
                  </>
                );
                const clase = "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4";
                return (
                  <li key={a.id}>
                    {publicada ? (
                      <Link href={`/alumno/reporte/${a.id}`} className={`${clase} hover:bg-slate-50`}>
                        {contenido}
                      </Link>
                    ) : (
                      <div className={clase}>{contenido}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

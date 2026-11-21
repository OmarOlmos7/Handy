import { notFound } from "next/navigation";
import { salirAlumno } from "@/app/acciones-cuenta";
import Link from "next/link";
import { EntregarForm } from "@/components/entregar-form";
import { FormIngresoAlumno, FormRegistroAlumno } from "@/components/formularios-alumno";
import { ResponderActividad } from "@/components/responder-actividad";
import { Logo } from "@/components/ui";
import { actividadDe, grupoDe, leer } from "@/lib/almacen";
import { esDelProfesor } from "@/lib/cuentas";
import { textos } from "@/lib/i18n/servidor";
import { datosResponsable } from "@/lib/legal/documentos";
import { primeraEntrega } from "@/lib/reenvio";
import { aperturaEnvio, estadoEnvio } from "@/lib/periodo";
import { fechaHoraLarga } from "@/lib/resultados";
import { formato } from "@/lib/i18n/idiomas";
import { actividadDeVersion, letrasVersiones, versionValida } from "@/lib/versiones";
import { esPlataforma, reactivosParaAlumno, versionDeAlumno } from "@/lib/plataforma";
import { alumnoActual, matriculaEnCurso, profesorActual } from "@/lib/sesion";

// Página pública del QR. El alumno entra con su correo y clave de acceso (o crea su cuenta
// aquí la primera vez) y la entrega queda en el curso del profesor dueño de la actividad.
export default async function Entregar({ params, searchParams }: PageProps<"/entregar/[id]">) {
  const { id } = await params;
  // m y n rellenan el formulario cuando el profesor sube las hojas de un alumno.
  // v: versión de la hoja que trae el QR (A, B…).
  const { m, n, v, error, crear } = await searchParams;
  const db = await leer();
  const actividad = actividadDe(db, id);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  if (!actividad || !grupo) notFound();
  const profesor = await profesorActual();
  const comoProfesor = Boolean(profesor && esDelProfesor(db, id, profesor.id));
  const alumno = comoProfesor ? undefined : await alumnoActual();
  // Si el alumno ya entregó, el formulario le ofrece reenviar (o le dice que ya no se puede).
  const matricula = matriculaEnCurso(alumno, grupo.id);
  const entrega = matricula ? db.entregas.find((e) => e.actividadId === id && e.matricula === matricula && e.estado !== "sin_entregar") : undefined;
  const primera = entrega && primeraEntrega(entrega);
  const { t, locale } = await textos();
  const recepcion = estadoEnvio(actividad);
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <Logo grande />
      <h1 className="mt-5 text-xl font-semibold">{actividad.titulo}</h1>
      <p className="text-sm text-slate-500">
        {grupo.materia} · {grupo.nombre}
      </p>
      {alumno && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-tinta-50 px-4 py-3 text-sm">
          <span>
            {t.alumno.entregar.entregasComo} <strong>{alumno.nombre}</strong>
            <span className="block text-xs text-slate-500">{alumno.correo}</span>
          </span>
          <form action={salirAlumno}>
            <button type="submit" className="text-xs text-tinta-700 underline">
              {t.alumno.entregar.noEresTu}
            </button>
          </form>
        </div>
      )}
      {actividad.entregasSuspendidas && !comoProfesor ? (
        <p className="mt-5 rounded-xl bg-error-suave px-4 py-4 text-sm font-medium text-error">{t.alumno.entregar.suspendidas}</p>
      ) : recepcion === "proximo" && !comoProfesor ? (
        <p className="mt-5 rounded-xl bg-tinta-50 px-4 py-4 text-sm font-medium text-tinta-700 ring-1 ring-tinta-200">
          {formato(t.alumno.entregar.proximo, { f: fechaHoraLarga(aperturaEnvio(actividad)!, locale) })}
        </p>
      ) : recepcion === "cerrado" && !comoProfesor ? (
        <p className="mt-5 rounded-xl bg-error-suave px-4 py-4 text-sm font-medium text-error">
          {formato(t.alumno.entregar.cerrado, { f: fechaHoraLarga(actividad.envioHasta!, locale) })}
        </p>
      ) : (
        <div className="mt-5">
          {actividad.envioHasta && (
            <p className="mb-4 rounded-lg bg-tinta-50 px-3 py-2 text-sm font-medium text-tinta-700 ring-1 ring-tinta-200">
              {formato(t.alumno.entregar.hasta, { f: fechaHoraLarga(actividad.envioHasta, locale) })}
            </p>
          )}
          {esPlataforma(actividad) ? (
            <EnPlataforma />
          ) : (
          <EntregarForm
            actividadId={id}
            titulo={actividad.titulo}
            correoPrivacidad={datosResponsable(process.env).correo}
            modo={comoProfesor ? "profesor" : alumno ? "sesion" : "nuevo"}
            automatica={Boolean(actividad.rubricaConfirmada)}
            matriculaInicial={typeof m === "string" ? m : undefined}
            nombreInicial={typeof n === "string" ? n : undefined}
            versiones={actividad.versiones?.length ? letrasVersiones(actividad) : undefined}
            versionInicial={versionValida(actividad, v) ?? (actividad.versiones?.length ? (entrega?.version ?? "A") : undefined)}
            previa={
              entrega && primera
                ? { primeraEntregaEn: primera, paginas: entrega.paginasRecibidas, evaluada: entrega.estado === "evaluada" || entrega.estado === "aprobada" }
                : undefined
            }
          />
          )}
        </div>
      )}
    </main>
  );

  // Actividad en plataforma: el alumno responde aquí con su sesión; el profesor ve la vista previa.
  function EnPlataforma() {
    const tr = t.alumno.responder;
    if (!actividad || !grupo) return null;
    if (comoProfesor) {
      const version = versionValida(actividad, v) ?? (actividad.versiones?.length ? "A" : undefined);
      const suya = actividadDeVersion(actividad, version);
      return <ResponderActividad actividadId={id} reactivos={reactivosParaAlumno(suya)} instrucciones={suya.instruccionesAlumno} version={version} vistaPrevia />;
    }
    if (!alumno) {
      const err = typeof error === "string" ? error : undefined;
      const volver = `/entregar/${id}`;
      return (
        <div className="space-y-4">
          <p className="rounded-xl bg-tinta-50 px-4 py-3 text-sm text-tinta-700 ring-1 ring-tinta-200">{tr.iniciaSesion}</p>
          {crear === "1" ? (
            <FormRegistroAlumno t={t} error={err} ingreso={volver} volver={volver} />
          ) : (
            <FormIngresoAlumno t={t} error={err} registro={`${volver}?crear=1`} volver={volver} />
          )}
        </div>
      );
    }
    const calificada = entrega && (entrega.estado === "evaluada" || entrega.estado === "aprobada");
    if (calificada) {
      return (
        <div className="space-y-4 rounded-xl bg-white p-6 text-sm shadow-sm ring-1 ring-slate-200">
          <p className="font-semibold">{tr.yaRespondiste}</p>
          <p className="text-slate-600">{tr.calificadas}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={`/alumno/reporte/${id}`} className="rounded-lg bg-tinta-600 px-4 py-2 font-semibold text-white hover:bg-tinta-700">
              {tr.verRetro}
            </Link>
            <Link href="/alumno" className="rounded-lg px-4 py-2 font-semibold text-tinta-700 ring-1 ring-tinta-200 hover:bg-tinta-50">
              {tr.misActividades}
            </Link>
          </div>
        </div>
      );
    }
    // Cada alumno responde siempre su misma versión (por su lugar en la lista del grupo).
    const version = entrega?.version ?? versionDeAlumno(actividad, grupo, matricula ?? alumno.matricula);
    const suya = actividadDeVersion(actividad, version);
    return (
      <div className="space-y-4">
        {entrega && (
          <p className="rounded-xl bg-aviso-suave px-4 py-3 text-sm text-aviso">
            <strong>{tr.yaRespondiste}</strong> {tr.puedesCambiar}
          </p>
        )}
        <ResponderActividad actividadId={id} reactivos={reactivosParaAlumno(suya)} instrucciones={suya.instruccionesAlumno} version={actividad.versiones?.length ? (version ?? "A") : undefined} />
      </div>
    );
  }
}

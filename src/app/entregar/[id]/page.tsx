import { notFound } from "next/navigation";
import { salirAlumno } from "@/app/acciones-cuenta";
import { EntregarForm } from "@/components/entregar-form";
import { Logo } from "@/components/ui";
import { actividadDe, grupoDe, leer } from "@/lib/almacen";
import { esDelProfesor } from "@/lib/cuentas";
import { primeraEntrega } from "@/lib/reenvio";
import { alumnoActual, matriculaEnCurso, profesorActual } from "@/lib/sesion";

// Página pública del QR. El alumno entra con su correo y clave de acceso (o crea su cuenta
// aquí la primera vez) y la entrega queda en el curso del profesor dueño de la actividad.
export default async function Entregar({ params, searchParams }: PageProps<"/entregar/[id]">) {
  const { id } = await params;
  // m y n rellenan el formulario cuando el profesor sube las hojas de un alumno.
  const { m, n } = await searchParams;
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
            Entregas como <strong>{alumno.nombre}</strong>
            <span className="block text-xs text-slate-500">{alumno.correo}</span>
          </span>
          <form action={salirAlumno}>
            <button type="submit" className="text-xs text-tinta-700 underline">
              ¿No eres tú? Salir
            </button>
          </form>
        </div>
      )}
      <div className="mt-5">
        <EntregarForm
          actividadId={id}
          titulo={actividad.titulo}
          modo={comoProfesor ? "profesor" : alumno ? "sesion" : "nuevo"}
          automatica={Boolean(actividad.rubricaConfirmada)}
          matriculaInicial={typeof m === "string" ? m : undefined}
          nombreInicial={typeof n === "string" ? n : undefined}
          previa={
            entrega && primera
              ? { primeraEntregaEn: primera, paginas: entrega.paginasRecibidas, evaluada: entrega.estado === "evaluada" || entrega.estado === "aprobada" }
              : undefined
          }
        />
      </div>
    </main>
  );
}

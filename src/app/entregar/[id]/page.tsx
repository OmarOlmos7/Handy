import { notFound } from "next/navigation";
import { EntregarForm } from "@/components/entregar-form";
import { Logo } from "@/components/ui";
import { actividadDe, grupoDe, leer } from "@/lib/almacen";
import { alumnoActual } from "@/lib/sesion";

// Página pública del QR: el alumno no necesita cuenta. Escribe su nombre y matrícula
// y la entrega queda guardada en el curso del profesor dueño de la actividad.
export default async function Entregar({ params, searchParams }: PageProps<"/entregar/[id]">) {
  const { id } = await params;
  // m y n solo rellenan el formulario (los usa el profesor para subir hojas de un alumno).
  const { m, n } = await searchParams;
  const db = await leer();
  const actividad = actividadDe(db, id);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  if (!actividad || !grupo) notFound();
  const sesion = await alumnoActual();
  const propio = sesion?.grupo.id === grupo.id ? sesion : undefined;
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <Logo />
      <h1 className="mt-5 text-xl font-semibold">{actividad.titulo}</h1>
      <p className="text-sm text-slate-500">
        {grupo.materia} · {grupo.nombre} · ID de curso <span className="font-mono font-semibold text-tinta-700">{grupo.codigo}</span>
      </p>
      <div className="mt-5">
        <EntregarForm
          actividadId={id}
          titulo={actividad.titulo}
          matriculaInicial={propio?.matricula ?? (typeof m === "string" ? m : undefined)}
          nombreInicial={propio?.nombre ?? (typeof n === "string" ? n : undefined)}
        />
      </div>
    </main>
  );
}

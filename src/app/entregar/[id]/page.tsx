import { notFound } from "next/navigation";
import { EntregarForm } from "@/components/entregar-form";
import { Logo } from "@/components/ui";
import { actividadDe, grupoDe, leer } from "@/lib/almacen";

export default async function Entregar({ params, searchParams }: PageProps<"/entregar/[id]">) {
  const { id } = await params;
  const { m } = await searchParams;
  const db = await leer();
  const actividad = actividadDe(db, id);
  const grupo = actividad && grupoDe(db, actividad.grupoId);
  if (!actividad || !grupo) notFound();
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <Logo />
      <h1 className="mt-5 text-xl font-semibold">{actividad.titulo}</h1>
      <p className="text-sm text-slate-500">
        {grupo.materia} · {grupo.nombre}
      </p>
      <div className="mt-5">
        <EntregarForm
          actividadId={id}
          titulo={actividad.titulo}
          alumnos={grupo.alumnos.map((a) => ({ matricula: a.matricula, nombre: a.nombre }))}
          matriculaInicial={typeof m === "string" ? m : undefined}
        />
      </div>
    </main>
  );
}

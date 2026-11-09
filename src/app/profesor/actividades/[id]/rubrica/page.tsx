import { notFound } from "next/navigation";
import { Hoja } from "@/components/hoja";
import { PestanasActividad } from "@/components/pestanas-actividad";
import { RubricaEditor } from "@/components/rubrica-editor";
import { Encabezado, Tarjeta } from "@/components/ui";
import { actividades, obtenerActividad, obtenerGrupo } from "@/lib/datos-ejemplo";

export function generateStaticParams() {
  return actividades.map((a) => ({ id: a.id }));
}

export default async function Rubrica({ params }: PageProps<"/profesor/actividades/[id]/rubrica">) {
  const { id } = await params;
  const actividad = obtenerActividad(id);
  if (!actividad) notFound();
  const grupo = obtenerGrupo(actividad.grupoId)!;

  return (
    <>
      <Encabezado
        migas={[
          { texto: "Panel", href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: "/profesor" },
        ]}
        titulo={actividad.titulo}
      />
      <PestanasActividad id={id} activa="rubrica" />

      {actividad.reactivos.length === 0 ? (
        <Tarjeta className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-tinta-50 text-2xl text-tinta-600">
            ⇪
          </div>
          <h2 className="mt-4 text-lg font-semibold">Sube tu solución</h2>
          <p className="mt-2 text-sm text-slate-600">
            Resuelve la actividad a mano en la hoja impresa y escanéala con la app, o sube aquí un PDF o fotos. La IA
            leerá tus respuestas y propondrá la rúbrica: tipo de reactivo, respuesta, puntos y pasos esperados.
          </p>
          <label className="mt-5 block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-8 text-sm text-slate-500 hover:border-tinta-500 hover:bg-tinta-50">
            Arrastra aquí el PDF o las fotos de tu solución
            <input type="file" accept="application/pdf,image/*" multiple className="sr-only" />
          </label>
          <p className="mt-3 text-xs text-slate-400">Generar la rúbrica no consume créditos.</p>
        </Tarjeta>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Tu solución escaneada</p>
            {Array.from({ length: actividad.paginas }, (_, i) => (
              <Hoja key={i} actividad={actividad} pagina={i + 1} modo="solucion" grupoTexto={`${grupo.materia} · ${grupo.nombre}`} />
            ))}
          </div>
          <RubricaEditor reactivosIniciales={actividad.reactivos} />
        </div>
      )}
    </>
  );
}

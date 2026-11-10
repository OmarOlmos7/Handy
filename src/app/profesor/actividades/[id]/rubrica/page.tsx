import { notFound } from "next/navigation";
import { Hoja } from "@/components/hoja";
import { PestanasActividad } from "@/components/pestanas-actividad";
import { RubricaEditor } from "@/components/rubrica-editor";
import { Encabezado, Tarjeta } from "@/components/ui";
import { SubirSolucion } from "@/components/subir-solucion";
import { actividadDe, grupoDe } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";

export default async function Rubrica({ params }: PageProps<"/profesor/actividades/[id]/rubrica">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const actividad = actividadDe(db, id);
  if (!actividad) notFound();
  const grupo = grupoDe(db, actividad.grupoId)!;

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
        <Tarjeta className="mx-auto max-w-xl">
          <h2 className="text-lg font-semibold">Sube tu solución</h2>
          <p className="mt-2 text-sm text-slate-600">
            Resuelve la actividad a mano y sube fotos o un PDF. La IA leerá tus respuestas y propondrá la rúbrica: tipo
            de reactivo, respuesta, puntos y pasos esperados. Después la revisas y la confirmas.
          </p>
          <div className="mt-5">
            <SubirSolucion actividadId={id} />
          </div>
          <p className="mt-3 text-xs text-slate-400">Generar la rúbrica no consume créditos.</p>
        </Tarjeta>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Tu solución</p>
            {actividad.solucion?.length
              ? actividad.solucion.map((ruta, i) =>
                  ruta.endsWith(".pdf") ? (
                    <a key={ruta} href={`/api/archivos/${ruta}`} target="_blank" className="block rounded-lg border border-slate-200 bg-white p-4 text-sm text-tinta-700 underline">
                      Ver PDF de la solución ({i + 1})
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={ruta} src={`/api/archivos/${ruta}`} alt={`Solución, página ${i + 1}`} className="w-full rounded-md shadow-md ring-1 ring-slate-200" />
                  ),
                )
              : Array.from({ length: actividad.paginas }, (_, i) => (
                  <Hoja key={i} actividad={actividad} pagina={i + 1} modo="solucion" grupoTexto={`${grupo.materia} · ${grupo.nombre}`} />
                ))}
            <Tarjeta>
              <p className="mb-3 text-sm font-medium">¿La IA leyó mal tu solución?</p>
              <SubirSolucion actividadId={id} reemplazar />
            </Tarjeta>
          </div>
          <RubricaEditor actividadId={id} reactivosIniciales={actividad.reactivos} confirmadaInicial={!!actividad.rubricaConfirmada} />
        </div>
      )}
    </>
  );
}

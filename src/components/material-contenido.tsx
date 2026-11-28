"use client";

// Lo que ve el alumno (y el profesor en la vista previa) de una actividad de contenido: las
// instrucciones y el material con su previsualizador.
import type { AnexoContenido } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { TextoMat } from "./texto-mat";
import { VisorArchivos } from "./visor-archivos";

export function MaterialContenido({
  instrucciones,
  anexos,
  entrega,
  sinSesion,
  sinTitulo,
}: {
  instrucciones: string[];
  anexos: AnexoContenido[];
  entrega: "manuscrita" | "digital";
  /** El alumno aún no inicia sesión: ve las instrucciones, pero el material no. */
  sinSesion?: boolean;
  /** Ya va dentro de una hoja con su propio título ("Apoyos"). */
  sinTitulo?: boolean;
}) {
  const tc = useTextos().t.contenido;
  return (
    <div className="space-y-4">
      {instrucciones.length > 0 && (
        <section className="rounded-xl bg-tinta-50 p-4 ring-1 ring-tinta-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-tinta-900">{tc.instruccionesTitulo}</h2>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-tinta-700 ring-1 ring-tinta-200">
              {entrega === "digital" ? `💻 ${tc.entregaDigital}` : `✍️ ${tc.entregaManuscrita}`}
            </span>
          </div>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-tinta-900">
            {instrucciones.map((x, i) => (
              <li key={i}>
                <TextoMat texto={x} />
              </li>
            ))}
          </ol>
        </section>
      )}
      {anexos.length > 0 && (
        <section>
          {!sinTitulo && <h2 className="mb-2 text-sm font-semibold text-slate-700">📎 {tc.material}</h2>}
          {sinSesion ? (
            <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">{tc.materialSinSesion}</p>
          ) : (
            <VisorArchivos archivos={anexos.map((a) => ({ ruta: a.ruta, nombre: a.nombre, clase: a.clase, bytes: a.bytes }))} />
          )}
        </section>
      )}
    </div>
  );
}

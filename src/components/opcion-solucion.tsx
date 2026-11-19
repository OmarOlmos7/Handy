"use client";

import type { EstiloCorreccion } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";

/** Dos o más tarjetas para elegir una opción, con título y explicación. */
function Tarjetas<T extends string | boolean>({
  nombre,
  pregunta,
  valor,
  onCambio,
  opciones,
}: {
  nombre: string;
  pregunta: string;
  valor: T;
  onCambio: (v: T) => void;
  opciones: { valor: T; titulo: string; texto: string }[];
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">{pregunta}</legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {opciones.map((o) => (
          <label
            key={String(o.valor)}
            className={`flex cursor-pointer items-start gap-3 rounded-xl p-4 ring-2 transition ${
              valor === o.valor ? "bg-tinta-50 ring-tinta-500" : "bg-white ring-slate-200 hover:ring-slate-300"
            }`}
          >
            <input
              type="radio"
              name={nombre}
              value={String(o.valor)}
              checked={valor === o.valor}
              onChange={() => onCambio(o.valor)}
              className="mt-1 accent-tinta-600"
            />
            <span>
              <span className="block font-semibold text-slate-900">{o.titulo}</span>
              <span className="mt-1 block text-sm text-slate-600">{o.texto}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * "Incluir solución" o "No requiere solución". Las actividades como ensayos, producciones escritas
 * o análisis valoran la composición escrita (contenido, coherencia, elementos lingüísticos) y no
 * necesitan una solución.
 */
export function OpcionSolucion({ sinSolucion, onCambio }: { sinSolucion: boolean; onCambio: (sinSolucion: boolean) => void }) {
  const tm = useTextos().t.profesor.modalidad;
  return (
    <Tarjetas
      nombre="solucion"
      pregunta={tm.solucionPregunta}
      valor={sinSolucion}
      onCambio={onCambio}
      opciones={[
        { valor: false, titulo: tm.incluirSolucion, texto: tm.incluirSolucionTexto },
        { valor: true, titulo: tm.sinSolucion, texto: tm.sinSolucionTexto },
      ]}
    />
  );
}

/** Cómo se corrige sobre la hoja: subrayar y comentar encima, o marcar y comentar al margen. */
export function OpcionEstilo({ estilo, onCambio }: { estilo: EstiloCorreccion; onCambio: (estilo: EstiloCorreccion) => void }) {
  const tm = useTextos().t.profesor.modalidad;
  return (
    <Tarjetas
      nombre="estiloCorreccion"
      pregunta={tm.estiloPregunta}
      valor={estilo}
      onCambio={onCambio}
      opciones={[
        { valor: "margen", titulo: tm.estiloMargen, texto: tm.estiloMargenTexto },
        { valor: "subrayado", titulo: tm.estiloSubrayado, texto: tm.estiloSubrayadoTexto },
      ]}
    />
  );
}

/** Rúbrica con puntaje (calificación) o sin puntaje (solo aciertos y elementos a corregir). */
export function OpcionPuntaje({ sinPuntaje, onCambio }: { sinPuntaje: boolean; onCambio: (sinPuntaje: boolean) => void }) {
  const tm = useTextos().t.profesor.modalidad;
  return (
    <Tarjetas
      nombre="puntaje"
      pregunta={tm.puntajePregunta}
      valor={sinPuntaje}
      onCambio={onCambio}
      opciones={[
        { valor: false, titulo: tm.conPuntaje, texto: tm.conPuntajeTexto },
        { valor: true, titulo: tm.sinPuntaje, texto: tm.sinPuntajeTexto },
      ]}
    />
  );
}

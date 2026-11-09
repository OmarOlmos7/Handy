import { crearActividad } from "@/app/acciones";
import type { Grupo } from "@/lib/tipos";
import { Boton, BotonLink } from "./ui";

export const campo =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100";

/** Formulario de nueva actividad. Al guardar lleva a subir la solución. */
export function NuevaActividad({ grupos, hoy }: { grupos: Grupo[]; hoy: string }) {
  if (grupos.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-600">Primero registra un grupo con su lista de alumnos.</p>
        <BotonLink href="/profesor/grupos/nuevo" className="mt-4">
          Nuevo grupo
        </BotonLink>
      </div>
    );
  }
  return (
    <form action={crearActividad} className="mx-auto max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <label className="block text-sm font-medium text-slate-700">
        Grupo
        <select name="grupo" className={campo} required>
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.materia} · {g.nombre} ({g.alumnos.length} alumnos)
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Título de la actividad
        <input name="titulo" required className={campo} placeholder="Ej. Leyes de Newton" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Fecha de aplicación
          <input name="fecha" type="date" className={campo} defaultValue={hoy} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Páginas por alumno
          <input name="paginas" type="number" min={1} max={10} defaultValue={2} className={campo} />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Indicaciones para la IA (opcional)
        <textarea
          name="instrucciones"
          rows={3}
          className={campo}
          placeholder="Ej. En los problemas exige datos, ecuación, sustitución y resultado con unidades. Acepta procedimientos alternativos si son correctos."
        />
      </label>
      <p className="text-xs text-slate-500">
        Imprime tu propia hoja tal cual. En el siguiente paso subes tu solución resuelta a mano y la IA arma la rúbrica.
      </p>
      <div className="flex justify-end">
        <Boton type="submit">Crear actividad</Boton>
      </div>
    </form>
  );
}

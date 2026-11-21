// Colores para organizar cursos y actividades. Las clases van completas para que Tailwind las incluya.
export interface ColorTarjeta {
  clave: string;
  nombre: string;
  /** Círculo del selector y punto del encabezado de grupo. */
  punto: string;
  /** Franja superior de la tarjeta o lateral del renglón. */
  franja: string;
  /** Fondo suave para la etiqueta. */
  suave: string;
}

export const COLORES: ColorTarjeta[] = [
  { clave: "azul", nombre: "Azul", punto: "bg-blue-500", franja: "bg-blue-500", suave: "bg-blue-50 text-blue-700" },
  { clave: "verde", nombre: "Verde", punto: "bg-emerald-500", franja: "bg-emerald-500", suave: "bg-emerald-50 text-emerald-700" },
  { clave: "amarillo", nombre: "Amarillo", punto: "bg-amber-400", franja: "bg-amber-400", suave: "bg-amber-50 text-amber-700" },
  { clave: "naranja", nombre: "Naranja", punto: "bg-orange-500", franja: "bg-orange-500", suave: "bg-orange-50 text-orange-700" },
  { clave: "rojo", nombre: "Rojo", punto: "bg-red-500", franja: "bg-red-500", suave: "bg-red-50 text-red-700" },
  { clave: "rosa", nombre: "Rosa", punto: "bg-pink-500", franja: "bg-pink-500", suave: "bg-pink-50 text-pink-700" },
  { clave: "morado", nombre: "Morado", punto: "bg-violet-500", franja: "bg-violet-500", suave: "bg-violet-50 text-violet-700" },
  { clave: "gris", nombre: "Gris", punto: "bg-slate-500", franja: "bg-slate-500", suave: "bg-slate-100 text-slate-700" },
];

export function colorDe(clave: string | undefined): ColorTarjeta | undefined {
  return COLORES.find((c) => c.clave === clave);
}

/** Etiquetas sugeridas para agrupar actividades; el profesor puede escribir otra. */
export const ETIQUETAS = ["Tarea", "Actividad", "Quiz", "Examen", "Ensayo"];

/** Agrupa por color en el orden de la paleta; los que no tienen color van al final. */
export function agruparPorColor<T extends { color?: string }>(items: T[]) {
  const grupos = COLORES.map((c) => ({ color: c as ColorTarjeta | undefined, items: items.filter((i) => i.color === c.clave) }));
  grupos.push({ color: undefined, items: items.filter((i) => !colorDe(i.color)) });
  return grupos.filter((g) => g.items.length > 0);
}

/** Agrupa por etiqueta en orden alfabético; las que no tienen etiqueta van al final. */
export function agruparPorEtiqueta<T extends { etiqueta?: string }>(items: T[]) {
  const nombres = [...new Set(items.map((i) => i.etiqueta?.trim()).filter((e): e is string => !!e))].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" }),
  );
  const grupos = nombres.map((n) => ({ etiqueta: n as string | undefined, items: items.filter((i) => i.etiqueta?.trim() === n) }));
  grupos.push({ etiqueta: undefined, items: items.filter((i) => !i.etiqueta?.trim()) });
  return grupos.filter((g) => g.items.length > 0);
}

// Orden y filtro de las listas de entregas del profesor (Entregas y Evaluación).
import { claveApellido } from "./cuaderno";

export type OrdenLista = "apellido" | "nombre" | "matricula";
export type FiltroEntrega = "todas" | "entregadas" | "sin_entregar";

export const ORDENES_LISTA: OrdenLista[] = ["apellido", "nombre", "matricula"];
export const FILTROS_ENTREGA: FiltroEntrega[] = ["todas", "entregadas", "sin_entregar"];

/** Lee el orden de la URL; por omisión, por apellido paterno (como el cuaderno). */
export function leerOrden(v: unknown): OrdenLista {
  return ORDENES_LISTA.includes(v as OrdenLista) ? (v as OrdenLista) : "apellido";
}

export function leerFiltro(v: unknown): FiltroEntrega {
  return FILTROS_ENTREGA.includes(v as FiltroEntrega) ? (v as FiltroEntrega) : "todas";
}

const comparar = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base", numeric: true });

/**
 * Ordena y filtra las entregas. El apellido paterno es el penúltimo nombre cuando hay tres o más
 * ("Sofía Hernández Ruiz" → Hernández) y el último cuando hay dos.
 */
export function ordenarEntregas<T extends { matricula: string; estado: string }>(
  entregas: T[],
  nombreDe: (matricula: string) => string,
  orden: OrdenLista,
  filtro: FiltroEntrega = "todas",
): T[] {
  const visibles = entregas.filter((e) =>
    filtro === "todas" ? true : filtro === "entregadas" ? e.estado !== "sin_entregar" : e.estado === "sin_entregar",
  );
  const clave = (e: T) => (orden === "matricula" ? e.matricula : orden === "nombre" ? nombreDe(e.matricula) : claveApellido(nombreDe(e.matricula)));
  return [...visibles].sort((a, b) => comparar(clave(a), clave(b)) || comparar(a.matricula, b.matricula));
}

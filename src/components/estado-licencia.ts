// Estado de una licencia tal como lo ve el alumno (una pagada que ya pasó su fecha está vencida).
import { vigente } from "@/lib/licencias";
import type { Licencia } from "@/lib/tipos";
import type { Tono } from "./ui";

export type EstadoVisible = "pendiente" | "pagada" | "vencida" | "cancelada";

export const tonoEstado: Record<EstadoVisible, Tono> = { pendiente: "ambar", pagada: "verde", vencida: "gris", cancelada: "rojo" };

export function estadoVisible(l: Licencia, ahora = new Date()): EstadoVisible {
  if (l.estado === "pagada") return vigente(l, ahora) ? "pagada" : "vencida";
  return l.estado;
}

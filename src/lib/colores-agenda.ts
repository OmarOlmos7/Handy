// Colores y emojis de los tipos de bloque de la agenda (editor, agenda del alumno y "Hoy").
import type { TipoBloque } from "./tipos";

/** Colores de cada tipo de bloque (celda y muestra de la herramienta). */
export const COLOR_BLOQUE: Record<TipoBloque, string> = {
  clase: "bg-tinta-100 text-tinta-900",
  comida: "bg-amber-100 text-amber-800",
  proyecto: "bg-violet-100 text-violet-800",
  reunion: "bg-rose-100 text-rose-800",
  evento: "bg-fuchsia-100 text-fuchsia-800",
  vacaciones: "bg-teal-100 text-teal-800",
  otro: "bg-slate-200 text-slate-700",
  personal: "bg-slate-200 text-slate-700",
  asesoria: "bg-emerald-100 text-emerald-800",
  libre: "bg-white text-slate-400",
  asueto: "bg-red-50 text-red-700 bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(254_202_202/0.6)_6px_9px)]",
};

export const EMOJI_BLOQUE: Record<TipoBloque, string> = {
  clase: "📘",
  comida: "🍴",
  proyecto: "🛠️",
  reunion: "👥",
  evento: "🎤",
  vacaciones: "🏖️",
  otro: "📌",
  personal: "🏷️",
  asesoria: "🙋",
  libre: "",
  asueto: "🎉",
};

/** Colores para las etiquetas propias del profesor ("Personalizar"). */
export const COLOR_ETIQUETA: Record<string, { celda: string; punto: string }> = {
  cian: { celda: "bg-cyan-100 text-cyan-800", punto: "bg-cyan-400" },
  lima: { celda: "bg-lime-100 text-lime-800", punto: "bg-lime-400" },
  naranja: { celda: "bg-orange-100 text-orange-800", punto: "bg-orange-400" },
  rosa: { celda: "bg-pink-100 text-pink-800", punto: "bg-pink-400" },
  indigo: { celda: "bg-indigo-100 text-indigo-800", punto: "bg-indigo-400" },
  amarillo: { celda: "bg-yellow-100 text-yellow-800", punto: "bg-yellow-400" },
};

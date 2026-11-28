// Pascal, el golden retriever compañero de estudio: qué pose muestra según lo que pasa. Las poses
// son las gráficas de la hoja de personaje (public/pascal/*.webp). Sale cuando el profesor tiene
// créditos para que el alumno cree actividades; si no, quedan los ojitos.
import { costoGenerar, TIPOS_AUTOACTIVIDAD, type Animo, type Sugerencia } from "./autoestudio";

export const POSES_PASCAL = ["saluda", "senala", "alegre", "dormido", "duda", "guino", "idea", "ladea", "corre"] as const;
export type PosePascal = (typeof POSES_PASCAL)[number];

/** Ladrar no tiene gráfica propia: es la pose alegre (boca abierta) con un "¡Guau!". */
export type GestoPascal = PosePascal | "ladra";

export function imagenPascal(gesto: GestoPascal): string {
  return `/pascal/${gesto === "ladra" ? "alegre" : gesto}.webp`;
}

/** Hay créditos si el saldo del profesor alcanza para la actividad más barata. */
export function hayCreditosAutoestudio(saldo: number): boolean {
  return saldo >= Math.min(...TIPOS_AUTOACTIVIDAD.map(costoGenerar));
}

const POR_IDEA: Record<Sugerencia["clave"], GestoPascal> = {
  bienvenida: "saluda",
  proxima: "senala",
  vencida: "senala",
  temaBajo: "duda",
  temaNuevo: "guino",
  racha: "corre",
  felicita: "alegre",
  regreso: "ladea",
};

const POR_ANIMO: Record<Animo, GestoPascal> = {
  feliz: "alegre",
  serio: "duda",
  triste: "ladea",
  enojado: "senala",
  llorando: "ladra",
};

export interface EstadoPascal {
  animo: Animo;
  /** Clave de la idea que dice en este momento. */
  clave?: Sugerencia["clave"];
  /** Está armando una actividad con IA. */
  creando?: boolean;
  /** El alumno le hizo clic: ladra. */
  ladrando?: boolean;
  /** Mostró la frase de apoyo ante un texto de riesgo. */
  apoyo?: boolean;
  /** Primeros segundos en pantalla: saluda. */
  saludando?: boolean;
  /** El alumno pasa el puntero por "¡Va, armémosla!". */
  senalando?: boolean;
  /** Ya no le quedan actividades por hoy. */
  sinRestantes?: boolean;
}

/** Pose de Pascal, de lo más inmediato a lo más general. */
export function gestoPascal(e: EstadoPascal): GestoPascal {
  if (e.creando) return "idea";
  if (e.ladrando) return "ladra";
  if (e.apoyo) return "ladea";
  if (e.saludando) return "saluda";
  if (e.senalando) return "senala";
  if (e.sinRestantes) return "dormido";
  // Si va mal (entregas vencidas), llama la atención antes que cualquier idea.
  if (e.animo === "llorando" || e.animo === "enojado") return POR_ANIMO[e.animo];
  if (e.clave) return POR_IDEA[e.clave];
  return POR_ANIMO[e.animo];
}

// Planes de iEureka-Grader. Cada página evaluada usa créditos según el nivel de precisión
// (de 0.4 en Rápido a 7.2 en Avanzado; ver ESCALA). Precios en MXN con IVA.
import { COSTO_CREDITO_USD } from "./configuracion";
// Los precios y lo que incluye cada plan viven aquí para que la página de precios, el
// inicio y la tienda de créditos muestren siempre lo mismo.

export interface Plan {
  id: "gratis" | "basico" | "pro" | "academia" | "escuela";
  nombre: string;
  lema: string;
  /** Precio en MXN con IVA; undefined = a la medida. */
  precio?: number;
  creditos: number;
  /** Texto bajo el precio. */
  periodo: string;
  /** Sin href: botón de contacto (correo en CONTACTO_CORREO). */
  boton: { texto: string; href?: string };
  destacado?: boolean;
  /** Título de la lista de ventajas (por ejemplo, "Todo lo de Básico, más:"). */
  incluye: string;
  ventajas: string[];
  /** Se puede comprar en la tienda de créditos. */
  enTienda?: boolean;
}

// ---------- Costo por crédito y utilidad ----------
/** Tipo de cambio supuesto (MXN por dólar). */
export const TIPO_CAMBIO = 18.5;
export const IVA = 0.16;
/** ISR del ejercicio fiscal, sobre la utilidad antes de impuestos. */
export const ISR = 0.32;
/** Gastos de operación (incluye la comisión del cobro), sobre el ingreso sin IVA. */
export const OPERACION = 0.2;
/** Utilidad mínima después de ISR, sobre el ingreso sin IVA. */
export const UTILIDAD_OBJETIVO = 0.4;

/**
 * Costo de IA de un crédito en MXN. Cada nivel cobra los créditos de su costo medido más un margen
 * de seguridad (ver ESCALA), así que ningún crédito cuesta más de COSTO_CREDITO_USD.
 */
export function costoCreditoMXN(): number {
  return COSTO_CREDITO_USD * TIPO_CAMBIO;
}

/**
 * Utilidad del plan después de ISR, sobre su ingreso sin IVA (0.4 = 40 %); undefined si es gratis o
 * a la medida. Se quita el IVA del precio; del resto, la operación (20 %) y el costo de IA de sus
 * créditos, y a lo que queda el ISR.
 */
export function utilidad(p: Pick<Plan, "precio" | "creditos">): number | undefined {
  if (!p.precio) return undefined;
  const sinIva = p.precio / (1 + IVA);
  const antesDeIsr = sinIva * (1 - OPERACION) - p.creditos * costoCreditoMXN();
  return (antesDeIsr * (1 - ISR)) / sinIva;
}

/** Créditos máximos que puede incluir un precio (MXN con IVA) sin bajar de la utilidad objetivo. */
export function creditosMaximos(precio: number): number {
  const sinIva = precio / (1 + IVA);
  return Math.floor((sinIva * (1 - OPERACION - UTILIDAD_OBJETIVO / (1 - ISR))) / costoCreditoMXN());
}

export const PLANES: Plan[] = [
  {
    id: "gratis",
    nombre: "Gratuito",
    lema: "Prueba gratis con tu grupo, sin tarjeta",
    precio: 0,
    creditos: 50,
    periodo: "créditos de bienvenida, una sola vez",
    boton: { texto: "Crear cuenta gratis", href: "/registro" },
    incluye: "Para probar:",
    ventajas: [
      "50 créditos: califica una actividad de tu grupo y mira el resultado",
      "Cursos y alumnos sin límite",
      "Actividades generadas con IA y hojas imprimibles con QR",
      "Entregas desde el celular con foto o PDF",
      "Solución y rúbrica con IA sin costo",
    ],
  },
  {
    id: "basico",
    nombre: "Básico",
    lema: "Para un profesor con un grupo: todo un parcial calificado",
    precio: 215,
    creditos: 120,
    periodo: "pago único por 120 créditos",
    boton: { texto: "Elegir Básico", href: "/profesor/creditos" },
    incluye: "Todo lo de Gratuito, más:",
    ventajas: [
      "120 créditos: 5 actividades de 1 página para un grupo de 30",
      "Una o dos actividades al mes con un grupo",
      "Los cinco niveles de precisión, de Rápido a Avanzado",
      "Analíticas del grupo y reporte en PDF y Excel",
      "Pago con tarjeta, efectivo en OXXO o SPEI y factura (CFDI)",
    ],
    enTienda: true,
  },
  {
    id: "pro",
    nombre: "Pro",
    lema: "Para un profesor con dos o tres grupos",
    precio: 345,
    creditos: 240,
    periodo: "pago único por 240 créditos",
    boton: { texto: "Elegir Pro", href: "/profesor/creditos" },
    destacado: true,
    incluye: "Todo lo de Básico, más:",
    ventajas: [
      "240 créditos: 5 actividades de 1 página para 2 grupos de 30",
      "Dos o tres grupos durante un parcial",
      "Recomendaciones de estudio con videos y lecturas para cada alumno",
      "Cuaderno de calificaciones del curso",
    ],
    enTienda: true,
  },
  {
    id: "academia",
    nombre: "Academia",
    lema: "Para todo el semestre o una academia: el mejor precio por página",
    precio: 635,
    creditos: 480,
    periodo: "pago único por 480 créditos",
    boton: { texto: "Elegir Academia", href: "/profesor/creditos" },
    incluye: "Todo lo de Pro, más:",
    ventajas: [
      "480 créditos: 5 actividades de 1 página para 4 grupos de 30",
      "Varios grupos durante todo el semestre o tetramestre",
      "Margen para usar el nivel Avanzado en exámenes",
      "Reportes por alumno y por grupo durante todo el curso",
    ],
    enTienda: true,
  },
  {
    id: "escuela",
    nombre: "Escuela",
    lema: "Para instituciones con varios profesores",
    creditos: 4000,
    periodo: "4,000 créditos o más, a la medida de tu institución",
    boton: { texto: "Contactar para gestionar plan institucional" },
    incluye: "Todo lo de Academia, más:",
    ventajas: [
      "4,000 créditos o más para todos los profesores de la institución",
      "Créditos para los profesores de la institución",
      "Acompañamiento para arrancar con tus academias",
      "Facturación institucional",
    ],
  },
];

export function pesos(n: number, locale = "es-MX") {
  return n.toLocaleString(locale, { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

/** Precio por página con dos decimales, o undefined si el plan es gratis o a la medida. */
export function precioPorPagina(p: Plan): number | undefined {
  if (!p.precio) return undefined;
  return Math.round((p.precio / p.creditos) * 100) / 100;
}

/** Ahorro por página (en %) de un plan contra otro, redondeado. */
export function ahorroContra(p: Plan, base: Plan): number | undefined {
  const a = precioPorPagina(p);
  const b = precioPorPagina(base);
  if (a === undefined || b === undefined || a >= b) return undefined;
  const ahorro = Math.round((1 - a / b) * 100);
  // Diferencias de uno o dos por ciento no se anuncian.
  return ahorro >= 5 ? ahorro : undefined;
}

export const planDe = (id: Plan["id"]) => PLANES.find((p) => p.id === id)!;

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
/** Comisión del cobro (Mercado Pago, con IVA de la comisión) y cargo fijo por pago en MXN. */
export const COMISION_COBRO = { porcentaje: 0.0406, fijo: 4 };
export const IVA = 0.16;
/** ISR del ejercicio fiscal, sobre la utilidad (ingreso sin IVA menos comisiones y costo de IA). */
export const ISR = 0.28;
/** Utilidad mínima después de ISR, sobre el ingreso sin IVA. */
export const UTILIDAD_OBJETIVO = 0.3;

/**
 * Costo de IA de un crédito en MXN. Cada nivel cobra los créditos de su costo medido más un margen
 * de seguridad (ver ESCALA), así que ningún crédito cuesta más de COSTO_CREDITO_USD.
 */
export function costoCreditoMXN(): number {
  return COSTO_CREDITO_USD * TIPO_CAMBIO;
}

/**
 * Utilidad del plan después de ISR, sobre su ingreso sin IVA (0.3 = 30 %); undefined si es gratis o
 * a la medida. Se quita el IVA del precio, la comisión del cobro y el costo de IA, y al resto el ISR.
 */
export function utilidad(p: Pick<Plan, "precio" | "creditos">): number | undefined {
  if (!p.precio) return undefined;
  const sinIva = p.precio / (1 + IVA);
  const neto = sinIva * (1 - COMISION_COBRO.porcentaje) - COMISION_COBRO.fijo;
  const antesDeIsr = neto - p.creditos * costoCreditoMXN();
  return (antesDeIsr * (1 - ISR)) / sinIva;
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
      "50 páginas de alumno evaluadas",
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
    creditos: 300,
    periodo: "pago único por 300 créditos",
    boton: { texto: "Elegir Básico", href: "/profesor/creditos" },
    incluye: "Todo lo de Gratuito, más:",
    ventajas: [
      "300 páginas evaluadas",
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
    creditos: 600,
    periodo: "pago único por 600 créditos",
    boton: { texto: "Elegir Pro", href: "/profesor/creditos" },
    destacado: true,
    incluye: "Todo lo de Básico, más:",
    ventajas: [
      "600 páginas evaluadas",
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
    creditos: 1200,
    periodo: "pago único por 1,500 créditos",
    boton: { texto: "Elegir Academia", href: "/profesor/creditos" },
    incluye: "Todo lo de Pro, más:",
    ventajas: [
      "1,500 páginas evaluadas",
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
    creditos: 10000,
    periodo: "pago único por 10,000 créditos",
    boton: { texto: "Contactar para gestionar plan institucional" },
    incluye: "Todo lo de Academia, más:",
    ventajas: [
      "10,000 páginas evaluadas",
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

// Planes de iEureka-Grader. 1 crédito = 1 página de alumno evaluada. Precios en MXN con IVA.
// Los precios y lo que incluye cada plan viven aquí para que la página de precios, el
// inicio y la tienda de créditos muestren siempre lo mismo.

export interface Plan {
  id: "gratis" | "basico" | "pro" | "escuela";
  nombre: string;
  lema: string;
  /** Precio en MXN; undefined = a la medida. */
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

export const PLANES: Plan[] = [
  {
    id: "gratis",
    nombre: "Gratis",
    lema: "Prueba la evaluación con todo tu grupo",
    precio: 0,
    creditos: 50,
    periodo: "créditos de bienvenida, una sola vez",
    boton: { texto: "Crear cuenta gratis", href: "/registro" },
    incluye: "Para empezar:",
    ventajas: [
      "50 páginas de alumno evaluadas",
      "Cursos y alumnos sin límite",
      "Actividades generadas con IA y hojas imprimibles con QR",
      "Entregas desde el celular con foto o PDF",
      "Solución y rúbrica con IA sin costo",
      "Analíticas del grupo y reporte en PDF y Excel",
    ],
  },
  {
    id: "basico",
    nombre: "Básico",
    lema: "Para un profesor con uno o dos grupos",
    precio: 249,
    creditos: 300,
    periodo: "pago único por 300 créditos",
    boton: { texto: "Elegir Básico", href: "/profesor/creditos" },
    incluye: "Todo lo de Gratis, más:",
    ventajas: [
      "300 páginas evaluadas",
      "2 o 3 actividades al mes por grupo",
      "Los tres niveles de precisión: Rápido, Medio y Preciso",
      "Pago con tarjeta, efectivo en OXXO o SPEI",
      "Factura (CFDI)",
    ],
    enTienda: true,
  },
  {
    id: "pro",
    nombre: "Pro",
    lema: "Para todo un curso semestral o tetramestral",
    precio: 850,
    creditos: 1500,
    periodo: "pago único por 1,500 créditos",
    boton: { texto: "Elegir Pro", href: "/profesor/creditos" },
    destacado: true,
    incluye: "Todo lo de Básico, más:",
    ventajas: [
      "1,500 páginas evaluadas",
      "El menor precio por página para un profesor",
      "Ideal para varios grupos o para usar el nivel Preciso",
      "Reportes por alumno y por grupo durante todo el curso",
    ],
    enTienda: true,
  },
  {
    id: "escuela",
    nombre: "Escuela",
    lema: "Para academias e instituciones",
    creditos: 10000,
    periodo: "desde 10,000 créditos",
    boton: { texto: "Contáctanos" },
    incluye: "Todo lo de Pro, más:",
    ventajas: [
      "Créditos para varios profesores de la institución",
      "Precio por página a la medida",
      "Acompañamiento para arrancar con tus academias",
      "Facturación institucional",
    ],
  },
];

export function pesos(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
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
  return Math.round((1 - a / b) * 100);
}

export const planDe = (id: Plan["id"]) => PLANES.find((p) => p.id === id)!;

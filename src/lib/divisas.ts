// Divisa en la que se muestran los precios según el país del visitante.
// Los precios base viven en MXN (src/lib/planes.ts); aquí se convierten con un tipo de cambio
// fijo (unidades por dólar) y se redondean hacia arriba para no bajar del margen.
// Siempre se antepone el prefijo de la divisa: "Mx" para el peso mexicano y el código ISO para
// las demás (USD, EUR, COP...). Sin país conocido o con una divisa que no está en la tabla, USD.
import { TIPO_CAMBIO } from "./planes";

export interface Divisa {
  /** Código ISO 4217. */
  codigo: string;
  /** Lo que se escribe antes del precio. */
  prefijo: string;
  /** Unidades de esta divisa por un dólar (tipo de cambio aproximado; revisar cada trimestre). */
  porDolar: number;
}

const POR_DOLAR: Record<string, number> = {
  USD: 1,
  MXN: TIPO_CAMBIO,
  CAD: 1.38,
  EUR: 0.92,
  GBP: 0.78,
  CHF: 0.88,
  BRL: 5.5,
  ARS: 1200,
  COP: 4000,
  CLP: 930,
  PEN: 3.75,
  UYU: 40,
  BOB: 6.9,
  PYG: 7500,
  GTQ: 7.75,
  HNL: 25,
  NIO: 36.7,
  CRC: 510,
  DOP: 60,
  JPY: 150,
  CNY: 7.2,
  AUD: 1.5,
};

const ZONA_EURO = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SK SI".split(" ");

/** Divisa de cada país (ISO 3166-1). Los que no aparecen ven dólares. */
const DIVISA_DE_PAIS: Record<string, string> = {
  MX: "MXN",
  US: "USD",
  PR: "USD",
  EC: "USD",
  SV: "USD",
  PA: "USD",
  CA: "CAD",
  GB: "GBP",
  CH: "CHF",
  BR: "BRL",
  AR: "ARS",
  CO: "COP",
  CL: "CLP",
  PE: "PEN",
  UY: "UYU",
  BO: "BOB",
  PY: "PYG",
  GT: "GTQ",
  HN: "HNL",
  NI: "NIO",
  CR: "CRC",
  DO: "DOP",
  JP: "JPY",
  CN: "CNY",
  AU: "AUD",
  ...Object.fromEntries(ZONA_EURO.map((p) => [p, "EUR"])),
};

export function divisa(codigo: string): Divisa {
  const c = codigo in POR_DOLAR ? codigo : "USD";
  return { codigo: c, prefijo: c === "MXN" ? "Mx" : c, porDolar: POR_DOLAR[c] };
}

export const DOLAR = divisa("USD");

/** Divisa para un país; sin país o sin divisa conocida, dólares. */
export function divisaDePais(pais: string | undefined): Divisa {
  return divisa(DIVISA_DE_PAIS[pais?.toUpperCase() ?? ""] ?? "USD");
}

/**
 * Precio en MXN convertido a la divisa y redondeado hacia arriba: a unidades enteras por debajo
 * de 1,000 y a tres cifras significativas desde ahí (por ejemplo, 30,054 → 30,100).
 */
export function precioEn(mxn: number, d: Divisa): number {
  if (d.codigo === "MXN" || mxn === 0) return mxn;
  const v = (mxn / TIPO_CAMBIO) * d.porDolar;
  if (v < 1000) return Math.ceil(v - 1e-9);
  const paso = 10 ** (Math.floor(Math.log10(v)) - 2);
  return Math.ceil(v / paso - 1e-9) * paso;
}

/** "Mx $139", "USD $8", "EUR €8". */
export function formatoPrecio(mxn: number, d: Divisa, locale: string): string {
  const n = precioEn(mxn, d).toLocaleString(locale, {
    style: "currency",
    currency: d.codigo,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  return `${d.prefijo} ${n}`;
}

/** Precio por página con el prefijo ("Mx $0.46", "USD $0.027"). */
export function formatoPorPagina(precioMxn: number, creditos: number, d: Divisa, locale: string): string {
  const v = precioEn(precioMxn, d) / creditos;
  const n = v.toLocaleString(locale, {
    style: "currency",
    currency: d.codigo,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumSignificantDigits: 3,
  });
  return `${d.prefijo} ${n}`;
}

/** Nombre de la divisa en el idioma de la página, con su prefijo: "dólar estadounidense (USD)". */
export function nombreDivisa(d: Divisa, locale: string): string {
  let nombre = d.codigo;
  try {
    nombre = new Intl.DisplayNames([locale], { type: "currency" }).of(d.codigo) ?? d.codigo;
  } catch {
    // Sin datos de Intl para ese idioma se queda el código.
  }
  return `${nombre} (${d.prefijo})`;
}

/** Texto para "Precios en {divisa}": en pesos mexicanos se aclara que el IVA va incluido. */
export function textoDivisa(d: Divisa, locale: string, ivaIncluido: string): string {
  return d.codigo === "MXN" ? `${nombreDivisa(d, locale)}, ${ivaIncluido}` : nombreDivisa(d, locale);
}

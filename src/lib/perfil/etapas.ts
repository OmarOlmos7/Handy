// Etapas del Modelo CREAR en la rúbrica de una actividad: qué etapa evidencia cada reactivo, paso
// de desarrollo o criterio, y cuánto logró el alumno en cada una. El profesor fija la etapa; si no
// la fijó, el código la sugiere por las palabras del paso o del reactivo. Todo lo calcula el código.
import { criteriosDelReactivo } from "../elementos";
import type { Actividad, CriterioEvaluacion, EtapaCrear, PasoRubrica, Reactivo, ResultadoReactivo } from "../tipos";
import { ETAPAS_CREAR, SOLO_DE_ETAPA, type NivelSolo } from "./crear";

/** Porcentaje mínimo para dar por lograda una etapa (y para aprobar una actividad). */
export const UMBRAL_LOGRO = 70;

export const esEtapaCrear = (v: unknown): v is EtapaCrear => typeof v === "string" && (ETAPAS_CREAR as readonly string[]).includes(v);

/** Palabras que delatan cada etapa, en español, inglés y portugués (las más comunes en la app). */
const PISTAS_ETAPA: [EtapaCrear, RegExp][] = [
  ["transferencia", /\b(transf\w*|generaliz\w*|otro contexto|nuevo contexto|contexto nuevo|contextos? distintos?|situaci[oó]n nueva|caso nuevo|extrapol\w*|propon\w* (un|una) (caso|problema)|crea\w* (un|una) (problema|caso)|new context|generali[sz]\w*)/i],
  ["resultado", /\b(resultado|unidades?|verific\w*|comprob\w*|interpret\w*|conclu\w*|valid\w*|respuesta final|result|units?|check\w*|conclusion)/i],
  ["estrategia", /\b(estrategia|m[eé]todo|planific\w*|plan de|selecci\w* (la|el|una|un) (f[oó]rmula|ecuaci[oó]n|ley|principio|m[eé]todo)|eleg\w*|justific\w* (el|la) (m[eé]todo|procedimiento)|approach|strategy|method)/i],
  ["representar", /\b(diagrama|esquema|dibuj\w*|gr[aá]fic\w*|tabla|represent\w*|plante\w*|modelo|ecuaci[oó]n|f[oó]rmula|diagram|sketch|draw\w*|graph|equation|set ?up)/i],
  ["aplicar", /\b(calcul\w*|resuel\w*|resolv\w*|sustitu\w*|despej\w*|aplic\w*|oper\w*|desarroll\w*|procedimiento|solve|calculat\w*|substitut\w*|apply|compute)/i],
  ["comprender", /\b(identific\w*|datos|define\w*|defin\w*|concept\w*|reconoc\w*|enunci\w*|comprend\w*|describ\w*|qu[eé] es|menciona|enlista|identify|data|given|define|concept)/i],
];

/** Etapa que sugieren las palabras de un texto, o undefined si no dicen nada. */
export function sugerirEtapa(texto: string | undefined): EtapaCrear | undefined {
  if (!texto) return undefined;
  for (const [etapa, re] of PISTAS_ETAPA) if (re.test(texto)) return etapa;
  return undefined;
}

/** Etapa por omisión de un reactivo según su tipo: los cerrados piden comprender; los desarrollos, aplicar. */
function etapaPorTipo(r: Pick<Reactivo, "tipo">): EtapaCrear {
  if (r.tipo === "desarrollo" || r.tipo === "numerica") return "aplicar";
  if (r.tipo === "abierto") return "representar";
  return "comprender";
}

/** Etapa del reactivo: la del profesor; si no, la de su habilidad o enunciado; si no, la de su tipo. */
export function etapaDeReactivo(r: Pick<Reactivo, "tipo" | "habilidad" | "enunciado" | "etapaCrear">): EtapaCrear {
  return r.etapaCrear ?? sugerirEtapa(r.habilidad) ?? sugerirEtapa(r.enunciado) ?? etapaPorTipo(r);
}

export function etapaDePaso(p: Pick<PasoRubrica, "nombre" | "etapaCrear">, deReactivo: EtapaCrear): EtapaCrear {
  return p.etapaCrear ?? sugerirEtapa(p.nombre) ?? deReactivo;
}

export function etapaDeCriterio(c: Pick<CriterioEvaluacion, "nombre" | "descripcion" | "etapaCrear">, deReactivo: EtapaCrear): EtapaCrear {
  return c.etapaCrear ?? sugerirEtapa(c.nombre) ?? sugerirEtapa(c.descripcion) ?? deReactivo;
}

/** Puntos posibles y obtenidos en cada etapa. */
export type LogroEtapas = Partial<Record<EtapaCrear, { posible: number; obtenido: number }>>;

function sumar(l: LogroEtapas, etapa: EtapaCrear, posible: number, obtenido: number) {
  const x = (l[etapa] ??= { posible: 0, obtenido: 0 });
  x.posible += posible;
  x.obtenido += Math.max(0, Math.min(posible, obtenido));
}

/**
 * Logro por etapa de una entrega: los pasos de los desarrollos y los criterios de los abiertos se
 * reparten entre sus etapas con su peso; el resto del reactivo cuenta en la etapa del reactivo.
 */
export function logroPorEtapa(actividad: Pick<Actividad, "reactivos" | "criterios">, resultados: Pick<ResultadoReactivo, "numero" | "puntosObtenidos" | "pasos" | "criterios">[]): LogroEtapas {
  const logro: LogroEtapas = {};
  for (const r of actividad.reactivos) {
    if (!(r.puntos > 0)) continue;
    const res = resultados.find((x) => x.numero === r.numero);
    const propia = etapaDeReactivo(r);
    if (!res) {
      sumar(logro, propia, r.puntos, 0);
      continue;
    }
    if (r.pasos?.length && res.pasos?.length) {
      r.pasos.forEach((p, i) => {
        const posible = (p.peso || 0) * r.puntos;
        sumar(logro, etapaDePaso(p, propia), posible, posible * (res.pasos?.[i] ?? 0));
      });
      continue;
    }
    const lista = criteriosDelReactivo(actividad, r.numero);
    if (lista.length && res.criterios?.length) {
      const suma = lista.reduce((s, { criterio }) => s + (criterio.porcentaje || 0), 0);
      for (const { criterio, indice } of lista) {
        const posible = (suma > 0 ? (criterio.porcentaje || 0) / suma : 1 / lista.length) * r.puntos;
        sumar(logro, etapaDeCriterio(criterio, propia), posible, posible * (res.criterios?.[indice] ?? 0));
      }
      continue;
    }
    sumar(logro, propia, r.puntos, res.puntosObtenidos);
  }
  return logro;
}

/** Porcentaje (0-100, entero) de cada etapa con puntos posibles. */
export function porcentajesEtapa(logro: LogroEtapas): Partial<Record<EtapaCrear, number>> {
  const out: Partial<Record<EtapaCrear, number>> = {};
  for (const e of ETAPAS_CREAR) {
    const x = logro[e];
    if (x && x.posible > 0) out[e] = Math.round((x.obtenido / x.posible) * 100);
  }
  return out;
}

/**
 * Nivel SOLO alcanzado: el de la última etapa lograda (≥ 70 %) en orden, sin saltarse una etapa
 * evidenciada que no se logró. Si no logró la primera que se evidencia, preestructural; si logró
 * algo pero no la primera, uniestructural.
 */
export function nivelAlcanzado(porEtapa: Partial<Record<EtapaCrear, number>>): NivelSolo {
  let nivel: NivelSolo = "preestructural";
  let alguna = false;
  for (const e of ETAPAS_CREAR) {
    const v = porEtapa[e];
    if (v === undefined) continue;
    if (v < UMBRAL_LOGRO) break;
    nivel = SOLO_DE_ETAPA[e];
    alguna = true;
  }
  if (!alguna && Object.values(porEtapa).some((v) => (v ?? 0) > 0)) return "uniestructural";
  return nivel;
}

/** Etapas evidenciadas que no llegaron al 70 %, en orden del modelo. */
export function etapasPorReforzar(porEtapa: Partial<Record<EtapaCrear, number>>): EtapaCrear[] {
  return ETAPAS_CREAR.filter((e) => porEtapa[e] !== undefined && porEtapa[e]! < UMBRAL_LOGRO);
}

/** Lo que el profesor fija al revisar las etapas de su actividad. */
export interface EtapasActividad {
  reactivos: { numero: number; etapa?: EtapaCrear; pasos?: (EtapaCrear | undefined)[] }[];
  criterios?: (EtapaCrear | undefined)[];
}

/** Toma del navegador solo etapas válidas, alineadas con la rúbrica actual de la actividad. */
export function limpiarEtapasActividad(actividad: Pick<Actividad, "reactivos" | "criterios">, entrada: unknown): EtapasActividad {
  const e = (entrada ?? {}) as { reactivos?: unknown; criterios?: unknown };
  const lista = Array.isArray(e.reactivos) ? (e.reactivos as Record<string, unknown>[]) : [];
  const etapa = (v: unknown) => (esEtapaCrear(v) ? v : undefined);
  return {
    reactivos: actividad.reactivos.map((r) => {
      const x = lista.find((y) => Number(y?.numero) === r.numero) ?? {};
      const pasos = Array.isArray(x.pasos) ? x.pasos : [];
      return { numero: r.numero, etapa: etapa(x.etapa), pasos: r.pasos?.map((_, i) => etapa(pasos[i])) };
    }),
    criterios: (actividad.criterios ?? []).map((_, i) => etapa(Array.isArray(e.criterios) ? e.criterios[i] : undefined)),
  };
}

/** Aplica las etapas a la actividad (sin valor = que la sugiera el código). */
export function aplicarEtapas(actividad: Pick<Actividad, "reactivos" | "criterios">, etapas: EtapasActividad) {
  for (const r of actividad.reactivos) {
    const x = etapas.reactivos.find((y) => y.numero === r.numero);
    if (!x) continue;
    if (x.etapa) r.etapaCrear = x.etapa;
    else delete r.etapaCrear;
    r.pasos?.forEach((p, i) => {
      const v = x.pasos?.[i];
      if (v) p.etapaCrear = v;
      else delete p.etapaCrear;
    });
  }
  actividad.criterios?.forEach((c, i) => {
    const v = etapas.criterios?.[i];
    if (v) c.etapaCrear = v;
    else delete c.etapaCrear;
  });
}

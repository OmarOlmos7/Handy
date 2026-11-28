// Actividades autoasignadas: el alumno le pide a la IA ejercicios, videos, lecturas o tarjetas
// de un tema y las resuelve por su cuenta. Aquí van las reglas que no dependen de Next ni de la
// IA: calificación por código, límites, costo en créditos, estado de ánimo del compañero de
// estudio, sus sugerencias y el resumen que ve el profesor. Funciones puras para poder probarlas.
import { letras, margenNumerico, opcion, pares, primerNumero } from "./calificar";
import { PRECISION_PREDETERMINADA, creditosPorPagina, sumarCreditos } from "./configuracion";
import { estadoEnvio } from "./periodo";
import type { Actividad, Autoactividad, EjercicioAuto, Entrega, ResultadoAuto, TipoAutoactividad, TipoEjercicio } from "./tipos";

export const TIPOS_AUTOACTIVIDAD: TipoAutoactividad[] = ["practica", "manuscrita", "videos", "lectura", "tarjetas"];

/** Tipos de ejercicio que el alumno puede elegir en la práctica en pantalla. */
export const TIPOS_EJERCICIO_PRACTICA: TipoEjercicio[] = ["opcion", "multirespuesta", "verdadero_falso", "completar", "relacion", "relacion_imagenes", "numerica", "numerica_desarrollo", "texto"];
/** Tipos de ejercicio de la práctica con respuesta manuscrita. */
export const TIPOS_EJERCICIO_MANUSCRITA: TipoEjercicio[] = ["manuscrito", "numerica_desarrollo"];
/** En la numérica con desarrollo, cuánto vale el resultado; el resto es el procedimiento. */
export const PESO_RESULTADO_NUMERICO = 0.5;

/** Actividades que un alumno puede crear en 24 horas (en todos sus cursos). */
export const LIMITE_DIARIO = 5;
/** Largo máximo de lo que escribe el alumno al pedir una actividad o al decir cómo se sintió. */
export const LARGO_PETICION = 400;
export const LARGO_SENTIR = 300;
/** Ejercicios o tarjetas que se pueden pedir. */
export const CANTIDAD_MIN = 3;
export const CANTIDAD_MAX = 10;
export const CANTIDAD_PREDETERMINADA = 5;
/** Preguntas de comprobación en videos y lecturas. */
export const PREGUNTAS_COMPROBACION = 3;
/** Fotos por ejercicio manuscrito. */
export const MAX_FOTOS_EJERCICIO = 3;

/** Caritas que puede elegir el alumno al terminar. */
export const ANIMOS = ["😀", "🙂", "😐", "😕", "😫"] as const;

export function esTipoAutoactividad(x: unknown): x is TipoAutoactividad {
  return typeof x === "string" && (TIPOS_AUTOACTIVIDAD as string[]).includes(x);
}

export function cantidadValida(x: unknown): number {
  const n = Math.round(Number(x));
  if (!Number.isFinite(n)) return CANTIDAD_PREDETERMINADA;
  return Math.max(CANTIDAD_MIN, Math.min(CANTIDAD_MAX, n));
}

// ---------- Textos que no se responden ----------

// Señales de agresión, tristeza profunda, enojo o violencia en lo que escribe el alumno. Si
// aparecen, el compañero de estudio no responde ni aconseja: solo sugiere acudir al profesor o a
// un experto en consejería y tutoría. La IA hace una segunda revisión al generar la actividad.
const SENALES: RegExp[] = [
  // Daño a sí mismo y tristeza profunda.
  /\b(suicid\w*|matarme|me quiero morir|quiero morir(me)?|no quiero vivir|ya no quiero (vivir|estar aqui|seguir)|quitarme la vida|cortarme|lastimarme|hacerme dano|autolesi\w*)\b/,
  /\b(estoy|me siento|siento) (muy |tan |super )?(deprimid[oa]|desesperad[oa]|vaci[oa]|sol[oa] siempre|sin ganas de (vivir|nada))\b/,
  /\b(nadie me quiere|odio mi vida|no valgo nada|soy un[a]? (inutil|fracaso|basura)|mejor (muert[oa]|desaparecer)|desaparecer para siempre)\b/,
  // Violencia y agresión.
  // (Sin palabras de los problemas de física: "se dispara un proyectil", "la bola golpea…".)
  /\b(matar(lo|la|los|las|te|les)?\b|matar a|asesinar\w*|apunalar\w*|balacera|arma de fuego|explotar la escuela|vengarme|hacerle dano|lastimar a|voy a pegarle)\b/,
  /\b(te odio|los odio|las odio|odio a (todos|mi maestr[oa]|mi profe\w*|mis companer\w*)|me las van a pagar|voy a (romperle|partirle|madrearl\w*|golpearl\w*))\b/,
  // Enojo e insultos fuertes.
  /\b(pendej\w*|chinga\w*|cabron\w*|put[oa]s?|mierda|idiota|estupid[oa]s?|imbecil\w*|culer[oa]|verga|pinche|maldit[oa]s?)\b/,
  /\b(estoy (muy |super )?(enojad[oa]|furios[oa]|encabronad[oa]|harto|harta))\b/,
  // Inglés, para quien escriba en otro idioma.
  /\b(kill (myself|me|him|her|them|you)|suicide|want to die|hurt myself|cut myself|i hate (you|everyone|my life)|stupid|idiot|fuck\w*|shit)\b/,
];

/** Quita acentos y pasa a minúsculas para comparar sin importar cómo se escribió. */
function sinAcentos(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** true si el texto tiene señales de agresión, tristeza profunda, enojo o violencia. */
export function senalesDeRiesgo(texto: string | undefined): boolean {
  if (!texto) return false;
  const t = sinAcentos(texto).replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ");
  return SENALES.some((re) => re.test(t));
}

/**
 * Quita del texto del alumno su nombre y su matrícula antes de mandarlo a la IA (nunca deben
 * salir de la plataforma). Se reemplazan por "[alumno]".
 */
export function sinDatosPersonales(texto: string, datos: { nombre?: string; matricula?: string; correo?: string }): string {
  let t = texto;
  const quitar = (x: string) => {
    if (x.length < 3) return;
    const re = new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    t = t.replace(re, "[alumno]");
  };
  if (datos.correo) quitar(datos.correo);
  if (datos.matricula) quitar(datos.matricula);
  for (const parte of (datos.nombre ?? "").split(/\s+/)) quitar(parte);
  return t;
}

// ---------- Calificación por código ----------

const limpiarPalabra = (s: string) =>
  sinAcentos(s)
    .replace(/^[\s"'«»“”.,;:()¡!¿?]+|[\s"'«»“”.,;:()¡!¿?]+$/g, "")
    .replace(/\s+/g, " ");

/** Palabras de cada espacio de un ejercicio de completar ("masa | aceleración"). */
export function clavesCompletar(respuesta: string): string[] {
  return respuesta
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Espacios (___) de un enunciado de completar. */
export function espaciosCompletar(enunciado: string): number {
  return (enunciado.match(/_{3,}/g) ?? []).length;
}

/** true si el ejercicio lo califica la IA (respuesta escrita o desarrollo en foto). */
export function vaALaIA(tipo: TipoEjercicio) {
  return tipo === "texto" || tipo === "manuscrito" || tipo === "numerica_desarrollo";
}

/** 1 si el número que escribió el alumno cae dentro del margen del resultado; si no, 0. */
export function logroNumerico(ej: Pick<EjercicioAuto, "respuesta" | "tolerancia">, texto: string): number {
  const clave = primerNumero(ej.respuesta);
  const alumno = primerNumero(texto ?? "");
  if (clave === null || alumno === null) return 0;
  return Math.abs(alumno - clave) <= margenNumerico(ej, clave) + 1e-9 ? 1 : 0;
}

/** Numérica con desarrollo: el resultado (por código) y el procedimiento (lo lee la IA), en cuartos. */
export function logroConDesarrollo(resultado: number, procedimiento: number): number {
  const p = PESO_RESULTADO_NUMERICO;
  return cuartos(resultado * p + Math.max(0, Math.min(1, procedimiento)) * (1 - p));
}

/**
 * Logro (0 a 1) de un ejercicio cerrado según lo que eligió o escribió el alumno; null si lo
 * califica la IA. `seleccion`: letras elegidas, "V"/"F", la letra elegida para cada elemento de la
 * columna A (relación) o la palabra de cada espacio (completar).
 */
export function logroEjercicio(ej: Pick<EjercicioAuto, "tipo" | "respuesta" | "tolerancia">, seleccion: string[]): number | null {
  const sel = seleccion.map((x) => (x ?? "").trim());
  switch (ej.tipo) {
    case "numerica":
      return logroNumerico(ej, sel[0] ?? "");
    case "opcion":
    case "verdadero_falso":
      return sel[0] && opcion(sel[0]) === opcion(ej.respuesta) ? 1 : 0;
    case "multirespuesta": {
      // Cada correcta elegida suma y cada incorrecta elegida resta (sin bajar de 0).
      const clave = new Set(letras(ej.respuesta));
      if (clave.size === 0) return 0;
      const elegidas = new Set(sel.filter(Boolean).map((x) => x.toLowerCase()));
      const aciertos = [...elegidas].filter((l) => clave.has(l)).length;
      return cuartos(Math.max(0, aciertos - (elegidas.size - aciertos)) / clave.size);
    }
    case "relacion":
    case "relacion_imagenes": {
      const clave = pares(ej.respuesta);
      if (clave.length === 0) return 0;
      const alumno = sel.map((l, i) => (l ? `${i + 1}${l.toLowerCase()}` : "")).filter(Boolean);
      return cuartos(clave.filter((c) => alumno.includes(c)).length / clave.length);
    }
    case "completar": {
      const clave = clavesCompletar(ej.respuesta);
      if (clave.length === 0) return 0;
      // Cada espacio admite variantes separadas por "/" ("rápido / veloz").
      const bien = clave.filter((c, i) => c.split("/").some((v) => limpiarPalabra(v) === limpiarPalabra(sel[i] ?? "") && limpiarPalabra(v) !== "")).length;
      return cuartos(bien / clave.length);
    }
    default:
      return null;
  }
}

const cuartos = (n: number) => Math.round(n * 4) / 4;

/** Calificación sobre 100 (entero) a partir del logro de cada ejercicio o tarjeta. */
export function calificacionAuto(resultados: Pick<ResultadoAuto, "logro">[], total = resultados.length): number {
  if (total <= 0) return 0;
  const suma = resultados.reduce((s, r) => s + Math.max(0, Math.min(1, r.logro)), 0);
  return Math.round((suma / total) * 100);
}

/** Cómo se calificó el alumno en una tarjeta: lo sabía, casi o aún no. */
export type AutoevaluacionTarjeta = "si" | "casi" | "no";
export const LOGRO_TARJETA: Record<AutoevaluacionTarjeta, number> = { si: 1, casi: 0.5, no: 0 };

// ---------- Créditos y límites ----------

/**
 * Créditos por generar una actividad: lo de una hoja con el motor predeterminado; los videos y
 * las lecturas cuestan el doble porque además buscan en la web.
 */
export function costoGenerar(tipo: TipoAutoactividad): number {
  const hoja = creditosPorPagina(PRECISION_PREDETERMINADA);
  return tipo === "videos" || tipo === "lectura" ? sumarCreditos(hoja * 2) : hoja;
}

/** Créditos por evaluar con IA: una hoja por cada foto y una más si hay respuestas escritas. */
export function costoEvaluar(textos: number, fotos: number): number {
  const paginas = fotos + (textos > 0 ? 1 : 0);
  return sumarCreditos(paginas * creditosPorPagina(PRECISION_PREDETERMINADA));
}

/** Cuántas actividades más puede crear el alumno en las próximas 24 horas. */
export function restantesHoy(lista: Pick<Autoactividad, "alumnoId" | "creadaEn" | "casoDe">[], alumnoId: string, ahora: Date = new Date()): number {
  const desde = ahora.getTime() - 24 * 3600_000;
  const hechas = lista.filter((a) => a.alumnoId === alumnoId && !a.casoDe && Date.parse(a.creadaEn) > desde).length;
  return Math.max(0, LIMITE_DIARIO - hechas);
}

// ---------- Compañero de estudio ----------

/** Estado de ánimo de los ojitos: sonríe, se pone serio, triste, enojado o llora. */
export type Animo = "feliz" | "serio" | "triste" | "enojado" | "llorando";

export interface DatosCompanero {
  /** Autoactividades del alumno (de todos sus cursos o del curso que se ve). */
  autoactividades: Pick<Autoactividad, "estado" | "completadaEn" | "creadaEn" | "calificacion" | "tema">[];
  /** Actividades del profesor por entregar, con su cierre. */
  proximas: { titulo: string; cierre: string; grupoId: string }[];
  /** Actividades del profesor que cerraron hace poco sin que el alumno entregara. */
  vencidas: { titulo: string; grupoId: string }[];
  /** Temas con su porcentaje de acierto, de menor a mayor. */
  temasBajos: { tema: string; acierto: number; grupoId: string }[];
  /** Temas del curso para invitar a estudiar algo nuevo. */
  temas: { tema: string; grupoId: string }[];
  ahora: Date;
}

const DIA = 86_400_000;

/** Días desde la última autoactividad terminada; null si nunca ha hecho una. */
export function diasSinEstudiar(lista: DatosCompanero["autoactividades"], ahora: Date): number | null {
  const fechas = lista.filter((a) => a.estado === "completada" && a.completadaEn).map((a) => Date.parse(a.completadaEn!));
  if (fechas.length === 0) return null;
  return Math.max(0, Math.floor((ahora.getTime() - Math.max(...fechas)) / DIA));
}

/** Autoactividades terminadas en los últimos 7 días. */
export function hechasEstaSemana(lista: DatosCompanero["autoactividades"], ahora: Date): number {
  return lista.filter((a) => a.estado === "completada" && a.completadaEn && ahora.getTime() - Date.parse(a.completadaEn) < 7 * DIA).length;
}

/**
 * Ánimo de los ojitos según lo que el alumno hace por su cuenta:
 * - llorando: dos o más entregas vencidas y una semana sin estudiar, o dos semanas sin estudiar;
 * - enojado: alguna entrega vencida hace poco;
 * - triste: cinco días o más sin estudiar por su cuenta;
 * - serio: algo por vencer, nunca ha estudiado por su cuenta o lleva 2 a 4 días sin hacerlo;
 * - feliz: estudió por su cuenta en el último día o dos.
 */
export function animoCompanero(d: Pick<DatosCompanero, "autoactividades" | "proximas" | "vencidas" | "ahora">): Animo {
  const dias = diasSinEstudiar(d.autoactividades, d.ahora);
  const vencidas = d.vencidas.length;
  if ((vencidas >= 2 && (dias === null || dias >= 7)) || (dias !== null && dias >= 14)) return "llorando";
  if (vencidas >= 1 && (dias === null || dias >= 1)) return "enojado";
  if (dias !== null && dias >= 5) return "triste";
  if (dias === null || dias >= 2) return "serio";
  if (d.proximas.length > 0 && dias >= 1) return "serio";
  return "feliz";
}

/** Una idea del compañero: la clave del texto, sus valores y, si aplica, qué actividad proponer. */
export interface Sugerencia {
  clave: "proxima" | "vencida" | "temaBajo" | "temaNuevo" | "racha" | "regreso" | "bienvenida" | "felicita";
  valores: Record<string, string | number>;
  tipo?: TipoAutoactividad;
  tema?: string;
  grupoId?: string;
}

/**
 * Lo que dicen los ojitos, de lo más urgente a lo menos: actividades por vencer, vencidas, temas
 * con bajo desempeño, temas nuevos y ánimo por la racha. El primer elemento es el que se muestra;
 * el alumno puede pedir otra idea.
 */
export function sugerenciasCompanero(d: DatosCompanero): Sugerencia[] {
  const s: Sugerencia[] = [];
  const dias = diasSinEstudiar(d.autoactividades, d.ahora);
  const semana = hechasEstaSemana(d.autoactividades, d.ahora);
  if (dias === 0 && semana >= 2) s.push({ clave: "racha", valores: { n: semana } });
  else if (dias === 0) s.push({ clave: "felicita", valores: {} });
  const proximas = [...d.proximas].sort((a, b) => a.cierre.localeCompare(b.cierre));
  for (const p of proximas.slice(0, 2)) {
    const horas = Math.max(0, Math.round((Date.parse(p.cierre) - d.ahora.getTime()) / 3600_000));
    s.push({ clave: "proxima", valores: { titulo: p.titulo, horas, dias: Math.max(1, Math.round(horas / 24)) }, grupoId: p.grupoId });
  }
  for (const v of d.vencidas.slice(0, 1)) s.push({ clave: "vencida", valores: { titulo: v.titulo }, grupoId: v.grupoId });
  for (const t of d.temasBajos.filter((x) => x.acierto < 80).slice(0, 2)) {
    s.push({ clave: "temaBajo", valores: { tema: t.tema, n: Math.round(t.acierto) }, tipo: t.acierto < 60 ? "videos" : "tarjetas", tema: t.tema, grupoId: t.grupoId });
  }
  if (dias !== null && dias >= 3) s.push({ clave: "regreso", valores: { n: dias } });
  // Un tema que aún no ha practicado por su cuenta.
  const practicados = new Set(d.autoactividades.map((a) => a.tema.trim().toLowerCase()));
  const nuevos = d.temas.filter((t) => !practicados.has(t.tema.trim().toLowerCase()));
  const tiposNuevos: TipoAutoactividad[] = ["practica", "lectura", "tarjetas", "manuscrita", "videos"];
  nuevos.slice(0, 3).forEach((t, i) => s.push({ clave: "temaNuevo", valores: { tema: t.tema }, tipo: tiposNuevos[i % tiposNuevos.length], tema: t.tema, grupoId: t.grupoId }));
  if (s.length === 0 || dias === null) s.push({ clave: "bienvenida", valores: {} });
  // La bienvenida va primero para quien nunca ha estudiado por su cuenta, salvo algo por vencer.
  if (dias === null && !s.some((x) => x.clave === "proxima" || x.clave === "vencida")) s.sort((a, b) => Number(b.clave === "bienvenida") - Number(a.clave === "bienvenida"));
  return s;
}

/**
 * Actividades del profesor por entregar (abiertas y sin entregar, cierran en los próximos 7 días)
 * y vencidas (cerraron en los últimos 14 días sin entrega).
 */
export function pendientesDelAlumno(
  actividades: Pick<Actividad, "id" | "titulo" | "grupoId" | "visibleDesde" | "envioDesde" | "envioHasta">[],
  entregas: Pick<Entrega, "actividadId" | "matricula" | "estado">[],
  matriculaPorGrupo: Record<string, string>,
  ahora: Date = new Date(),
): { proximas: DatosCompanero["proximas"]; vencidas: DatosCompanero["vencidas"] } {
  const proximas: DatosCompanero["proximas"] = [];
  const vencidas: DatosCompanero["vencidas"] = [];
  for (const a of actividades) {
    const matricula = matriculaPorGrupo[a.grupoId];
    if (!matricula || !a.envioHasta) continue;
    if (a.visibleDesde && Date.parse(a.visibleDesde) > ahora.getTime()) continue;
    const enviada = entregas.some((e) => e.actividadId === a.id && e.matricula === matricula && e.estado !== "sin_entregar");
    if (enviada) continue;
    const cierre = Date.parse(a.envioHasta);
    const estado = estadoEnvio(a, ahora);
    if (estado === "abierto" && cierre - ahora.getTime() <= 7 * DIA) proximas.push({ titulo: a.titulo, cierre: a.envioHasta, grupoId: a.grupoId });
    if (estado === "cerrado" && ahora.getTime() - cierre <= 14 * DIA) vencidas.push({ titulo: a.titulo, grupoId: a.grupoId });
  }
  return { proximas, vencidas };
}

/** Temas del curso (de los reactivos y del temario de sus actividades), sin repetir. */
export function temasDelCurso(actividades: Pick<Actividad, "grupoId" | "reactivos" | "temario">[], grupoId: string, max = 40): string[] {
  const vistos = new Map<string, string>();
  for (const a of actividades.filter((x) => x.grupoId === grupoId)) {
    const temas = [...(a.temario?.temas ?? []), ...a.reactivos.map((r) => r.tema)];
    for (const t of temas) {
      const limpio = t?.trim().replace(/\s+/g, " ");
      if (limpio && limpio.length <= 120 && !vistos.has(limpio.toLowerCase())) vistos.set(limpio.toLowerCase(), limpio);
    }
  }
  return [...vistos.values()].slice(0, max);
}

// ---------- Resumen para el profesor y nota final ----------

export interface ResumenAutoestudio {
  total: number;
  completadas: number;
  /** Promedio sobre 100 de las terminadas; null si no ha terminado ninguna. */
  promedio: number | null;
  segundos: number;
  ultima?: string;
  /** Comentarios con señales de alerta (agresión, tristeza profunda, enojo o violencia). */
  alertas: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function resumenAutoestudio(lista: Autoactividad[], grupoId: string, matricula: string): ResumenAutoestudio {
  // Los casos equivalentes (perfil CREAR) ya cuentan en su actividad: no entran al autoestudio.
  const suyas = lista.filter((a) => a.grupoId === grupoId && a.matricula === matricula && !a.casoDe);
  const hechas = suyas.filter((a) => a.estado === "completada" && a.calificacion !== undefined);
  const fechas = suyas.map((a) => a.completadaEn ?? a.creadaEn).sort();
  return {
    total: suyas.length,
    completadas: hechas.length,
    promedio: hechas.length ? r1(hechas.reduce((s, a) => s + a.calificacion!, 0) / hechas.length) : null,
    segundos: suyas.reduce((s, a) => s + (a.segundos ?? 0), 0),
    ultima: fechas.at(-1),
    alertas: suyas.filter((a) => a.alerta).length,
  };
}

/** Promedio (sobre 100) y número de actividades terminadas de un tipo de autoasignada. */
export interface PromedioTipoAuto {
  promedio: number | null;
  hechas: number;
}

const promedioTipo = (hechas: Pick<Autoactividad, "calificacion">[]): PromedioTipoAuto => ({
  promedio: hechas.length ? r1(hechas.reduce((s, a) => s + a.calificacion!, 0) / hechas.length) : null,
  hechas: hechas.length,
});

/** Promedio y número de autoasignadas terminadas de un alumno, por cada uno de los 5 tipos. */
export function autoestudioPorTipo(lista: Autoactividad[], grupoId: string, matricula: string): Record<TipoAutoactividad, PromedioTipoAuto> {
  const hechas = lista.filter((a) => a.grupoId === grupoId && a.matricula === matricula && !a.casoDe && a.estado === "completada" && a.calificacion !== undefined);
  return Object.fromEntries(TIPOS_AUTOACTIVIDAD.map((t) => [t, promedioTipo(hechas.filter((a) => a.tipo === t))])) as Record<TipoAutoactividad, PromedioTipoAuto>;
}

/**
 * Promedio del grupo en cada tipo y en el global: promedio de los promedios de los alumnos que
 * ya tienen alguna del tipo (como los promedios por tipo del cuaderno); `hechas` es el total del grupo.
 */
export function autoestudioGrupo(
  porAlumno: { porTipo: Record<TipoAutoactividad, PromedioTipoAuto>; global: PromedioTipoAuto }[],
): { porTipo: Record<TipoAutoactividad, PromedioTipoAuto>; global: PromedioTipoAuto } {
  const juntar = (xs: PromedioTipoAuto[]): PromedioTipoAuto => {
    const vs = xs.map((x) => x.promedio).filter((v): v is number => v !== null);
    return { promedio: vs.length ? r1(vs.reduce((s, v) => s + v, 0) / vs.length) : null, hechas: xs.reduce((s, x) => s + x.hechas, 0) };
  };
  return {
    porTipo: Object.fromEntries(TIPOS_AUTOACTIVIDAD.map((t) => [t, juntar(porAlumno.map((a) => a.porTipo[t]))])) as Record<TipoAutoactividad, PromedioTipoAuto>,
    global: juntar(porAlumno.map((a) => a.global)),
  };
}

/** Peso del autoestudio en la nota final (0 a 100, a décimas); sin valor, 0. */
export function pesoAutoestudio(x: unknown): number {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

/**
 * Nota final con el autoestudio: la nota del curso aporta (100 − p) % y el promedio del
 * autoestudio p %. Si el alumno no ha hecho autoestudio, esa parte cuenta 0 (igual que un trabajo
 * no entregado). Con p = 0, la nota no cambia. `auto100` va sobre 100; el resultado, en la escala.
 */
export function notaConAutoestudio(base: number | null, auto100: number | null, peso: number, escala: number): number | null {
  if (peso <= 0) return base;
  if (base === null && auto100 === null) return null;
  const auto = ((auto100 ?? 0) / 100) * escala;
  return r1((base ?? 0) * (1 - peso / 100) + auto * (peso / 100));
}

/** Duración legible: "12 min", "1 h 05 min" o "45 s". */
export function duracion(segundos: number | undefined): string {
  const s = Math.max(0, Math.round(segundos ?? 0));
  if (s < 60) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}

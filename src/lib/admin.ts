// Panel de administración: quién es administrador y las cifras de operación
// (usuarios, uso, créditos y consumo de la IA). Funciones puras para poder probarlas.
import { normalizarCorreo } from "./cuentas";
import type { BaseDeDatos, ConsumoIA, TipoConsumoIA } from "./tipos";

/**
 * Correos con rol de administrador, separados por comas, en la variable ADMIN_CORREOS
 * del servidor. Así el rol no queda escrito en el código ni en la base.
 */
export function correosAdmin(valor = process.env.ADMIN_CORREOS ?? ""): Set<string> {
  return new Set(
    valor
      .split(/[,;\s]+/)
      .map(normalizarCorreo)
      .filter(Boolean),
  );
}

export function esAdmin(correo: string | undefined, valor?: string): boolean {
  return Boolean(correo) && correosAdmin(valor).has(normalizarCorreo(correo!));
}

// ---------- Consumo de la IA ----------

/** Precio en dólares por millón de tokens. Si el modelo no está, se usa el del modelo por omisión. */
const PRECIOS: Record<string, { entrada: number; salida: number; cacheLectura: number; cacheEscritura: number }> = {
  "claude-opus-5-5": { entrada: 4, salida: 20, cacheLectura: 0.2, cacheEscritura: 5 },
  "claude-opus-5": { entrada: 5, salida: 25, cacheLectura: 0.5, cacheEscritura: 6.25 },
  "claude-sonnet-5-5": { entrada: 2, salida: 10, cacheLectura: 0.1, cacheEscritura: 2.5 },
};
const PRECIO_OMISION = PRECIOS["claude-opus-5-5"];

function precioDe(modelo: string) {
  const clave = Object.keys(PRECIOS)
    .sort((a, b) => b.length - a.length)
    .find((k) => modelo === k || modelo.startsWith(`${k}-`));
  return clave ? PRECIOS[clave] : PRECIO_OMISION;
}

/** Costo estimado en dólares de una llamada. */
export function costoUSD(c: Pick<ConsumoIA, "modelo" | "entrada" | "salida" | "cacheLectura" | "cacheEscritura">): number {
  const p = precioDe(c.modelo);
  return (c.entrada * p.entrada + c.salida * p.salida + c.cacheLectura * p.cacheLectura + c.cacheEscritura * p.cacheEscritura) / 1_000_000;
}

/** Registro de consumo a partir de la respuesta de la API (solo cifras e IDs). */
export function consumoDeRespuesta(
  tipo: TipoConsumoIA,
  uso: { profesorId?: string; actividadId?: string },
  respuesta: {
    model: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number | null;
      cache_creation_input_tokens?: number | null;
    };
  },
  ok: boolean,
  fecha = new Date().toISOString(),
): ConsumoIA {
  return {
    fecha,
    tipo,
    profesorId: uso.profesorId,
    actividadId: uso.actividadId,
    modelo: respuesta.model,
    entrada: respuesta.usage.input_tokens ?? 0,
    salida: respuesta.usage.output_tokens ?? 0,
    cacheLectura: respuesta.usage.cache_read_input_tokens ?? 0,
    cacheEscritura: respuesta.usage.cache_creation_input_tokens ?? 0,
    ok,
  };
}

export const NOMBRE_TIPO_CONSUMO: Record<TipoConsumoIA, string> = {
  evaluacion: "Evaluar entregas",
  rubrica: "Rúbrica desde la solución",
  generar: "Generar actividad",
  editar: "Editar actividad",
  resolver: "Resolver actividad",
};

export interface TotalTokens {
  llamadas: number;
  fallidas: number;
  entrada: number;
  salida: number;
  /** Entrada + salida + caché. */
  total: number;
  costo: number;
}

function sumarTokens(lista: ConsumoIA[]): TotalTokens {
  const t: TotalTokens = { llamadas: 0, fallidas: 0, entrada: 0, salida: 0, total: 0, costo: 0 };
  for (const c of lista) {
    t.llamadas++;
    if (!c.ok) t.fallidas++;
    t.entrada += c.entrada + c.cacheLectura + c.cacheEscritura;
    t.salida += c.salida;
    t.costo += costoUSD(c);
  }
  t.total = t.entrada + t.salida;
  return t;
}

// ---------- Créditos y estatus de pago ----------

const CONCEPTO_REGALO = /bienvenida|regalo|cortes[ií]a/i;
const CONCEPTO_AJUSTE = /^Ajuste del administrador/;

export interface CreditosProfesor {
  /** Créditos que entraron por compra. */
  comprados: number;
  /** Créditos de bienvenida o de cortesía. */
  regalados: number;
  /** Ajustes del administrador (pueden ser negativos). */
  ajustes: number;
  /** Créditos gastados en evaluaciones (positivo). */
  usados: number;
  saldo: number;
}

export function creditosDe(db: BaseDeDatos, profesorId: string): CreditosProfesor {
  const c: CreditosProfesor = { comprados: 0, regalados: 0, ajustes: 0, usados: 0, saldo: 0 };
  for (const m of db.movimientos) {
    if (m.profesorId !== profesorId) continue;
    c.saldo += m.cantidad;
    if (CONCEPTO_AJUSTE.test(m.concepto)) c.ajustes += m.cantidad;
    else if (m.cantidad < 0) c.usados -= m.cantidad;
    else if (CONCEPTO_REGALO.test(m.concepto)) c.regalados += m.cantidad;
    else c.comprados += m.cantidad;
  }
  return c;
}

export type EstatusPago = "pagando" | "prueba" | "sin_saldo";

/** "pagando": ya compró créditos. "prueba": solo usa los de regalo. "sin_saldo": no le quedan créditos. */
export function estatusPago(c: CreditosProfesor): EstatusPago {
  if (c.saldo <= 0) return "sin_saldo";
  return c.comprados > 0 ? "pagando" : "prueba";
}

export const NOMBRE_ESTATUS_PAGO: Record<EstatusPago, string> = {
  pagando: "Cliente de pago",
  prueba: "En prueba",
  sin_saldo: "Sin saldo",
};

// ---------- Resumen del panel ----------

export type Rol = "administrador" | "profesor" | "alumno";

export interface FilaProfesor {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  creadoEn: string;
  /** Inicio de la sesión más reciente que sigue abierta (aproximado), si hay. */
  ultimoAcceso?: string;
  sesionesActivas: number;
  grupos: number;
  alumnosInscritos: number;
  actividades: number;
  entregas: number;
  paginasEvaluadas: number;
  creditos: CreditosProfesor;
  estatus: EstatusPago;
  tokens: TotalTokens;
}

export interface FilaAlumno {
  id: string;
  nombre: string;
  correo: string;
  creadoEn: string;
  cursos: number;
  entregas: number;
  sesionActiva: boolean;
}

export interface ResumenAdmin {
  usuarios: { profesores: number; administradores: number; alumnosConCuenta: number; alumnosInscritos: number };
  sesiones: { profesores: number; alumnos: number };
  uso: { grupos: number; actividades: number; entregas: number; evaluadas: number; paginasEvaluadas: number; pendientes: number };
  creditos: { comprados: number; regalados: number; usados: number; saldo: number; profesoresDePago: number };
  tokens: TotalTokens & { sinAtribuir: number };
  tokensPorTipo: { tipo: TipoConsumoIA; nombre: string; total: TotalTokens }[];
  /** Últimos días, del más viejo al más reciente. */
  tokensPorDia: { dia: string; total: number; costo: number; llamadas: number }[];
  profesores: FilaProfesor[];
  alumnos: FilaAlumno[];
}

/** Duración de las sesiones (sesion.ts): sirve para estimar cuándo se abrió cada una. */
const DIAS_SESION = 30;

function diaLocal(iso: string, desfaseHoras = -6): string {
  return new Date(Date.parse(iso) + desfaseHoras * 3_600_000).toISOString().slice(0, 10);
}

export function resumenAdmin(db: BaseDeDatos, opciones: { ahora?: Date; admins?: Set<string>; dias?: number } = {}): ResumenAdmin {
  const ahora = opciones.ahora ?? new Date();
  const admins = opciones.admins ?? correosAdmin();
  const dias = opciones.dias ?? 14;
  const ahoraIso = ahora.toISOString();
  const sesiones = db.sesiones.filter((s) => s.expira > ahoraIso);
  const consumo = db.consumoIA ?? [];
  const entregadas = db.entregas.filter((e) => e.estado !== "sin_entregar");
  const evaluadas = entregadas.filter((e) => e.estado === "evaluada" || e.estado === "aprobada");

  const profesores: FilaProfesor[] = db.profesores.map((p) => {
    const grupos = db.grupos.filter((g) => g.profesorId === p.id);
    const idsGrupos = new Set(grupos.map((g) => g.id));
    const actividades = db.actividades.filter((a) => idsGrupos.has(a.grupoId));
    const idsAct = new Set(actividades.map((a) => a.id));
    const suyas = entregadas.filter((e) => idsAct.has(e.actividadId));
    const propias = sesiones.filter((s) => s.profesorId === p.id);
    const inicio = propias.map((s) => new Date(Date.parse(s.expira) - DIAS_SESION * 86_400_000).toISOString()).sort().at(-1);
    const creditos = creditosDe(db, p.id);
    return {
      id: p.id,
      nombre: p.nombre,
      correo: p.correo,
      rol: admins.has(normalizarCorreo(p.correo)) ? "administrador" : "profesor",
      creadoEn: p.creadoEn,
      ultimoAcceso: inicio,
      sesionesActivas: propias.length,
      grupos: grupos.length,
      alumnosInscritos: grupos.reduce((s, g) => s + g.alumnos.length, 0),
      actividades: actividades.length,
      entregas: suyas.length,
      paginasEvaluadas: suyas
        .filter((e) => e.estado === "evaluada" || e.estado === "aprobada")
        .reduce((s, e) => s + (e.imagenes?.length ?? e.paginasRecibidas ?? 0), 0),
      creditos,
      estatus: estatusPago(creditos),
      tokens: sumarTokens(consumo.filter((c) => c.profesorId === p.id)),
    };
  });

  const alumnos: FilaAlumno[] = db.cuentasAlumno.map((c) => {
    const lugares = db.grupos.flatMap((g) => g.alumnos.filter((a) => a.correo && normalizarCorreo(a.correo) === c.correo).map((a) => ({ g, a })));
    const ids = new Set(lugares.map(({ g, a }) => `${g.id}|${a.matricula}`));
    const grupoDeActividad = new Map(db.actividades.map((a) => [a.id, a.grupoId]));
    return {
      id: c.id,
      nombre: c.nombre,
      correo: c.correo,
      creadoEn: c.creadoEn,
      cursos: lugares.length,
      entregas: entregadas.filter((e) => ids.has(`${grupoDeActividad.get(e.actividadId)}|${e.matricula}`)).length,
      sesionActiva: sesiones.some((s) => s.alumnoId === c.id),
    };
  });

  const tokens = sumarTokens(consumo);
  const tipos = Object.keys(NOMBRE_TIPO_CONSUMO) as TipoConsumoIA[];

  const porDia = new Map<string, { total: number; costo: number; llamadas: number }>();
  for (let i = dias - 1; i >= 0; i--) porDia.set(diaLocal(new Date(ahora.getTime() - i * 86_400_000).toISOString()), { total: 0, costo: 0, llamadas: 0 });
  for (const c of consumo) {
    const d = porDia.get(diaLocal(c.fecha));
    if (!d) continue;
    d.total += c.entrada + c.salida + c.cacheLectura + c.cacheEscritura;
    d.costo += costoUSD(c);
    d.llamadas++;
  }

  return {
    usuarios: {
      profesores: profesores.length,
      administradores: profesores.filter((p) => p.rol === "administrador").length,
      alumnosConCuenta: alumnos.length,
      alumnosInscritos: db.grupos.reduce((s, g) => s + g.alumnos.length, 0),
    },
    sesiones: { profesores: sesiones.filter((s) => s.profesorId).length, alumnos: sesiones.filter((s) => s.alumnoId).length },
    uso: {
      grupos: db.grupos.length,
      actividades: db.actividades.length,
      entregas: entregadas.length,
      evaluadas: evaluadas.length,
      paginasEvaluadas: profesores.reduce((s, p) => s + p.paginasEvaluadas, 0),
      pendientes: entregadas.filter((e) => e.estado === "entregada").length,
    },
    creditos: {
      comprados: profesores.reduce((s, p) => s + p.creditos.comprados, 0),
      regalados: profesores.reduce((s, p) => s + p.creditos.regalados, 0),
      usados: profesores.reduce((s, p) => s + p.creditos.usados, 0),
      saldo: profesores.reduce((s, p) => s + p.creditos.saldo, 0),
      profesoresDePago: profesores.filter((p) => p.creditos.comprados > 0).length,
    },
    tokens: { ...tokens, sinAtribuir: consumo.filter((c) => !c.profesorId).length },
    tokensPorTipo: tipos.map((tipo) => ({ tipo, nombre: NOMBRE_TIPO_CONSUMO[tipo], total: sumarTokens(consumo.filter((c) => c.tipo === tipo)) })),
    tokensPorDia: [...porDia].map(([dia, v]) => ({ dia, ...v })),
    profesores: profesores.sort((a, b) => b.tokens.total - a.tokens.total || b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es")),
    alumnos: alumnos.sort((a, b) => b.entregas - a.entregas || a.nombre.localeCompare(b.nombre, "es")),
  };
}

/** Movimiento de créditos que hace el administrador (regalo, corrección o devolución). */
export function movimientoAjuste(profesorId: string, cantidad: number, motivo: string, fecha = new Date()) {
  const limpio = motivo.trim().slice(0, 120);
  return {
    profesorId,
    fecha: fecha.toISOString().slice(0, 10),
    concepto: `Ajuste del administrador${limpio ? ` · ${limpio}` : ""}`,
    cantidad: Math.trunc(cantidad),
  };
}

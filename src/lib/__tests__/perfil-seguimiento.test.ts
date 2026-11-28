import { describe, expect, it } from "vitest";
import { resumenAutoestudio, restantesHoy } from "../autoestudio";
import { calificacion } from "../estadisticas";
import { BOLSA_SEMESTRE, cobrarAlumno, confirmarCompra, esPaquete, historialAlumno, nuevaCompra, precioPaquete, saldoAlumno, tieneMembresia } from "../perfil/bolsa";
import { cerrarCaso } from "../perfil/casos";
import { VERSION_CONSENTIMIENTO } from "../perfil/consentimiento";
import {
  aplicarEtapas,
  etapaDeReactivo,
  etapasPorReforzar,
  limpiarEtapasActividad,
  logroPorEtapa,
  nivelAlcanzado,
  porcentajesEtapa,
  sugerirEtapa,
} from "../perfil/etapas";
import { MAX_CASOS, etapasDelCaso, guardarIntento, peticionCaso, perfilEtapasCurso, registrarIntentoEntrega, seguimientoActividad } from "../perfil/intentos";
import type { Actividad, Autoactividad, BaseDeDatos, Entrega, Licencia, Reactivo } from "../tipos";

const reactivo = (x: Partial<Reactivo> & Pick<Reactivo, "numero" | "tipo" | "puntos">): Reactivo => ({ enunciado: "", respuesta: "", tema: "Cinemática", habilidad: "", pagina: 1, ...x });

const actividad: Actividad = {
  id: "act1",
  grupoId: "g1",
  titulo: "Tiro parabólico",
  descripcion: "",
  fechaAplicacion: "2026-09-10",
  paginas: 1,
  estado: "publicada",
  escala: 100,
  rubricaConfirmada: true,
  reactivos: [
    reactivo({ numero: 1, tipo: "opcion_multiple", puntos: 2, habilidad: "Identifica los datos del problema" }),
    reactivo({
      numero: 2,
      tipo: "desarrollo",
      puntos: 8,
      pasos: [
        { nombre: "Plantea las ecuaciones del movimiento", peso: 0.25 },
        { nombre: "Sustituye y calcula el tiempo de vuelo", peso: 0.5 },
        { nombre: "Resultado con unidades", peso: 0.25 },
      ],
    }),
  ],
};

const entrega = (x: Partial<Entrega> = {}): Entrega => ({
  actividadId: "act1",
  matricula: "A1",
  estado: "aprobada",
  paginasRecibidas: 1,
  positivos: [],
  mejoras: [],
  entregadaEn: "2026-09-11T02:30:00Z",
  resultados: [
    { numero: 1, puntosObtenidos: 2, respuestaLeida: "b", confianza: "alta", comentario: "" },
    { numero: 2, puntosObtenidos: 4, respuestaLeida: "", confianza: "alta", comentario: "", pasos: [1, 0.5, 0] },
  ],
  ...x,
});

const consentimiento = { alumnoId: "a1", version: VERSION_CONSENTIMIENTO, fecha: "2026-08-20T10:00:00Z", menor: false };

function db(x: Partial<BaseDeDatos> = {}): BaseDeDatos {
  return {
    grupos: [{ id: "g1", profesorId: "p1", nombre: "3B", materia: "Física", ciclo: "2026", alumnos: [{ matricula: "A1", nombre: "Ana", correo: "ana@x.mx" }] }],
    cuentasAlumno: [{ id: "a1", tipo: "alumno", correo: "ana@x.mx", nombre: "Ana", matricula: "A1", contrasena: "", creadoEn: "" }],
    profesores: [{ id: "p1", config: { idioma: "es" } }],
    actividades: [structuredClone(actividad)],
    entregas: [entrega()],
    consentimientosPerfil: [consentimiento],
    movimientos: [],
    ...x,
  } as unknown as BaseDeDatos;
}

describe("etapas CREAR de la rúbrica", () => {
  it("sugiere la etapa por las palabras del paso o reactivo", () => {
    expect(sugerirEtapa("Identifica los datos")).toBe("comprender");
    expect(sugerirEtapa("Dibuja el diagrama de cuerpo libre")).toBe("representar");
    expect(sugerirEtapa("Sustituye y calcula")).toBe("aplicar");
    expect(sugerirEtapa("Resultado con unidades")).toBe("resultado");
    expect(sugerirEtapa("Aplica la idea a un contexto nuevo")).toBe("transferencia");
    expect(sugerirEtapa("")).toBeUndefined();
    expect(etapaDeReactivo(reactivo({ numero: 1, tipo: "desarrollo", puntos: 1 }))).toBe("aplicar");
    expect(etapaDeReactivo(reactivo({ numero: 1, tipo: "desarrollo", puntos: 1, etapaCrear: "estrategia" }))).toBe("estrategia");
  });

  it("reparte los puntos de los pasos entre sus etapas", () => {
    const p = porcentajesEtapa(logroPorEtapa(actividad, entrega().resultados));
    expect(p).toEqual({ comprender: 100, representar: 100, aplicar: 50, resultado: 0 });
    expect(nivelAlcanzado(p)).toBe("multiestructural_avanzado");
    expect(etapasPorReforzar(p)).toEqual(["aplicar", "resultado"]);
  });

  it("los criterios de un abierto cuentan en su etapa con su porcentaje", () => {
    const a: Actividad = {
      ...actividad,
      reactivos: [reactivo({ numero: 1, tipo: "abierto", puntos: 10 })],
      criterios: [
        { nombre: "Representa el problema con un esquema", porcentaje: 40, descripcion: "" },
        { nombre: "Conclusión justificada", porcentaje: 60, descripcion: "" },
      ],
    };
    const p = porcentajesEtapa(logroPorEtapa(a, [{ numero: 1, puntosObtenidos: 4, criterios: [1, 0] }]));
    expect(p).toEqual({ representar: 100, resultado: 0 });
  });

  it("el nivel es preestructural si no logra la primera etapa evidenciada", () => {
    expect(nivelAlcanzado({ comprender: 50, aplicar: 90 })).toBe("uniestructural");
    expect(nivelAlcanzado({ comprender: 0 })).toBe("preestructural");
    expect(nivelAlcanzado({ comprender: 80, representar: 90, estrategia: 70, aplicar: 75, resultado: 90, transferencia: 100 })).toBe("abstracto_extendido");
  });

  it("el profesor fija etapas válidas y puede volver a la sugerencia", () => {
    const a = structuredClone(actividad);
    const limpias = limpiarEtapasActividad(a, { reactivos: [{ numero: 2, etapa: "estrategia", pasos: ["representar", "nada", "resultado"] }, { numero: 9, etapa: "aplicar" }] });
    aplicarEtapas(a, limpias);
    expect(a.reactivos[1].etapaCrear).toBe("estrategia");
    expect(a.reactivos[1].pasos!.map((p) => p.etapaCrear)).toEqual(["representar", undefined, "resultado"]);
    aplicarEtapas(a, limpiarEtapasActividad(a, {}));
    expect(a.reactivos[1].etapaCrear).toBeUndefined();
    expect("etapaCrear" in a.reactivos[1].pasos![0]).toBe(false);
  });
});

describe("intentos y casos equivalentes", () => {
  it("registra la entrega con logro por etapa, día y hora del centro de México", () => {
    const d = db({ tiempos: [{ actividadId: "act1", matricula: "A1", segundos: 900, porHora: [], porDia: [], primeraVez: "", ultimaVez: "" }] });
    const i = registrarIntentoEntrega(d, d.actividades[0], d.entregas[0]);
    expect(i).toMatchObject({ alumnoId: "a1", numero: 1, calificacion: 60, segundos: 900, dia: 4, hora: 20, origen: "actividad" });
    // Re-evaluar la misma entrega actualiza su intento; no crea otro.
    registrarIntentoEntrega(d, d.actividades[0], { ...d.entregas[0], resultados: d.entregas[0].resultados.map((r) => ({ ...r, puntosObtenidos: r.numero === 2 ? 8 : 2, pasos: r.pasos && [1, 1, 1] })) });
    expect(d.intentosPerfil).toHaveLength(1);
    expect(d.intentosPerfil![0].calificacion).toBe(100);
  });

  it("sin consentimiento no registra nada", () => {
    const d = db({ consentimientosPerfil: [] });
    expect(registrarIntentoEntrega(d, d.actividades[0], d.entregas[0])).toBeUndefined();
    expect(d.intentosPerfil).toBeUndefined();
  });

  it("numera los intentos por alumno y actividad", () => {
    const d: { intentosPerfil?: never[] } = {};
    const base = { alumnoId: "a1", grupoId: "g1", actividadId: "act1", calificacion: 50, porEtapa: {}, nivel: "preestructural", fecha: "", dia: 0, hora: 0 };
    expect(guardarIntento(d, { ...base, origen: "actividad", clave: "e1" }).numero).toBe(1);
    expect(guardarIntento(d, { ...base, origen: "caso", clave: "c1" }).numero).toBe(2);
    expect(guardarIntento(d, { ...base, origen: "caso", clave: "c1", calificacion: 80 }).numero).toBe(2);
  });

  it("decide si toca un caso, si está pendiente o si llegó al límite", () => {
    const casos = (n: number, estado: Autoactividad["estado"] = "completada") =>
      Array.from({ length: n }, (_, i) => ({ id: `c${i}`, alumnoId: "a1", grupoId: "g1", matricula: "A1", tipo: "practica", titulo: "", tema: "", creadaEn: "", estado, casoDe: { actividadId: "act1", numero: i + 1 } }) as Autoactividad);
    expect(seguimientoActividad(actividad, undefined, [], "a1").estado).toBe("sinCalificar");
    expect(seguimientoActividad(actividad, entrega(), [], "a1")).toMatchObject({ estado: "disponible", calificacion: 60 });
    expect(seguimientoActividad(actividad, entrega({ calificacionManual: 85 }), [], "a1").estado).toBe("aprobada");
    expect(seguimientoActividad(actividad, entrega(), casos(1, "pendiente"), "a1").estado).toBe("pendiente");
    const limite = seguimientoActividad(actividad, entrega(), casos(MAX_CASOS), "a1");
    expect(limite).toMatchObject({ estado: "limite", asesoria: true });
  });

  it("el caso hereda la etapa del reactivo con el mismo número", () => {
    expect(etapasDelCaso(actividad, { resultados: [{ numero: 1, logro: 1, respuesta: "" }, { numero: 2, logro: 0.5, respuesta: "" }] })).toEqual({ comprender: 100, aplicar: 50 });
  });

  it("la petición a la IA lleva solo la rúbrica, sin datos del alumno", () => {
    const p = peticionCaso(actividad, 2, ["Aplicar"]);
    expect(p).toContain("Caso equivalente 2");
    expect(p).toContain("Aplicar");
    expect(p).not.toContain("Ana");
    expect(p).not.toContain("A1 ");
  });

  it("al cerrar un caso cuenta su calificación y, en el quinto sin aprobar, avisa al profesor", () => {
    const caso = { id: "c5", alumnoId: "a1", grupoId: "g1", matricula: "A1", tipo: "practica", titulo: "", tema: "", creadaEn: "", estado: "completada", calificacion: 64, completadaEn: "2026-09-12T18:00:00Z", resultados: [{ numero: 1, logro: 0.64, respuesta: "" }], casoDe: { actividadId: "act1", numero: 5 } } as Autoactividad;
    const d = db({ autoactividades: [caso] });
    cerrarCaso(d, "c5");
    expect(d.entregas[0].calificacionCaso).toBe(64);
    expect(calificacion(d.actividades[0], d.entregas[0])).toBe(64);
    expect(d.intentosPerfil?.[0]).toMatchObject({ origen: "caso", calificacion: 64 });
    expect(d.avisos).toHaveLength(1);
    expect(d.avisos![0]).toMatchObject({ destino: { tipo: "profesor" }, automatico: true });
    expect(d.avisos![0].texto).toContain("Tiro parabólico");
    // La calificación escrita a mano por el profesor sigue teniendo prioridad.
    expect(calificacion(d.actividades[0], { ...d.entregas[0], calificacionManual: 90 })).toBe(90);
  });

  it("los casos equivalentes no cuentan en el autoestudio ni en su límite diario", () => {
    const caso = { id: "c1", alumnoId: "a1", grupoId: "g1", matricula: "A1", tipo: "practica", titulo: "", tema: "", creadaEn: new Date().toISOString(), estado: "completada", calificacion: 40, casoDe: { actividadId: "act1", numero: 1 } } as Autoactividad;
    expect(resumenAutoestudio([caso], "g1", "A1").total).toBe(0);
    expect(restantesHoy([caso], "a1")).toBe(5);
  });

  it("el perfil del curso promedia el último intento de cada actividad", () => {
    const base = { alumnoId: "a1", grupoId: "g1", origen: "actividad" as const, calificacion: 0, nivel: "", fecha: "", dia: 0, hora: 0 };
    const p = perfilEtapasCurso(
      [
        { ...base, actividadId: "x", clave: "1", numero: 1, porEtapa: { comprender: 40 } },
        { ...base, actividadId: "x", clave: "2", numero: 2, porEtapa: { comprender: 80 } },
        { ...base, actividadId: "y", clave: "3", numero: 1, porEtapa: { comprender: 60, aplicar: 70 } },
      ],
      "a1",
      "g1",
    );
    expect(p).toEqual({ porEtapa: { comprender: 70, aplicar: 70 }, actividades: 2, intentos: 3 });
  });
});

describe("bolsa de créditos del alumno", () => {
  const ahora = new Date("2026-09-15T16:00:00Z");
  const licencia = { alumnoId: "a1", estado: "pagada", vence: "2027-01-31T00:00:00Z" } as Licencia;

  it("trae 500 créditos por semestre con membresía", () => {
    expect(tieneMembresia({ licencias: [] }, "a1", false)).toBe(true);
    expect(tieneMembresia({ licencias: [] }, "a1", true, ahora)).toBe(false);
    expect(tieneMembresia({ licencias: [licencia] }, "a1", true, ahora)).toBe(true);
    expect(saldoAlumno({ licencias: [] }, "a1", true, ahora)).toMatchObject({ bolsa: 0, extra: 0, total: 0, membresia: false });
    expect(saldoAlumno({ licencias: [licencia] }, "a1", true, ahora)).toMatchObject({ bolsa: BOLSA_SEMESTRE, total: BOLSA_SEMESTRE });
  });

  it("cobra primero de la bolsa y luego de lo comprado", () => {
    const d: Parameters<typeof saldoAlumno>[0] = { licencias: [licencia] };
    expect(cobrarAlumno(d, { alumnoId: "a1", cantidad: 480, concepto: "x" }, true, ahora)).toBe(true);
    expect(cobrarAlumno(d, { alumnoId: "a1", cantidad: 30, concepto: "x" }, true, ahora)).toBe(false);
    const c = nuevaCompra(d, "a1", 100, ahora);
    expect(c.llave).toMatch(/^CRE-/);
    expect(c.precio).toBe(100);
    expect(confirmarCompra(d, c.llave, { proveedor: "demo", monto: 99 })).toEqual({ error: "monto" });
    expect(confirmarCompra(d, c.llave, { proveedor: "demo", monto: 100 }, ahora)).toMatchObject({ nueva: true });
    expect(confirmarCompra(d, c.llave, { proveedor: "demo", monto: 100 }, ahora)).toMatchObject({ nueva: false });
    expect(cobrarAlumno(d, { alumnoId: "a1", cantidad: 30, concepto: "x" }, true, ahora)).toBe(true);
    expect(d.movimientosAlumno![0].deBolsa).toBe(20);
    expect(saldoAlumno(d, "a1", true, ahora)).toMatchObject({ bolsa: 0, extra: 90, total: 90, usados: 510 });
    // El semestre siguiente trae bolsa nueva; los créditos comprados se conservan.
    expect(saldoAlumno(d, "a1", false, new Date("2027-02-10T16:00:00Z"))).toMatchObject({ bolsa: 500, extra: 90 });
    expect(historialAlumno(d, "a1")[0].concepto).toBe("x");
  });

  it("los paquetes van de 100 en 100 hasta 500, a $100 cada 100", () => {
    expect([100, 500].every(esPaquete)).toBe(true);
    expect(esPaquete(150)).toBe(false);
    expect(esPaquete(600)).toBe(false);
    expect(precioPaquete(300)).toBe(300);
  });
});

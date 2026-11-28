import { describe, expect, it } from "vitest";
import { puntosReactivoCerrado } from "../calificar";
import { calificarSinIA, creditosPlataforma, limpiarRespuestas, respuestaComoTexto, versionDeAlumno } from "../plataforma";
import type { Actividad, Reactivo, TipoReactivo } from "../tipos";
import { coinciden } from "../versiones";

const r = (tipo: TipoReactivo, respuesta: string, extra: Partial<Reactivo> = {}): Reactivo => ({
  numero: 1,
  tipo,
  enunciado: "",
  respuesta,
  puntos: 4,
  tema: "",
  habilidad: "",
  pagina: 1,
  ...extra,
});

describe("calificación por código de los nuevos tipos", () => {
  it("sí/no", () => {
    expect(puntosReactivoCerrado(r("si_no", "Sí"), "si")).toBe(4);
    expect(puntosReactivoCerrado(r("si_no", "Sí"), "No")).toBe(0);
    expect(puntosReactivoCerrado(r("si_no", "No"), "no")).toBe(4);
  });

  it("numérica con margen", () => {
    expect(puntosReactivoCerrado(r("numerica", "9.8 m/s²"), "9,9")).toBe(0);
    expect(puntosReactivoCerrado(r("numerica", "9.8 m/s²", { tolerancia: 0.05 }), "9,81")).toBe(4);
    expect(puntosReactivoCerrado(r("numerica", "100"), "100.9")).toBe(4); // 1 % por omisión
    expect(puntosReactivoCerrado(r("numerica", "100"), "102")).toBe(0);
    expect(puntosReactivoCerrado(r("numerica", "-3.5"), "−3.5")).toBe(4);
    expect(puntosReactivoCerrado(r("numerica", "12"), "doce")).toBe(0);
  });

  it("selección múltiple: correctas suman e incorrectas restan", () => {
    const x = r("seleccion_multiple", "a, c");
    expect(puntosReactivoCerrado(x, "a, c")).toBe(4);
    expect(puntosReactivoCerrado(x, "a")).toBe(2);
    expect(puntosReactivoCerrado(x, "a, b")).toBe(0);
    expect(puntosReactivoCerrado(x, "a, b, c")).toBe(2);
    expect(puntosReactivoCerrado(r("seleccion_imagenes", "b y d"), "d, b")).toBe(4);
  });

  it("orden por posiciones", () => {
    const x = r("orden", "c, a, b, d");
    expect(puntosReactivoCerrado(x, "c, a, b, d")).toBe(4);
    expect(puntosReactivoCerrado(x, "c, a, d, b")).toBe(2);
  });

  it("relación con imágenes como relación de columnas", () => {
    expect(puntosReactivoCerrado(r("relacion_imagenes", "1-b, 2-a"), "1-b, 2-a")).toBe(4);
    expect(puntosReactivoCerrado(r("relacion_imagenes", "1-b, 2-a"), "1-b, 2-c")).toBe(2);
  });

  it("versiones comparan las claves por tipo", () => {
    expect(coinciden("seleccion_multiple", { respuesta: "c, a" }, { respuesta: "a y c" })).toBe(true);
    expect(coinciden("orden", { respuesta: "a, b" }, { respuesta: "b, a" })).toBe(false);
    expect(coinciden("numerica", { respuesta: "4.90" }, { respuesta: "4.9 m" })).toBe(true);
  });
});

const actividad = (reactivos: Reactivo[]): Actividad =>
  ({ id: "x", grupoId: "g", titulo: "", descripcion: "", fechaAplicacion: "", paginas: 1, estado: "esperando_entregas", reactivos, formato: "plataforma" }) as Actividad;

describe("respuestas en plataforma", () => {
  const acts = actividad([
    r("opcion_multiple", "b", { numero: 1 }),
    r("relacion_columnas", "1-b, 2-a", { numero: 2, columnaA: ["1. x", "2. y"] }),
    r("abierto", "Explica…", { numero: 3 }),
    r("desarrollo", "x = 2", { numero: 4 }),
    r("numerica", "5", { numero: 5 }),
  ]);
  const textos = { correcto: "¡Correcto!", correcta: "La respuesta correcta es {r}.", sinRespuesta: "Sin respuesta." };

  it("convierte cada respuesta al formato de la clave", () => {
    expect(respuestaComoTexto(acts.reactivos[1], { numero: 2, seleccion: ["b", ""] })).toBe("1-b");
    expect(respuestaComoTexto(acts.reactivos[0], { numero: 1, seleccion: ["b"] })).toBe("b");
  });

  it("califica los cerrados sin IA y separa lo que sí va a la IA", () => {
    const resp = limpiarRespuestas(acts, [
      { numero: 1, seleccion: ["B"] },
      { numero: 2, seleccion: ["b", "c"] },
      { numero: 3, texto: "Porque la fuerza neta…" },
      { numero: 5, texto: "5.0" },
      { numero: 99, texto: "intruso" },
    ]);
    expect(resp.map((x) => x.numero)).toEqual([1, 2, 3, 5]);
    const { resultados, paraIA } = calificarSinIA(acts, resp, textos);
    expect(resultados.map((x) => [x.numero, x.puntosObtenidos])).toEqual([
      [1, 4],
      [2, 2],
      [4, 0],
      [5, 4],
    ]);
    expect(resultados.find((x) => x.numero === 4)?.comentario).toBe("Sin respuesta.");
    expect(paraIA.map((x) => x.numero)).toEqual([3]);
    // Solo la respuesta escrita cuesta: una "página" de créditos.
    expect(creditosPlataforma(acts, resp, { motor: "medio", esfuerzo: "bajo" })).toBeGreaterThan(0);
    expect(creditosPlataforma(acts, resp.filter((x) => x.numero !== 3))).toBe(0);
  });

  it("reparte las versiones por el lugar en la lista", () => {
    const g = { alumnos: ["A1", "A2", "A3"].map((m) => ({ matricula: m, nombre: m, correo: "" })) };
    const conVersiones = { versiones: [{ letra: "B", reactivos: [] }] };
    expect(["A1", "A2", "A3"].map((m) => versionDeAlumno(conVersiones, g, m))).toEqual([undefined, "B", undefined]);
    expect(versionDeAlumno({}, g, "A2")).toBeUndefined();
  });
});

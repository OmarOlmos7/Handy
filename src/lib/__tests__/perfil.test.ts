import { describe, expect, it } from "vitest";
import { banderaActiva, banderasActivas, perfilActivo } from "../banderas";
import { VERSION_CONSENTIMIENTO, conConsentimiento, consentimientoVigente, nuevoConsentimiento, retirarConsentimiento, tieneConsentimiento } from "../perfil/consentimiento";
import { DISCIPLINAS, ETAPAS_CREAR, LARGO_CAMPO, PLANTILLAS, SOLO_DE_ETAPA, disciplinaDeMateria, guardarModelo, limpiarEtapas, modeloDelCurso, plantilla } from "../perfil/crear";
import { diagnosticoInicial, filasDiagnostico, resumenGrupo } from "../perfil/diagnostico-inicial";
import {
  COLORES_STROOP,
  ENSAYOS_PRUEBA,
  MS_MAXIMO,
  MS_MINIMO,
  aperturaFin,
  esCongruente,
  generarEnsayos,
  limpiarEnsayos,
  momentoPendiente,
  resumirStroop,
  semestreDe,
} from "../perfil/stroop";
import type { AplicacionStroop, CuentaAlumno, EnsayoStroop, Grupo } from "../tipos";

describe("banderas", () => {
  it("están apagadas sin la variable", () => {
    expect(banderasActivas("").size).toBe(0);
    expect(perfilActivo("")).toBe(false);
  });
  it("lee la lista separada por comas, sin importar espacios ni mayúsculas", () => {
    expect(banderaActiva("perfil_cognitivo", "otra, Perfil_Cognitivo ")).toBe(true);
    expect(perfilActivo("perfil")).toBe(false);
  });
});

describe("consentimiento del perfil", () => {
  const ahora = new Date("2026-11-28T16:00:00Z");
  it("exige aceptar", () => {
    expect(nuevoConsentimiento("a1", { acepta: false, menor: false })).toEqual({ ok: false, error: "sinAceptar" });
  });
  it("de un mayor de edad guarda versión y fecha", () => {
    const r = nuevoConsentimiento("a1", { acepta: true, menor: false }, ahora);
    expect(r).toEqual({ ok: true, consentimiento: { alumnoId: "a1", version: VERSION_CONSENTIMIENTO, fecha: ahora.toISOString(), menor: false } });
  });
  it("de un menor pide los datos y la aceptación del tutor", () => {
    expect(nuevoConsentimiento("a1", { acepta: true, menor: true, tutorNombre: "Ana", tutorParentesco: "madre" }).ok).toBe(false);
    expect(nuevoConsentimiento("a1", { acepta: true, menor: true, tutorNombre: "A", tutorParentesco: "madre", aceptaTutor: true }).ok).toBe(false);
    const r = nuevoConsentimiento("a1", { acepta: true, menor: true, tutorNombre: "  Ana   López ", tutorParentesco: "madre", aceptaTutor: true }, ahora);
    expect(r.ok && r.consentimiento.tutor).toEqual({ nombre: "Ana López", parentesco: "madre" });
  });
  it("vale solo la versión vigente y sin retirar", () => {
    const r = nuevoConsentimiento("a1", { acepta: true, menor: false }, ahora);
    if (!r.ok) throw new Error();
    let lista = conConsentimiento([{ ...r.consentimiento, version: "2020-01-01" }], r.consentimiento);
    expect(lista).toHaveLength(1);
    expect(tieneConsentimiento(lista, "a1")).toBe(true);
    expect(tieneConsentimiento(lista, "a2")).toBe(false);
    lista = retirarConsentimiento(lista, "a1", ahora);
    expect(consentimientoVigente(lista, "a1")).toBeUndefined();
    expect(lista[0].retiradoEn).toBe(ahora.toISOString());
    expect(tieneConsentimiento([{ ...r.consentimiento, version: "2020-01-01" }], "a1")).toBe(false);
  });
});

describe("prueba de Stroop", () => {
  it("genera la mitad de ensayos congruentes, sin repetir palabra seguida", () => {
    for (const semilla of [1, 2, 3, 99]) {
      const xs = generarEnsayos(ENSAYOS_PRUEBA, semilla);
      expect(xs).toHaveLength(ENSAYOS_PRUEBA);
      expect(xs.filter(esCongruente)).toHaveLength(ENSAYOS_PRUEBA / 2);
      xs.forEach((x, i) => i > 0 && expect(x.palabra).not.toBe(xs[i - 1].palabra));
      xs.forEach((x) => expect(COLORES_STROOP).toContain(x.tinta));
    }
    expect(generarEnsayos(ENSAYOS_PRUEBA, 7)).toEqual(generarEnsayos(ENSAYOS_PRUEBA, 7));
  });

  const ensayo = (palabra: EnsayoStroop["palabra"], tinta: EnsayoStroop["tinta"], respuesta: EnsayoStroop["respuesta"], ms: number): EnsayoStroop => ({ palabra, tinta, respuesta, ms });

  it("resume con medianas de los aciertos, efecto y errores", () => {
    const r = resumirStroop([
      ensayo("rojo", "rojo", "rojo", 500),
      ensayo("azul", "azul", "azul", 600),
      ensayo("verde", "verde", "rojo", 400),
      ensayo("rojo", "azul", "azul", 800),
      ensayo("azul", "verde", "verde", 900),
      ensayo("verde", "amarillo", "verde", 300),
      ensayo("amarillo", "rojo", "rojo", 1000),
    ]);
    expect(r).toEqual({ ensayos: 7, msCongruente: 550, msIncongruente: 900, efectoMs: 350, erroresCongruente: 33, erroresIncongruente: 25 });
  });

  it("sin aciertos de un tipo, no hay efecto", () => {
    expect(resumirStroop([ensayo("rojo", "rojo", "azul", 500)]).efectoMs).toBeNull();
  });

  it("acepta solo una prueba completa y recorta los tiempos", () => {
    const base = generarEnsayos(ENSAYOS_PRUEBA, 5).map((e) => ({ ...e, respuesta: e.tinta, ms: 600 }));
    expect(limpiarEnsayos(base)).toHaveLength(ENSAYOS_PRUEBA);
    expect(limpiarEnsayos(base.slice(1))).toBeUndefined();
    expect(limpiarEnsayos([...base.slice(1), { ...base[0], respuesta: "morado" }])).toBeUndefined();
    const extremos = limpiarEnsayos([{ ...base[0], ms: 3 }, { ...base[1], ms: 99_999 }, ...base.slice(2)])!;
    expect(extremos[0].ms).toBe(MS_MINIMO);
    expect(extremos[1].ms).toBe(MS_MAXIMO);
    // Todo congruente no salió de la prueba.
    expect(limpiarEnsayos(base.map((e) => ({ ...e, tinta: e.palabra, respuesta: e.palabra })))).toBeUndefined();
  });

  it("ubica el semestre en hora del centro de México", () => {
    expect(semestreDe(new Date("2026-03-01T12:00:00Z"))).toBe("2026-1");
    expect(semestreDe(new Date("2026-11-28T12:00:00Z"))).toBe("2026-2");
    // 1 de julio a las 3:00 UTC todavía es 30 de junio en México.
    expect(semestreDe(new Date("2026-07-01T03:00:00Z"))).toBe("2026-1");
  });

  it("abre la prueba de cierre 21 días antes del primer fin de curso del semestre", () => {
    expect(aperturaFin("2026-2", ["2026-12-10", "2026-12-18", "2027-05-30"])).toBe("2026-11-19");
    expect(aperturaFin("2026-2", [undefined])).toBe("2026-12-10");
    expect(aperturaFin("2026-1", [])).toBe("2026-06-09");
  });

  const aplicacion = (momento: AplicacionStroop["momento"], fecha: string, semestre = "2026-2"): AplicacionStroop => ({ alumnoId: "a1", semestre, momento, fecha, ensayos: [] });

  it("pide la de inicio una vez por semestre y la de cierre en su ventana", () => {
    const nov = new Date("2026-11-28T16:00:00Z");
    const sep = new Date("2026-09-01T16:00:00Z");
    expect(momentoPendiente([], "a1", sep)).toBe("inicio");
    expect(momentoPendiente([aplicacion("inicio", "2026-08-20T10:00:00Z", "2026-1")], "a1", sep)).toBe("inicio");
    const conInicio = [aplicacion("inicio", "2026-08-20T10:00:00Z")];
    expect(momentoPendiente(conInicio, "a1", sep, ["2026-12-15"])).toBeNull();
    expect(momentoPendiente(conInicio, "a1", nov, ["2026-12-15"])).toBe("fin");
    expect(momentoPendiente([...conInicio, aplicacion("fin", "2026-11-27T10:00:00Z")], "a1", nov, ["2026-12-15"])).toBeNull();
    // Otro alumno no cuenta.
    expect(momentoPendiente(conInicio, "a2", sep)).toBe("inicio");
  });

  it("si la de inicio fue ya en la ventana de cierre, no pide otra", () => {
    const nov = new Date("2026-11-28T16:00:00Z");
    expect(momentoPendiente([aplicacion("inicio", "2026-11-25T10:00:00Z")], "a1", nov, ["2026-12-15"])).toBeNull();
  });
});

describe("Modelo CREAR", () => {
  it("cada plantilla tiene las seis etapas con sus cuatro campos", () => {
    for (const d of DISCIPLINAS) {
      for (const e of ETAPAS_CREAR) {
        const etapa = PLANTILLAS[d][e];
        expect(etapa.elementos && etapa.procesos && etapa.modelos && etapa.evidencias, `${d}.${e}`).toBeTruthy();
      }
    }
  });

  it("asocia cada etapa a su nivel SOLO", () => {
    expect(SOLO_DE_ETAPA.comprender).toBe("multiestructural_basico");
    expect(SOLO_DE_ETAPA.representar).toBe("multiestructural_avanzado");
    expect(SOLO_DE_ETAPA.estrategia).toBe("relacional_basico");
    expect(SOLO_DE_ETAPA.aplicar).toBe("relacional_avanzado");
    expect(SOLO_DE_ETAPA.transferencia).toBe("abstracto_extendido");
  });

  it("sugiere la plantilla según la materia", () => {
    expect(disciplinaDeMateria("Física I")).toBe("fisica");
    expect(disciplinaDeMateria("Cálculo diferencial")).toBe("matematicas");
    expect(disciplinaDeMateria("Inglés intermedio")).toBe("lenguas");
    expect(disciplinaDeMateria("Mercadotecnia digital")).toBe("negocios");
    expect(disciplinaDeMateria("Historia de México")).toBe("sociales");
    expect(disciplinaDeMateria("Taller de cerámica")).toBe("general");
  });

  it("sin modelo guardado, el curso usa la plantilla de su materia", () => {
    const m = modeloDelCurso([], { id: "g1", materia: "Química" });
    expect(m).toMatchObject({ grupoId: "g1", disciplina: "quimica", version: 0, guardado: false });
    expect(m.etapas.comprender).toEqual(PLANTILLAS.quimica.comprender);
  });

  it("limpia los campos: recorta y rellena los vacíos con la plantilla", () => {
    const e = limpiarEtapas({ comprender: { elementos: "  Datos del caso  ", procesos: "", modelos: 5 }, aplicar: { evidencias: "x".repeat(LARGO_CAMPO + 50) } }, "fisica");
    expect(e.comprender.elementos).toBe("Datos del caso");
    expect(e.comprender.procesos).toBe(PLANTILLAS.fisica.comprender.procesos);
    expect(e.comprender.modelos).toBe(PLANTILLAS.fisica.comprender.modelos);
    expect(e.aplicar.evidencias).toHaveLength(LARGO_CAMPO);
    expect(Object.keys(e)).toEqual([...ETAPAS_CREAR]);
  });

  it("al guardar sube la versión y conserva la anterior; sin cambios, no", () => {
    const ahora = new Date("2026-11-28T16:00:00Z");
    const p = plantilla("fisica");
    const uno = guardarModelo([], "g1", "fisica", p, ahora);
    expect(uno.cambio).toBe(true);
    expect(uno.lista[0]).toMatchObject({ version: 1, actualizadoEn: ahora.toISOString() });
    expect(guardarModelo(uno.lista, "g1", "fisica", plantilla("fisica"), ahora).cambio).toBe(false);
    const cambiada = { ...p, comprender: { ...p.comprender, elementos: "Magnitudes y unidades" } };
    const dos = guardarModelo(uno.lista, "g1", "fisica", cambiada, ahora);
    expect(dos.lista).toHaveLength(1);
    expect(dos.lista[0].version).toBe(2);
    expect(dos.lista[0].anteriores?.[0]).toMatchObject({ version: 1, etapas: p });
    // Otro curso no se toca.
    const otro = guardarModelo(dos.lista, "g2", "general", plantilla("general"), ahora);
    expect(otro.lista.map((m) => m.grupoId).sort()).toEqual(["g1", "g2"]);
  });
});

describe("diagnóstico inicial", () => {
  const ahora = new Date("2026-09-01T16:00:00Z");
  const consentimiento = { alumnoId: "a1", version: VERSION_CONSENTIMIENTO, fecha: "2026-08-20T10:00:00Z", menor: false };
  const valoracion = { alumnoId: "a1", grupoId: "g1", matricula: "A1", asignaturaId: "fis", niveles: {}, creadaEn: "", actualizadaEn: "" };
  const stroop: AplicacionStroop = { alumnoId: "a1", semestre: "2026-2", momento: "inicio", fecha: "2026-08-21T10:00:00Z", ensayos: [] };
  const base = { grupos: [], asignaturas: [], valoraciones: [], consentimientosPerfil: [], stroop: [] };

  it("sin nada, todo pendiente", () => {
    const d = diagnosticoInicial(base, "a1", "g1", "fis", ahora);
    expect(d).toMatchObject({ consentimiento: false, autodiagnostico: "pendiente", stroopPendiente: "inicio", completo: false, semestre: "2026-2" });
  });

  it("completo con consentimiento, autodiagnóstico y Stroop de inicio", () => {
    const d = diagnosticoInicial({ ...base, consentimientosPerfil: [consentimiento], valoraciones: [valoracion], stroop: [stroop] }, "a1", "g1", "fis", ahora, ["2026-12-15"]);
    expect(d.completo).toBe(true);
    expect(d.stroop.inicio).toBe(stroop);
  });

  it("un curso sin temario no pide autodiagnóstico", () => {
    const d = diagnosticoInicial({ ...base, consentimientosPerfil: [consentimiento], stroop: [stroop] }, "a1", "g1", undefined, ahora, ["2026-12-15"]);
    expect(d.autodiagnostico).toBe("sin_temario");
    expect(d.completo).toBe(true);
  });

  it("el profesor solo ve los datos de quien dio su consentimiento", () => {
    const grupo: Grupo = {
      id: "g1",
      nombre: "3B",
      materia: "Física",
      ciclo: "2026",
      alumnos: [
        { matricula: "A1", nombre: "Ana", correo: "ana@x.mx" },
        { matricula: "B2", nombre: "Beto", correo: "beto@x.mx" },
        { matricula: "C3", nombre: "Caro", correo: "" },
      ],
    };
    const cuenta = (id: string, correo: string, matricula: string): CuentaAlumno => ({ id, tipo: "alumno", correo, nombre: "", matricula, contrasena: "", creadoEn: "" });
    const stroopB: AplicacionStroop = { ...stroop, alumnoId: "b2" };
    const db = {
      ...base,
      grupos: [grupo],
      cuentasAlumno: [cuenta("a1", "ana@x.mx", "A1"), cuenta("b2", "beto@x.mx", "B2")],
      consentimientosPerfil: [consentimiento],
      valoraciones: [valoracion],
      stroop: [stroop, stroopB],
    };
    const filas = filasDiagnostico(db, grupo, "fis", ahora);
    expect(filas.map((f) => f.alumnoId)).toEqual(["a1", "b2", undefined]);
    expect(filas[0].diagnostico?.stroop.inicio).toBe(stroop);
    expect(filas[1].diagnostico?.consentimiento).toBe(false);
    expect(filas[1].diagnostico?.stroop).toEqual({});
    expect(resumenGrupo(filas)).toEqual({ alumnos: 3, consentimiento: 1, autodiagnostico: 1, stroopInicio: 1, stroopFin: 0 });
  });
});

describe("datos del perfil para el profesor", () => {
  it("solo trae las cuentas y el perfil de los alumnos del curso", async () => {
    const { datosPerfilGrupo } = await import("../perfil/diagnostico-inicial");
    const g1: Grupo = { id: "g1", nombre: "A", materia: "Física", ciclo: "", alumnos: [{ matricula: "A1", nombre: "Ana", correo: "ana@x.mx" }] };
    const g2: Grupo = { id: "g2", nombre: "B", materia: "Química", ciclo: "", fin: "2026-12-10", alumnos: [{ matricula: "Z9", nombre: "Zoe", correo: "zoe@x.mx" }, { matricula: "A1", nombre: "Ana", correo: "ana@x.mx" }] };
    const cuenta = (id: string, correo: string): CuentaAlumno => ({ id, tipo: "alumno", correo, nombre: "", matricula: "", contrasena: "", creadoEn: "" });
    const db = {
      version: 3 as const,
      profesores: [],
      sesiones: [],
      actividades: [],
      entregas: [],
      movimientos: [],
      grupos: [g1, g2],
      cuentasAlumno: [cuenta("ana", "ana@x.mx"), cuenta("zoe", "zoe@x.mx")],
      consentimientosPerfil: [
        { alumnoId: "ana", version: VERSION_CONSENTIMIENTO, fecha: "", menor: false },
        { alumnoId: "zoe", version: VERSION_CONSENTIMIENTO, fecha: "", menor: false },
      ],
      stroop: [{ alumnoId: "zoe", semestre: "2026-2", momento: "inicio" as const, fecha: "", ensayos: [] }],
    };
    const d = datosPerfilGrupo(db, g1);
    expect(d.cuentasAlumno.map((c) => c.id)).toEqual(["ana"]);
    expect(d.consentimientosPerfil?.map((c) => c.alumnoId)).toEqual(["ana"]);
    expect(d.stroop).toEqual([]);
    // Del otro curso solo queda Ana (para la fecha de fin), no Zoe.
    expect(d.grupos.find((g) => g.id === "g2")?.alumnos.map((a) => a.matricula)).toEqual(["A1"]);
  });
});

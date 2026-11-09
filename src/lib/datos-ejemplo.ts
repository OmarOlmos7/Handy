// Datos de ejemplo para la iteración 1 (sin backend). Se generan de forma
// determinista para que cada recarga muestre lo mismo.
import type {
  Actividad,
  Alumno,
  Confianza,
  Entrega,
  Grupo,
  Reactivo,
  ResultadoReactivo,
} from "./tipos";

const PASOS_ESTANDAR = [
  { nombre: "Datos", peso: 0.15 },
  { nombre: "Ecuación", peso: 0.2 },
  { nombre: "Sustitución", peso: 0.2 },
  { nombre: "Desarrollo", peso: 0.2 },
  { nombre: "Resultado con unidades", peso: 0.25 },
];

const alumnos: Alumno[] = [
  ["A0231", "Sofía Hernández Ruiz"],
  ["A0232", "Diego Martínez López"],
  ["A0233", "Valeria García Torres"],
  ["A0234", "Mateo Rodríguez Peña"],
  ["A0235", "Camila Sánchez Flores"],
  ["A0236", "Santiago Ramírez Cruz"],
  ["A0237", "Ximena Morales Díaz"],
  ["A0238", "Emiliano Vázquez Ortiz"],
  ["A0239", "Regina Castillo Reyes"],
  ["A0240", "Leonardo Jiménez Ramos"],
  ["A0241", "Renata Gutiérrez Mendoza"],
  ["A0242", "Andrés Navarro Aguilar"],
].map(([matricula, nombre]) => ({
  matricula,
  nombre,
  correo: `${matricula.toLowerCase()}@escuela.edu.mx`,
}));

export const grupos: Grupo[] = [
  { id: "fis-3b", nombre: "3° B", materia: "Física", ciclo: "2026-2027", alumnos },
  {
    id: "mat-2a",
    nombre: "2° A",
    materia: "Matemáticas",
    ciclo: "2026-2027",
    alumnos: alumnos.slice(0, 9),
  },
];

const reactivosCinematica: Reactivo[] = [
  {
    numero: 1,
    tipo: "verdadero_falso",
    enunciado: "Un objeto con velocidad constante tiene aceleración cero.",
    respuesta: "V",
    puntos: 1,
    tema: "MRU",
    habilidad: "Comprensión de conceptos",
    pagina: 1,
  },
  {
    numero: 2,
    tipo: "opcion_multiple",
    enunciado: "La unidad de la aceleración en el SI es:",
    respuesta: "c) m/s²",
    puntos: 1,
    tema: "Unidades",
    habilidad: "Comprensión de conceptos",
    pagina: 1,
  },
  {
    numero: 3,
    tipo: "relacion_columnas",
    enunciado: "Relaciona cada fórmula con la magnitud que calcula.",
    respuesta: "1-c, 2-a, 3-b",
    puntos: 2,
    tema: "Fórmulas",
    habilidad: "Uso de fórmulas",
    pagina: 1,
  },
  {
    numero: 4,
    tipo: "parentesis",
    enunciado: "Escribe en el paréntesis la letra de la gráfica que corresponde.",
    respuesta: "(b) (a) (c)",
    puntos: 1,
    tema: "Gráficas",
    habilidad: "Interpretación de gráficas",
    pagina: 1,
  },
  {
    numero: 5,
    tipo: "desarrollo",
    enunciado: "Un auto recorre 150 km en 2 h. Calcula su velocidad.",
    respuesta: "75 km/h",
    puntos: 2,
    tema: "MRU",
    habilidad: "Resolución de problemas",
    pagina: 2,
    pasos: PASOS_ESTANDAR,
    solucionPasos: ["d = 150 km,  t = 2 h", "v = d / t", "v = 150 km / 2 h", "v = 75", "v = 75 km/h"],
  },
  {
    numero: 6,
    tipo: "desarrollo",
    enunciado: "Un móvil parte del reposo con a = 2 m/s². ¿Qué distancia recorre en 5 s?",
    respuesta: "25 m",
    puntos: 3,
    tema: "MRUA",
    habilidad: "Resolución de problemas",
    pagina: 2,
    pasos: PASOS_ESTANDAR,
    solucionPasos: ["v₀ = 0,  a = 2 m/s²,  t = 5 s", "d = v₀·t + ½·a·t²", "d = 0 + ½(2)(5)²", "d = ½(2)(25) = 25", "d = 25 m"],
  },
  {
    numero: 7,
    tipo: "desarrollo",
    enunciado: "Un tren frena de 20 m/s a 0 m/s en 10 s. Calcula su aceleración.",
    respuesta: "-2 m/s²",
    puntos: 3,
    tema: "MRUA",
    habilidad: "Resolución de problemas",
    pagina: 3,
    pasos: PASOS_ESTANDAR,
    solucionPasos: ["v₀ = 20 m/s,  v = 0,  t = 10 s", "a = (v − v₀) / t", "a = (0 − 20) / 10", "a = −20 / 10", "a = −2 m/s²"],
  },
  {
    numero: 8,
    tipo: "abierto",
    enunciado: "Explica con tus palabras la diferencia entre MRU y MRUA.",
    respuesta: "MRU: velocidad constante. MRUA: la velocidad cambia de forma constante (aceleración constante).",
    puntos: 2,
    tema: "MRU y MRUA",
    habilidad: "Comunicación escrita",
    pagina: 3,
  },
];

const reactivosVectores: Reactivo[] = [
  {
    numero: 1,
    tipo: "opcion_multiple",
    enunciado: "¿Cuál de estas magnitudes es vectorial?",
    respuesta: "b) Fuerza",
    puntos: 2,
    tema: "Magnitudes",
    habilidad: "Comprensión de conceptos",
    pagina: 1,
  },
  {
    numero: 2,
    tipo: "verdadero_falso",
    enunciado: "La masa es una magnitud vectorial.",
    respuesta: "F",
    puntos: 2,
    tema: "Magnitudes",
    habilidad: "Comprensión de conceptos",
    pagina: 1,
  },
  {
    numero: 3,
    tipo: "desarrollo",
    enunciado: "Suma los vectores A = 3 N (este) y B = 4 N (norte). Calcula la magnitud de la resultante.",
    respuesta: "5 N",
    puntos: 6,
    tema: "Suma de vectores",
    habilidad: "Resolución de problemas",
    pagina: 2,
    pasos: PASOS_ESTANDAR,
    solucionPasos: ["A = 3 N,  B = 4 N", "R = √(A² + B²)", "R = √(3² + 4²)", "R = √25", "R = 5 N"],
  },
];

export const actividades: Actividad[] = [
  {
    id: "cinematica-mru-mrua",
    grupoId: "fis-3b",
    titulo: "Cinemática: MRU y MRUA",
    descripcion: "Cuestionario y problemas de movimiento rectilíneo.",
    fechaAplicacion: "2026-11-05",
    paginas: 3,
    estado: "en_revision",
    reactivos: reactivosCinematica,
  },
  {
    id: "vectores",
    grupoId: "fis-3b",
    titulo: "Vectores y suma de fuerzas",
    descripcion: "Quiz de magnitudes y un problema de suma de vectores.",
    fechaAplicacion: "2026-10-22",
    paginas: 2,
    estado: "publicada",
    reactivos: reactivosVectores,
  },
  {
    id: "leyes-newton",
    grupoId: "fis-3b",
    titulo: "Leyes de Newton",
    descripcion: "Problemas de segunda ley y diagramas de cuerpo libre.",
    fechaAplicacion: "2026-11-12",
    paginas: 2,
    estado: "esperando_entregas",
    reactivos: [],
  },
];

// Generador pseudoaleatorio con semilla (mulberry32) para datos estables.
function aleatorio(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RESPUESTAS_INCORRECTAS: Record<string, string> = {
  verdadero_falso: "F",
  opcion_multiple: "a) m/s",
  relacion_columnas: "1-a, 2-c, 3-b",
  parentesis: "(a) (b) (c)",
};

const COMENTARIO_PASO: Record<string, string> = {
  Datos: "Faltó escribir los datos del problema.",
  Ecuación: "La ecuación elegida no corresponde al tipo de movimiento.",
  Sustitución: "Revisa la sustitución de valores en la fórmula.",
  Desarrollo: "Hay un error en las operaciones del desarrollo.",
  "Resultado con unidades": "El resultado no incluye unidades o son incorrectas.",
};

function redondear(n: number, decimales = 2) {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
}

function evaluarReactivo(r: Reactivo, nivel: number, azar: () => number): ResultadoReactivo {
  const dificultad = r.tipo === "desarrollo" ? 0.15 : r.tipo === "abierto" ? 0.1 : 0;
  const confianza: Confianza = azar() < 0.08 ? "baja" : azar() < 0.18 ? "media" : "alta";

  if (r.tipo === "desarrollo" && r.pasos) {
    const pasos: number[] = r.pasos.map(() => {
      const x = azar();
      if (x < nivel - dificultad) return 1;
      if (x < nivel + 0.15) return 0.5;
      return 0;
    });
    const fraccion = r.pasos.reduce((s, p, i) => s + p.peso * pasos[i], 0);
    const peorPaso = r.pasos[pasos.indexOf(Math.min(...pasos))];
    const completo = pasos.every((p) => p === 1);
    return {
      numero: r.numero,
      puntosObtenidos: Math.round(fraccion * r.puntos * 4) / 4,
      respuestaLeida: completo ? r.respuesta : pasos[4] === 0 ? "sin unidades" : r.respuesta,
      confianza,
      comentario: completo
        ? "Procedimiento completo y ordenado, igual a la estructura pedida."
        : COMENTARIO_PASO[peorPaso.nombre],
      pasos,
    };
  }

  if (r.tipo === "abierto") {
    const x = azar() * 0.6 + nivel * 0.5;
    const fraccion = x > 0.85 ? 1 : x > 0.55 ? 0.5 : 0.25;
    return {
      numero: r.numero,
      puntosObtenidos: redondear(fraccion * r.puntos),
      respuestaLeida: "(texto del alumno)",
      confianza: confianza === "alta" ? "media" : confianza,
      comentario:
        fraccion === 1
          ? "Explica con claridad ambos movimientos y da un ejemplo."
          : fraccion === 0.5
            ? "Describe el MRU, pero no menciona que en el MRUA la aceleración es constante."
            : "La explicación es incompleta; repasa la definición de aceleración.",
    };
  }

  const acierta = azar() < nivel + 0.1;
  return {
    numero: r.numero,
    puntosObtenidos: acierta ? r.puntos : 0,
    respuestaLeida: acierta ? r.respuesta : RESPUESTAS_INCORRECTAS[r.tipo],
    confianza,
    comentario: acierta ? "Correcto." : `La respuesta correcta es ${r.respuesta}.`,
  };
}

function resumenTexto(actividad: Actividad, resultados: ResultadoReactivo[]) {
  const positivos: string[] = [];
  const mejoras: string[] = [];
  for (const r of actividad.reactivos) {
    const res = resultados.find((x) => x.numero === r.numero)!;
    const fraccion = res.puntosObtenidos / r.puntos;
    if (fraccion === 1 && positivos.length < 3) {
      positivos.push(`Dominas el tema ${r.tema} (reactivo ${r.numero}).`);
    } else if (fraccion < 0.6 && mejoras.length < 3) {
      mejoras.push(`Reactivo ${r.numero} (${r.tema}): ${res.comentario}`);
    }
  }
  if (positivos.length === 0) positivos.push("Entregaste la actividad completa y ordenada.");
  if (mejoras.length === 0) mejoras.push("Sigue practicando problemas con unidades del SI.");
  return { positivos, mejoras };
}

function generarEntregas(actividad: Actividad, semilla: number): Entrega[] {
  const grupo = grupos.find((g) => g.id === actividad.grupoId)!;
  const azar = aleatorio(semilla);
  return grupo.alumnos.map((alumno, i) => {
    // El último alumno de la lista no entregó (para mostrar ese caso en la interfaz).
    if (i === grupo.alumnos.length - 1 || actividad.reactivos.length === 0) {
      return {
        actividadId: actividad.id,
        matricula: alumno.matricula,
        estado: "sin_entregar",
        paginasRecibidas: 0,
        resultados: [],
        positivos: [],
        mejoras: [],
      };
    }
    const nivel = 0.55 + azar() * 0.45;
    const resultados = actividad.reactivos.map((r) => evaluarReactivo(r, nivel, azar));
    const { positivos, mejoras } = resumenTexto(actividad, resultados);
    return {
      actividadId: actividad.id,
      matricula: alumno.matricula,
      estado: actividad.estado === "publicada" ? "aprobada" : "evaluada",
      paginasRecibidas: actividad.paginas,
      resultados,
      positivos,
      mejoras,
    };
  });
}

export const entregas: Entrega[] = actividades.flatMap((a, i) => generarEntregas(a, 2026 + i * 17));

// Consultas. Al conectar la API, estas funciones harán fetch al backend.
export function obtenerGrupo(id: string) {
  return grupos.find((g) => g.id === id);
}
export function obtenerActividad(id: string) {
  return actividades.find((a) => a.id === id);
}
export function actividadesDeGrupo(grupoId: string) {
  return actividades.filter((a) => a.grupoId === grupoId);
}
export function entregasDeActividad(actividadId: string) {
  return entregas.filter((e) => e.actividadId === actividadId);
}
export function obtenerEntrega(actividadId: string, matricula: string) {
  return entregas.find((e) => e.actividadId === actividadId && e.matricula === matricula);
}
export function obtenerAlumno(matricula: string) {
  for (const g of grupos) {
    const a = g.alumnos.find((x) => x.matricula === matricula);
    if (a) return a;
  }
  return undefined;
}

export const saldoCreditos = 412;

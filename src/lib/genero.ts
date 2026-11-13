// Estimación del género a partir del nombre de pila, solo para las analíticas del curso.
// Se hace con reglas en el código (sin IA) y el profesor siempre puede corregirla.
import type { Alumno, Genero } from "./tipos";

function limpiar(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-zñ\s,]/g, " ")
    .trim();
}

// Nombres frecuentes en México. Se guardan sin acentos y en minúsculas.
const FEMENINOS = new Set(
  `abigail aitana alejandra alexa alexandra alicia alma ana andrea angela angelica antonia ariadna arlette astrid aurora
  barbara beatriz belen berenice blanca brenda brisa camila carla carmen carolina catalina cecilia citlali clara claudia
  constanza cristina daniela danna dayana debora diana dulce elena elisa elizabeth elsa emilia emily erika esmeralda
  estefania estela esther eva evelyn fabiola fatima fernanda flor frida gabriela genesis gisela gloria grecia guadalupe
  hannah ingrid irene iris isabel isabela isabella itzel ivana ivonne jacqueline jazmin jennifer jessica jimena joselyn
  josefina juana julia juliana karen karina karla kenia kimberly laura leticia lilia liliana lizbeth lorena lourdes lucia
  luciana luisa luz maite marcela margarita maria mariana maribel marisol marta martha mayra melanie melissa mercedes
  mia michelle miranda monica montserrat nadia nancy natalia nayeli nicole noemi norma olivia paola patricia paula
  paulina perla pilar priscila rebeca regina renata rocio rosa rosario ruth samantha sandra sara sarahi silvia sofia
  sonia stephanie susana tania teresa valentina valeria vanessa veronica victoria viviana wendy ximena yamileth yaretzi
  yesenia yolanda yuridia zoe`.split(/\s+/),
);

const MASCULINOS = new Set(
  `aaron abraham adan adrian agustin alan alberto alejandro alexis alfonso alfredo alonso alvaro andres angel antonio
  ariel armando arturo axel bautista benjamin bernardo bruno carlos cesar christian cristian cristobal damian daniel
  dante david diego eduardo efrain elias eliseo emanuel emiliano emilio enrique erick ernesto esteban eugenio ezequiel
  fabian felipe fernando francisco gabriel gael gerardo german gilberto gonzalo gregorio guillermo gustavo hector hugo
  ian ignacio isaac isaias ismael ivan jacobo jaime javier jesus jonathan jorge jose josue juan julian julio kevin
  leonardo leonel lorenzo luca lucas luis manuel marco marcos mario martin mateo matias mauricio maximiliano miguel
  moises nicolas noe octavio omar oscar pablo patricio pedro rafael ramiro ramon raul ricardo roberto rodrigo rogelio
  ruben salvador samuel santiago saul sebastian sergio thiago tomas ulises uriel valentin victor vicente yahir`.split(/\s+/),
);

// Nombres que terminan en "a" pero son masculinos (la regla de la terminación fallaría).
const MASCULINOS_EN_A = new Set(["luca", "bautista", "elia", "garcia", "nikita", "joshua", "josua"]);

function porDiccionario(token: string): Genero | undefined {
  if (FEMENINOS.has(token)) return "F";
  if (MASCULINOS.has(token)) return "M";
  return undefined;
}

/**
 * Género estimado según el nombre: "Sofía Hernández" → F, "Diego Martínez" → M.
 * Acepta también "Apellidos, Nombre". Si no hay pista clara devuelve undefined.
 */
export function inferirGenero(nombreCompleto: string): Genero | undefined {
  const texto = limpiar(nombreCompleto);
  if (!texto) return undefined;
  // "Hernández Ruiz, Sofía": el nombre va después de la coma.
  const nombre = texto.includes(",") ? texto.split(",").slice(1).join(" ") : texto;
  const tokens = nombre.split(/\s+/).filter(Boolean);
  if (!tokens.length) return undefined;

  // "María José" es femenino y "José María" masculino: manda el primer nombre.
  const primero = tokens[0];
  const directo = porDiccionario(primero);
  if (directo) return directo;

  // Listas escritas como "Apellido Apellido Nombre": busca un nombre conocido en el resto.
  for (const t of tokens.slice(1)) {
    const g = porDiccionario(t);
    if (g) return g;
  }

  // Última opción: terminación del primer nombre.
  if (primero.length >= 3 && !MASCULINOS_EN_A.has(primero)) {
    if (primero.endsWith("a")) return "F";
    if (primero.endsWith("o")) return "M";
  }
  return undefined;
}

/**
 * Género que usan las analíticas: el que asignó el profesor o, si no lo ha hecho, el estimado.
 * `null` en el alumno significa que el profesor eligió "Sin dato" a propósito.
 */
export function generoDe(alumno: Alumno): { genero?: Genero; estimado: boolean } {
  if (alumno.genero === null) return { estimado: false };
  if (alumno.genero) return { genero: alumno.genero, estimado: false };
  const g = inferirGenero(alumno.nombre);
  return { genero: g, estimado: !!g };
}

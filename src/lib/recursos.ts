// Videos y lecturas para estudiar: Khan Academy, YouTube y OpenStax. Los enlaces salen de
// una búsqueda web real; aquí se validan y se ordenan. Funciones puras para poder probarlas.
import type { Actividad, RecursoEstudio } from "./tipos";

/** Dominios que se buscan y se aceptan. */
export const DOMINIOS_RECURSOS = ["khanacademy.org", "es.khanacademy.org", "youtube.com", "www.youtube.com", "openstax.org"];

function host(url: URL) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

/** Id de un video de YouTube, o undefined si el enlace no es de un video. */
export function idYouTube(url: string): string | undefined {
  try {
    const u = new URL(url);
    const h = host(u);
    let id: string | null | undefined;
    if (h === "youtu.be") id = u.pathname.slice(1);
    else if (h === "youtube.com" || h === "m.youtube.com") id = u.pathname === "/watch" ? u.searchParams.get("v") : u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

/** Normaliza el enlace y confirma que corresponde al tipo de recurso; undefined si no sirve. */
export function normalizarRecurso(r: { tipo: string; titulo: string; url: string; fuente?: string }): RecursoEstudio | undefined {
  const titulo = r.titulo.trim().slice(0, 160);
  if (!titulo) return undefined;
  let u: URL;
  try {
    u = new URL(r.url.trim());
  } catch {
    return undefined;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return undefined;
  const h = host(u);
  const fuente = (r.fuente ?? "").trim().slice(0, 120);
  const ytId = idYouTube(u.toString());
  if (ytId) return { tipo: "video", titulo, url: `https://www.youtube.com/watch?v=${ytId}`, fuente: fuente || "YouTube" };
  if (h === "khanacademy.org" || h.endsWith(".khanacademy.org")) {
    if (u.pathname.length < 2 || /^\/(search|login|signup)/.test(u.pathname)) return undefined;
    return { tipo: "khan", titulo, url: `https://${u.hostname}${u.pathname}`, fuente: fuente || "Khan Academy" };
  }
  if (h === "openstax.org" && /^\/books\/[^/]+\/pages\/[^/]+/.test(u.pathname)) {
    return { tipo: "openstax", titulo, url: `https://openstax.org${u.pathname}`, fuente: fuente || "OpenStax" };
  }
  return undefined;
}

const LIMITE: Record<RecursoEstudio["tipo"], number> = { khan: 1, video: 2, openstax: 1 };

/** Deja, por tema, a lo más 1 de Khan Academy, 2 videos y 1 sección de OpenStax, sin repetir. */
export function limpiarRecursos(
  porTema: { tema: string; recursos: { tipo: string; titulo: string; url: string; fuente?: string }[] }[],
  temasValidos: string[],
): Record<string, RecursoEstudio[]> {
  const salida: Record<string, RecursoEstudio[]> = {};
  const vistos = new Set<string>();
  for (const { tema, recursos } of porTema) {
    const clave = temasValidos.find((t) => t.toLowerCase() === tema.trim().toLowerCase());
    if (!clave) continue;
    const lista = (salida[clave] ??= []);
    for (const r of recursos) {
      const n = normalizarRecurso(r);
      if (!n || vistos.has(n.url) || lista.filter((x) => x.tipo === n.tipo).length >= LIMITE[n.tipo]) continue;
      vistos.add(n.url);
      lista.push(n);
    }
  }
  return salida;
}

/** Recursos para los temas de un alumno: hasta 3 videos (Khan Academy primero) y las lecturas de OpenStax. */
export function recursosParaTemas(actividad: Pick<Actividad, "recursos">, temas: string[]) {
  const todos = temas.flatMap((t) => actividad.recursos?.temas[t] ?? []);
  const unicos = todos.filter((r, i) => todos.findIndex((x) => x.url === r.url) === i);
  const videos = [...unicos.filter((r) => r.tipo === "khan"), ...unicos.filter((r) => r.tipo === "video")].slice(0, 3);
  const lecturas = unicos.filter((r) => r.tipo === "openstax").slice(0, 3);
  return { videos, lecturas };
}

/** Saca el primer objeto JSON de un texto (la respuesta con búsqueda web no usa salida estructurada). */
export function extraerJson(texto: string): unknown {
  const bloque = texto.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1] ?? texto;
  const ini = bloque.indexOf("{");
  const fin = bloque.lastIndexOf("}");
  if (ini < 0 || fin <= ini) return undefined;
  try {
    return JSON.parse(bloque.slice(ini, fin + 1));
  } catch {
    return undefined;
  }
}

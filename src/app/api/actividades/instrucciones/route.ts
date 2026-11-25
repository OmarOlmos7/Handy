import { leer } from "@/lib/almacen";
import { leerEntregaContenido, revisarArchivos } from "@/lib/contenido";
import { ErrorIA, redactarInstrucciones } from "@/lib/ia";
import { esIdioma } from "@/lib/i18n/idiomas";
import { materialDeSubidos } from "@/lib/material-ia";
import { profesorActual } from "@/lib/sesion";

export const maxDuration = 120;

// Actividad de contenido: la IA redacta las instrucciones para el alumno a partir de lo que pide
// el profesor y del material elegido (aún sin guardar). No consume créditos, como crear la actividad.
export async function POST(req: Request) {
  const profesor = await profesorActual();
  if (!profesor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const form = await req.formData();
  const peticion = String(form.get("peticion") ?? "").trim().slice(0, 4000);
  if (peticion.length < 10) return Response.json({ error: "Describe qué quieres que haga el alumno" }, { status: 400 });
  const titulo = String(form.get("titulo") ?? "").trim().slice(0, 120);
  const db = await leer();
  const grupo = db.grupos.find((g) => g.id === String(form.get("grupo") ?? "") && g.profesorId === profesor.id);
  const archivos = form.getAll("anexos").filter((f): f is File => f instanceof File && f.size > 0);
  if (revisarArchivos(archivos, 20)) return Response.json({ error: "Revisa los archivos: alguno no se acepta o pesa demasiado" }, { status: 400 });
  let otros: string[] = [];
  try {
    otros = JSON.parse(String(form.get("otros") ?? "[]"));
  } catch {
    otros = [];
  }
  const idioma = form.get("idioma");
  try {
    const material = await materialDeSubidos(archivos, Array.isArray(otros) ? otros.map(String) : []);
    const instrucciones = await redactarInstrucciones(
      { titulo, materia: grupo?.materia, peticion, entrega: leerEntregaContenido(form.get("entregaContenido")), material },
      { profesorId: profesor.id, idioma: esIdioma(idioma) ? idioma : undefined },
    );
    return Response.json({ instrucciones });
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof ErrorIA ? e.message : "No se pudieron redactar las instrucciones." }, { status: 502 });
  }
}

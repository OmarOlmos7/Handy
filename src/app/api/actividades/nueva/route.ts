import { PDFDocument } from "pdf-lib";
import { borrarCarpeta, guardarArchivo, leer, leerArchivo, modificar, slug } from "@/lib/almacen";
import { ErrorIA, generarActividad } from "@/lib/ia";
import { guardarSubidos } from "@/lib/imagenes";
import { profesorActual } from "@/lib/sesion";
import type { Actividad } from "@/lib/tipos";
import { deCampoFechaHora } from "@/lib/resultados";

export const maxDuration = 300;

// Paso 1: crear la actividad. Dos opciones:
// - "ia": Claude genera la actividad (reactivos, puntos, instrucciones) a partir del prompt del profesor.
// - "escaneada": el profesor sube su actividad en blanco (fotos o PDF).
// Generar o cargar la actividad no consume créditos.
export async function POST(req: Request) {
  const profesor = await profesorActual();
  if (!profesor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const form = await req.formData();
  const modo = String(form.get("modo") ?? "");
  const titulo = String(form.get("titulo") ?? "").trim().slice(0, 120);
  const grupoId = String(form.get("grupo") ?? "");
  const fecha = String(form.get("fecha") || new Date().toISOString().slice(0, 10));
  const instrucciones = String(form.get("instrucciones") ?? "").trim();
  const grupo = (await leer()).grupos.find((g) => g.id === grupoId && g.profesorId === profesor.id);
  let resultadosDesde: string | undefined;
  try {
    resultadosDesde = deCampoFechaHora(String(form.get("resultadosDesde") ?? ""));
  } catch {
    return Response.json({ error: "La fecha y hora de los resultados no es válida" }, { status: 400 });
  }
  if (!titulo || !grupo) return Response.json({ error: "Escribe el título y elige el grupo" }, { status: 400 });

  const id = slug(titulo);
  const base: Actividad = {
    id,
    grupoId,
    titulo,
    descripcion: "",
    fechaAplicacion: fecha,
    paginas: Math.max(1, Math.min(10, Number(form.get("paginas")) || 1)),
    estado: "esperando_entregas",
    instrucciones,
    reactivos: [],
    rubricaConfirmada: false,
    escala: form.get("escala") === "10" ? 10 : 100,
    resultadosDesde,
  };

  if (modo === "ia") {
    const prompt = String(form.get("prompt") ?? "").trim().slice(0, 4000);
    if (prompt.length < 10) return Response.json({ error: "Describe la actividad: tipo de reactivos, ponderaciones y temas" }, { status: 400 });
    try {
      const generada = await generarActividad({ titulo, materia: grupo.materia, grupo: grupo.nombre, prompt, paginas: base.paginas, escala: base.escala }, { profesorId: profesor.id, actividadId: id });
      Object.assign(base, {
        origen: "ia",
        prompt,
        instruccionesAlumno: generada.instrucciones,
        criterios: generada.criterios,
        reactivos: generada.reactivos,
      });
    } catch (e) {
      console.error(e);
      return Response.json({ error: e instanceof ErrorIA ? e.message : "No se pudo generar la actividad." }, { status: 502 });
    }
  } else if (modo === "escaneada") {
    const archivos = form.getAll("archivos").filter((f): f is File => f instanceof File && f.size > 0);
    if (archivos.length === 0) return Response.json({ error: "Sube las fotos o el PDF de tu actividad" }, { status: 400 });
    if (archivos.length > 10) return Response.json({ error: "Máximo 10 archivos" }, { status: 400 });
    try {
      const { rutas } = await guardarSubidos(archivos, `actividades/${id}/hoja`, guardarArchivo);
      let paginas = 0;
      for (const r of rutas) paginas += r.endsWith(".pdf") ? (await PDFDocument.load(leerArchivo(r), { ignoreEncryption: true })).getPageCount() : 1;
      Object.assign(base, { origen: "escaneada", archivos: rutas, paginas: Math.max(1, Math.min(20, paginas)) });
    } catch {
      borrarCarpeta(`actividades/${id}`);
      return Response.json({ error: "Algún archivo no es una imagen o PDF válido" }, { status: 400 });
    }
  } else {
    return Response.json({ error: "Elige cómo crear la actividad" }, { status: 400 });
  }

  modificar((db) => {
    db.actividades.unshift(base);
  });
  return Response.json({ id, siguiente: `/profesor/actividades/${id}/hoja` });
}

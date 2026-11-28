import { revalidatePath } from "next/cache";
import { borrarCarpeta, leer, modificar } from "@/lib/almacen";
import { MAX_EVIDENCIAS } from "@/lib/contenido";
import { sujetoDe } from "@/lib/proyectos";
import { alumnoActual, matriculaEnCurso } from "@/lib/sesion";
import { ErrorArchivos, guardarArchivosContenido } from "@/lib/subir-contenido";

export const maxDuration = 120;

// Evidencia del alumno (o de su equipo) en una etapa del proyecto, con su comentario. Si la etapa
// tiene entregables, cada uno se sube (y se reemplaza) por separado. Se puede cambiar mientras la
// etapa esté abierta; en una etapa por equipo, cualquier integrante la sube por todos.
export async function POST(req: Request, ctx: RouteContext<"/api/proyectos/[id]/entrega">) {
  const { id } = await ctx.params;
  const alumno = await alumnoActual();
  if (!alumno) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const db = await leer();
  const proyecto = (db.proyectos ?? []).find((p) => p.id === id);
  const matricula = proyecto && matriculaEnCurso(alumno, proyecto.grupoId);
  if (!proyecto || !matricula) return Response.json({ error: "No encontrado" }, { status: 404 });
  const form = await req.formData();
  const etapa = proyecto.etapas.find((e) => e.id === String(form.get("etapa") ?? ""));
  if (!etapa || !etapa.conEvidencia) return Response.json({ error: "Esta etapa no recibe evidencia" }, { status: 400 });
  if (etapa.cerradaEn) return Response.json({ error: "La etapa ya está cerrada" }, { status: 423 });
  const archivos = form.getAll("archivos").filter((f): f is File => f instanceof File && f.size > 0);
  const comentario = String(form.get("comentario") ?? "").trim().slice(0, 1500);
  const entregables = etapa.entregables ?? [];
  const entregableId = String(form.get("entregable") ?? "");
  if (entregables.length && !entregables.some((d) => d.id === entregableId)) return Response.json({ error: "Elige el entregable" }, { status: 400 });
  const sujeto = sujetoDe(proyecto, etapa, matricula);
  const previa = (db.entregasProyecto ?? []).find((e) => e.proyectoId === id && e.etapaId === etapa.id && e.sujeto === sujeto);
  const yaHay = entregables.length ? previa?.porEntregable?.some((x) => x.entregableId === entregableId) : Boolean(previa);
  // Sin archivos solo se puede actualizar el comentario de lo que ya se entregó.
  if (!archivos.length && !yaHay) return Response.json({ error: "Elige al menos un archivo" }, { status: 400 });
  const carpeta = `proyectos/${id}/${etapa.id}/${sujeto.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  const sello = Date.now().toString(36);
  const destino = entregables.length ? `${carpeta}/${entregableId.replace(/[^A-Za-z0-9_-]/g, "_")}/${sello}` : `${carpeta}/${sello}`;
  let guardados: Awaited<ReturnType<typeof guardarArchivosContenido>> | undefined;
  if (archivos.length) {
    try {
      guardados = await guardarArchivosContenido(archivos, destino, MAX_EVIDENCIAS);
    } catch (e) {
      if (e instanceof ErrorArchivos) return Response.json({ error: e.nombre ? `${e.nombre}: ${e.clave}` : e.clave }, { status: 400 });
      throw e;
    }
  }
  let anteriores: string[] = [];
  const ahora = new Date().toISOString();
  modificar((d) => {
    const lista = (d.entregasProyecto ??= []);
    let entrega = lista.find((e) => e.proyectoId === id && e.etapaId === etapa.id && e.sujeto === sujeto);
    if (!entrega) {
      entrega = { proyectoId: id, etapaId: etapa.id, sujeto, archivos: [], nombres: [], matricula, entregadaEn: ahora };
      lista.push(entrega);
    }
    entrega.matricula = matricula;
    if (entregables.length) {
      const slots = (entrega.porEntregable ??= []);
      let slot = slots.find((x) => x.entregableId === entregableId);
      if (!slot) {
        slot = { entregableId, archivos: [], nombres: [], comentario: "", entregadaEn: ahora };
        slots.push(slot);
      }
      if (guardados) {
        anteriores = slot.archivos;
        slot.archivos = guardados.anexos.map((a) => a.ruta);
        slot.nombres = guardados.anexos.map((a) => a.nombre);
        slot.paginasIA = guardados.paginasIA;
        slot.entregadaEn = ahora;
      }
      slot.comentario = comentario;
      // Los archivos de todos los entregables, en el orden de la etapa, para el visor y la IA.
      const orden = entregables.map((x) => slots.find((y) => y.entregableId === x.id)).filter((x) => x !== undefined);
      entrega.archivos = orden.flatMap((x) => x.archivos);
      entrega.nombres = orden.flatMap((x) => x.nombres);
      entrega.paginasIA = orden.reduce((s, x) => s + (x.paginasIA ?? 0), 0);
      if (guardados) entrega.entregadaEn = ahora;
    } else {
      if (guardados) {
        anteriores = entrega.archivos;
        entrega.archivos = guardados.anexos.map((a) => a.ruta);
        entrega.nombres = guardados.anexos.map((a) => a.nombre);
        entrega.paginasIA = guardados.paginasIA;
        entrega.entregadaEn = ahora;
      }
      entrega.comentario = comentario || undefined;
    }
  });
  // Los archivos de la entrega anterior se borran (cada entrega vive en su propia subcarpeta).
  const viejas = new Set(anteriores.map((r) => r.split("/").slice(0, -1).join("/")));
  for (const c of viejas) if (c && c !== destino) borrarCarpeta(c);
  revalidatePath("/alumno", "layout");
  revalidatePath(`/profesor/proyectos/${id}`, "layout");
  return Response.json({ ok: true });
}

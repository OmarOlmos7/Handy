import { revalidatePath } from "next/cache";
import { borrarCarpeta, leer, modificar } from "@/lib/almacen";
import { MAX_EVIDENCIAS } from "@/lib/contenido";
import { sujetoDe } from "@/lib/proyectos";
import { alumnoActual, matriculaEnCurso } from "@/lib/sesion";
import { ErrorArchivos, guardarArchivosContenido } from "@/lib/subir-contenido";

export const maxDuration = 120;

// Evidencia del alumno (o de su equipo) en una etapa del proyecto. Se puede reemplazar mientras la
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
  if (!archivos.length) return Response.json({ error: "Elige al menos un archivo" }, { status: 400 });
  const sujeto = sujetoDe(proyecto, etapa, matricula);
  const carpeta = `proyectos/${id}/${etapa.id}/${sujeto.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  const sello = Date.now().toString(36);
  let guardados;
  try {
    guardados = await guardarArchivosContenido(archivos, `${carpeta}/${sello}`, MAX_EVIDENCIAS);
  } catch (e) {
    if (e instanceof ErrorArchivos) return Response.json({ error: e.nombre ? `${e.nombre}: ${e.clave}` : e.clave }, { status: 400 });
    throw e;
  }
  let anteriores: string[] = [];
  modificar((d) => {
    const lista = (d.entregasProyecto ??= []);
    const previa = lista.find((e) => e.proyectoId === id && e.etapaId === etapa.id && e.sujeto === sujeto);
    const nueva = {
      proyectoId: id,
      etapaId: etapa.id,
      sujeto,
      archivos: guardados.anexos.map((a) => a.ruta),
      nombres: guardados.anexos.map((a) => a.nombre),
      matricula,
      entregadaEn: new Date().toISOString(),
      paginasIA: guardados.paginasIA,
    };
    if (previa) {
      anteriores = previa.archivos;
      Object.assign(previa, nueva);
    } else lista.push(nueva);
  });
  // Los archivos de la entrega anterior se borran (cada entrega vive en su propia subcarpeta).
  const viejas = new Set(anteriores.map((r) => r.split("/").slice(0, -1).join("/")));
  for (const c of viejas) if (c && c !== `${carpeta}/${sello}`) borrarCarpeta(c);
  revalidatePath("/alumno", "layout");
  revalidatePath(`/profesor/proyectos/${id}`, "layout");
  return Response.json({ ok: true });
}

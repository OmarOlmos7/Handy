import { actividadDe, borrarCarpeta, grupoDe, guardarArchivo, leer, modificar } from "@/lib/almacen";
import { normalizarFoto } from "@/lib/imagenes";

// Entrega del alumno: fotos de sus hojas en el orden elegido.
export async function POST(req: Request, ctx: RouteContext<"/api/entregas/[id]">) {
  const { id } = await ctx.params;
  const db = await leer();
  const actividad = actividadDe(db, id);
  if (!actividad) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  const form = await req.formData();
  const matricula = String(form.get("matricula") ?? "");
  const alumno = grupoDe(db, actividad.grupoId)?.alumnos.find((a) => a.matricula === matricula);
  if (!alumno) return Response.json({ error: "Alumno no encontrado en el grupo" }, { status: 400 });
  const fotos = form.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  if (fotos.length === 0) return Response.json({ error: "Agrega al menos una foto" }, { status: 400 });
  if (fotos.length > 20) return Response.json({ error: "Máximo 20 páginas" }, { status: 400 });

  const carpeta = `actividades/${id}/entregas/${matricula}`;
  borrarCarpeta(carpeta);
  const sello = Date.now().toString(36);
  const imagenes: string[] = [];
  for (const [i, f] of fotos.entries()) {
    try {
      const jpg = await normalizarFoto(Buffer.from(await f.arrayBuffer()));
      imagenes.push(guardarArchivo(`${carpeta}/${sello}-p${i + 1}.jpg`, jpg));
    } catch {
      return Response.json({ error: `La página ${i + 1} no es una imagen válida (usa JPG o PNG)` }, { status: 400 });
    }
  }

  modificar((d) => {
    d.entregas = d.entregas.filter((e) => !(e.actividadId === id && e.matricula === matricula));
    d.entregas.push({
      actividadId: id,
      matricula,
      estado: "entregada",
      paginasRecibidas: imagenes.length,
      imagenes,
      resultados: [],
      positivos: [],
      mejoras: [],
      entregadaEn: new Date().toISOString(),
    });
  });
  return Response.json({ ok: true, paginas: imagenes.length, alumno: alumno.nombre });
}

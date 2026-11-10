import { actividadDe, borrarCarpeta, grupoDe, guardarArchivo, leer, modificar } from "@/lib/almacen";
import { normalizarFoto } from "@/lib/imagenes";
import { normalizarMatricula } from "@/lib/cuentas";

// Entrega del alumno: fotos de sus hojas en el orden elegido. El alumno no tiene cuenta:
// si su matrícula no está en el curso, se registra aquí con el nombre que escribió.
export async function POST(req: Request, ctx: RouteContext<"/api/entregas/[id]">) {
  const { id } = await ctx.params;
  const db = await leer();
  const actividad = actividadDe(db, id);
  if (!actividad) return Response.json({ error: "Actividad no encontrada" }, { status: 404 });
  const form = await req.formData();
  const matricula = normalizarMatricula(String(form.get("matricula") ?? ""));
  const nombre = String(form.get("nombre") ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!/^[A-Z0-9-]{3,20}$/.test(matricula)) {
    return Response.json({ error: "Escribe tu matrícula (letras y números, sin espacios)" }, { status: 400 });
  }
  const grupo = grupoDe(db, actividad.grupoId);
  if (!grupo) return Response.json({ error: "Curso no encontrado" }, { status: 404 });
  const existente = grupo.alumnos.find((a) => normalizarMatricula(a.matricula) === matricula);
  if (!existente && nombre.length < 3) return Response.json({ error: "Escribe tu nombre completo" }, { status: 400 });
  const alumno = existente ?? { matricula, nombre, correo: "" };
  const previa = db.entregas.find((e) => e.actividadId === id && e.matricula === alumno.matricula);
  if (previa && (previa.estado === "evaluada" || previa.estado === "aprobada")) {
    return Response.json({ error: "Tu entrega ya fue evaluada. Si necesitas cambiarla, habla con tu profesor." }, { status: 409 });
  }
  const fotos = form.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  if (fotos.length === 0) return Response.json({ error: "Agrega al menos una foto" }, { status: 400 });
  if (fotos.length > 20) return Response.json({ error: "Máximo 20 páginas" }, { status: 400 });

  const carpeta = `actividades/${id}/entregas/${alumno.matricula}`;
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
    const g = grupoDe(d, actividad.grupoId);
    if (g && !g.alumnos.some((a) => a.matricula === alumno.matricula)) g.alumnos.push(alumno);
    d.entregas = d.entregas.filter((e) => !(e.actividadId === id && e.matricula === alumno.matricula));
    d.entregas.push({
      actividadId: id,
      matricula: alumno.matricula,
      estado: "entregada",
      paginasRecibidas: imagenes.length,
      imagenes,
      resultados: [],
      positivos: [],
      mejoras: [],
      entregadaEn: new Date().toISOString(),
    });
  });
  return Response.json({ ok: true, paginas: imagenes.length, curso: grupo.codigo });
}

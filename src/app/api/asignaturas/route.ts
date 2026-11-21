import { modificar, slug } from "@/lib/almacen";
import { LARGO_TEXTO_TEMARIO, limpiarUnidades, resumenTemario, temarioDeTexto } from "@/lib/asignaturas";
import { textoDeDocx } from "@/lib/docx";
import { ErrorIA, generarTemario, iaDisponible } from "@/lib/ia";
import { esIdioma } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { profesorActual } from "@/lib/sesion";
import type { Asignatura, UnidadAsignatura } from "@/lib/tipos";

export const maxDuration = 300;

const MAX_ARCHIVO = 15 * 1024 * 1024;

// Alta de una asignatura con su temario, de tres formas:
// - "archivo": PDF, Word (.docx) o texto (.txt) con el programa de la materia.
// - "texto": la lista de unidades, temas y subtemas pegada (se ordena por código, sin IA).
// - "ia": la IA propone el temario con las indicaciones del profesor.
// No consume créditos.
export async function POST(req: Request) {
  const profesor = await profesorActual();
  const { t } = await textos();
  const te = t.profesor.asignaturas.errores;
  if (!profesor) return Response.json({ error: te.sinSesion }, { status: 401 });
  const form = await req.formData();
  const modo = String(form.get("modo") ?? "");
  let nombre = String(form.get("nombre") ?? "").trim().slice(0, 120);
  let nivel = String(form.get("nivel") ?? "").trim().slice(0, 120);
  const idioma = profesor.config?.idioma;
  const uso = { profesorId: profesor.id, idioma: esIdioma(idioma) ? idioma : undefined };
  let unidades: UnidadAsignatura[] = [];
  let origen: Asignatura["origen"] = "texto";

  try {
    if (modo === "texto") {
      unidades = temarioDeTexto(String(form.get("texto") ?? "").slice(0, LARGO_TEXTO_TEMARIO));
    } else if (modo === "archivo") {
      origen = "archivo";
      const archivo = form.get("archivo");
      if (!(archivo instanceof File) || archivo.size === 0) return Response.json({ error: te.sinArchivo }, { status: 400 });
      if (archivo.size > MAX_ARCHIVO) return Response.json({ error: te.archivoGrande }, { status: 400 });
      const datos = Buffer.from(await archivo.arrayBuffer());
      const ext = archivo.name.toLowerCase().split(".").pop();
      if (ext === "pdf" || archivo.type === "application/pdf") {
        if (!iaDisponible()) return Response.json({ error: te.sinIA }, { status: 503 });
        const r = await generarTemario({ pdf: datos, nombre, nivel }, { profesorId: profesor.id });
        unidades = limpiarUnidades(r.unidades);
        nombre ||= r.nombre.trim();
        nivel ||= r.nivel.trim();
      } else if (ext === "docx" || ext === "txt" || ext === "md" || archivo.type.startsWith("text/")) {
        const texto = (ext === "docx" ? textoDeDocx(datos) : datos.toString("utf8"))?.slice(0, LARGO_TEXTO_TEMARIO);
        if (!texto?.trim()) return Response.json({ error: te.archivoInvalido }, { status: 400 });
        // El Word lo ordena la IA (suele traer objetivos, bibliografía…); el .txt, por código si se puede.
        if (ext !== "docx") unidades = temarioDeTexto(texto);
        if (resumenTemario(unidades).temas === 0) {
          if (!iaDisponible()) return Response.json({ error: te.sinIA }, { status: 503 });
          const r = await generarTemario({ texto, nombre, nivel }, { profesorId: profesor.id });
          unidades = limpiarUnidades(r.unidades);
          nombre ||= r.nombre.trim();
          nivel ||= r.nivel.trim();
        }
      } else {
        return Response.json({ error: te.archivoInvalido }, { status: 400 });
      }
    } else if (modo === "ia") {
      origen = "ia";
      const indicaciones = String(form.get("indicaciones") ?? "").trim().slice(0, 4000);
      if (indicaciones.length < 10) return Response.json({ error: te.sinIndicaciones }, { status: 400 });
      if (!iaDisponible()) return Response.json({ error: te.sinIA }, { status: 503 });
      const r = await generarTemario({ indicaciones, nombre, nivel }, uso);
      unidades = limpiarUnidades(r.unidades);
      nombre ||= r.nombre.trim();
      nivel ||= r.nivel.trim();
    } else {
      return Response.json({ error: te.elegirForma }, { status: 400 });
    }
  } catch (e) {
    console.error(e);
    return Response.json({ error: e instanceof ErrorIA ? e.message : te.noSeLeyo }, { status: 502 });
  }

  if (resumenTemario(unidades).temas === 0) return Response.json({ error: te.sinTemas }, { status: 422 });
  const ahora = new Date().toISOString();
  const id = slug(nombre || "asignatura");
  modificar((db) => {
    db.asignaturas = db.asignaturas ?? [];
    db.asignaturas.unshift({
      id,
      profesorId: profesor.id,
      nombre: nombre || te.sinNombre,
      nivel: nivel || undefined,
      unidades,
      origen,
      creadaEn: ahora,
      actualizadaEn: ahora,
    });
  });
  return Response.json({ id });
}

import { PDFDocument } from "pdf-lib";
import { borrarCarpeta, guardarArchivo, leer, leerArchivo, modificar, slug } from "@/lib/almacen";
import { ErrorIA, generarActividad, generarVersiones, proponerRubrica } from "@/lib/ia";
import { cantidadVersiones } from "@/lib/versiones";
import { guardarSubidos } from "@/lib/imagenes";
import { precisionPara } from "@/lib/configuracion";
import { profesorActual } from "@/lib/sesion";
import type { Actividad } from "@/lib/tipos";
import { leerFechas, type FechasActividad } from "@/lib/periodo";
import { detectarIdioma } from "@/lib/i18n/detectar";
import { esIdioma } from "@/lib/i18n/idiomas";
import { limpiarEtiqueta } from "@/lib/etiquetas";
import { leerFormato } from "@/lib/plataforma";
import { leerTemarioActividad, temarioComoTexto } from "@/lib/asignaturas";
import { MAX_ANEXOS, leerEntregaContenido, reactivoContenido, renglonesInstrucciones } from "@/lib/contenido";
import { ErrorArchivos, guardarArchivosContenido } from "@/lib/subir-contenido";
import { diccionarioDe } from "@/lib/i18n/diccionario";

export const maxDuration = 300;

// Paso 1: crear la actividad. Dos opciones:
// - "ia": Claude genera la actividad (reactivos, puntos, instrucciones) a partir del prompt del profesor.
// - "escaneada": el profesor sube su actividad en blanco (fotos o PDF).
// - "contenido": el profesor anexa material (PDF, Word, Excel, PowerPoint, audio o video) con
//   instrucciones; el alumno entrega a mano (fotos) o con evidencia digital.
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
  const db = await leer();
  const grupo = db.grupos.find((g) => g.id === grupoId && g.profesorId === profesor.id);
  // Unidad y temas del syllabus elegidos (solo de las asignaturas del profesor).
  const temario = leerTemarioActividad(form.get("temario"), (db.asignaturas ?? []).filter((a) => a.profesorId === profesor.id));
  let fechas: FechasActividad;
  try {
    fechas = leerFechas({
      visibleDesde: String(form.get("visibleDesde") ?? ""),
      envioDesde: String(form.get("envioDesde") ?? ""),
      envioHasta: String(form.get("envioHasta") ?? ""),
      resultadosDesde: String(form.get("resultadosDesde") ?? ""),
    });
  } catch (e) {
    const motivo = e instanceof Error && e.message !== "Fecha y hora no válidas" ? e.message : "Una de las fechas y horas no es válida";
    return Response.json({ error: motivo }, { status: 400 });
  }
  if (!titulo || !grupo) return Response.json({ error: "Escribe el título y elige el grupo" }, { status: 400 });

  const idiomaElegido = form.get("idioma");
  // Manuscrita (hoja impresa con QR) o en plataforma (el alumno contesta en la app).
  const formato = leerFormato(form.get("formato"));
  if (formato === "plataforma" && modo !== "ia" && modo !== "contenido") return Response.json({ error: "Las actividades en plataforma se generan con IA" }, { status: 400 });
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
    // "Sin puntos": rúbrica sin puntaje (solo aciertos y elementos a corregir).
    sinPuntaje: form.get("escala") === "sin" || undefined,
    ...fechas,
    precision: precisionPara(form.get("motor"), profesor.config, form.get("esfuerzo")),
    // Ensayos, producciones escritas o análisis: no requieren solución.
    sinSolucion: form.get("sinSolucion") === "1" || undefined,
    estiloCorreccion: form.get("estiloCorreccion") === "subrayado" ? "subrayado" : "margen",
    idioma: esIdioma(idiomaElegido) ? idiomaElegido : undefined,
    // Tipo de actividad: agrupa la actividad en el cuaderno y en el plan de evaluación.
    etiqueta: limpiarEtiqueta(form.get("etiqueta")),
    formato: formato === "plataforma" ? "plataforma" : undefined,
    temario,
  };

  if (modo === "ia") {
    const prompt = String(form.get("prompt") ?? "").trim().slice(0, 4000);
    if (prompt.length < 10) return Response.json({ error: "Describe la actividad: tipo de reactivos, ponderaciones y temas" }, { status: 400 });
    try {
      const generada = await generarActividad(
        { titulo, materia: grupo.materia, grupo: grupo.nombre, prompt: [prompt, temarioComoTexto(temario)].filter(Boolean).join("\n\n"), paginas: base.paginas, escala: base.escala, sinSolucion: base.sinSolucion, formato: base.formato },
        { profesorId: profesor.id, actividadId: id, precision: base.precision, idioma: esIdioma(idiomaElegido) ? idiomaElegido : detectarIdioma(`${titulo}\n${prompt}`) },
      );
      Object.assign(base, {
        origen: "ia",
        prompt,
        instruccionesAlumno: generada.instrucciones,
        criterios: generada.criterios,
        reactivos: generada.reactivos,
      });
      // Versiones B, C…: los mismos reactivos con otros valores numéricos (no aplica a producciones escritas).
      const versiones = base.sinSolucion ? 1 : cantidadVersiones(form.get("versiones"));
      if (versiones > 1) {
        base.versiones = await generarVersiones(base, versiones, {
          profesorId: profesor.id,
          actividadId: id,
          precision: base.precision,
          idioma: esIdioma(idiomaElegido) ? idiomaElegido : detectarIdioma(`${titulo}\n${prompt}`),
        });
      }
    } catch (e) {
      console.error(e);
      return Response.json({ error: e instanceof ErrorIA ? e.message : "No se pudo generar la actividad." }, { status: 502 });
    }
  } else if (modo === "escaneada") {
    const archivos = form.getAll("archivos").filter((f): f is File => f instanceof File && f.size > 0);
    if (archivos.length === 0) return Response.json({ error: "Sube las fotos o el PDF de tu actividad" }, { status: 400 });
    if (archivos.length > 10) return Response.json({ error: "Máximo 10 archivos" }, { status: 400 });
    try {
      const { rutas, paraIA } = await guardarSubidos(archivos, `actividades/${id}/hoja`, guardarArchivo);
      let paginas = 0;
      for (const r of rutas) paginas += r.endsWith(".pdf") ? (await PDFDocument.load(leerArchivo(r), { ignoreEncryption: true })).getPageCount() : 1;
      Object.assign(base, { origen: "escaneada", archivos: rutas, paginas: Math.max(1, Math.min(20, paginas)) });
      if (base.sinSolucion) {
        // Sin solución: la rúbrica (reactivos y criterios de composición escrita) sale de la hoja en blanco.
        try {
          const { reactivos, criterios, recomendaciones } = await proponerRubrica(
            paraIA,
            { titulo, instrucciones, sinSolucion: true },
            { profesorId: profesor.id, actividadId: id, precision: base.precision, idioma: esIdioma(idiomaElegido) ? idiomaElegido : undefined },
          );
          Object.assign(base, { reactivos, criterios, recomendaciones });
        } catch (e) {
          console.error(e);
          borrarCarpeta(`actividades/${id}`);
          return Response.json({ error: e instanceof ErrorIA ? e.message : "No se pudo leer la actividad." }, { status: 502 });
        }
      }
    } catch {
      borrarCarpeta(`actividades/${id}`);
      return Response.json({ error: "Algún archivo no es una imagen o PDF válido" }, { status: 400 });
    }
  } else if (modo === "contenido") {
    const instruccionesAlumno = renglonesInstrucciones(String(form.get("instruccionesAlumno") ?? "").slice(0, 6000));
    if (!instruccionesAlumno.length) return Response.json({ error: "Escribe las instrucciones para el alumno" }, { status: 400 });
    const entrega = leerEntregaContenido(form.get("entregaContenido"));
    const archivos = form.getAll("anexos").filter((f): f is File => f instanceof File && f.size > 0);
    let anexos;
    try {
      anexos = (await guardarArchivosContenido(archivos, `actividades/${id}/anexos`, MAX_ANEXOS)).anexos;
    } catch (e) {
      borrarCarpeta(`actividades/${id}`);
      if (e instanceof ErrorArchivos) {
        const motivo = { cantidad: `Máximo ${MAX_ANEXOS} archivos`, tipo: `No se acepta el archivo ${e.nombre}`, tamano: `${e.nombre} es demasiado grande`, total: "Los archivos juntos son demasiado grandes", invalido: `${e.nombre} no se pudo leer` }[e.clave];
        return Response.json({ error: motivo }, { status: 400 });
      }
      throw e;
    }
    const idioma = (esIdioma(idiomaElegido) ? idiomaElegido : detectarIdioma(`${titulo}\n${instruccionesAlumno.join("\n")}`)) ?? "es";
    const reactivo = reactivoContenido(titulo, instruccionesAlumno, base.escala ?? 100, Boolean(base.sinSolucion));
    // Sin solución: criterios de partida, que el profesor ajusta en la rúbrica.
    const criteriosBase = diccionarioDe(idioma).contenido.criteriosBase;
    if (base.sinSolucion) reactivo.respuesta = criteriosBase.map((c) => c.descripcion).join(" ");
    Object.assign(base, {
      origen: "contenido",
      contenido: { anexos, entrega },
      instruccionesAlumno,
      // Evidencia digital: el alumno entrega en la app (como en plataforma); manuscrita, con fotos.
      formato: entrega === "digital" ? "plataforma" : undefined,
      paginas: 1,
      reactivos: [reactivo],
      criterios: base.sinSolucion ? criteriosBase.map((c) => ({ ...c })) : undefined,
      idioma: base.idioma ?? idioma,
    });
  } else {
    return Response.json({ error: "Elige cómo crear la actividad" }, { status: 400 });
  }

  modificar((db) => {
    db.actividades.unshift(base);
  });
  return Response.json({ id, siguiente: `/profesor/actividades/${id}/hoja` });
}

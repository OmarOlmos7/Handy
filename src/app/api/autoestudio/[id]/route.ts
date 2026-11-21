import { grupoDe, guardarArchivo, leer, modificar } from "@/lib/almacen";
import {
  LARGO_PETICION,
  LOGRO_TARJETA,
  MAX_FOTOS_EJERCICIO,
  calificacionAuto,
  costoEvaluar,
  logroEjercicio,
  senalesDeRiesgo,
  vaALaIA,
  type AutoevaluacionTarjeta,
} from "@/lib/autoestudio";
import { sumarCreditos } from "@/lib/configuracion";
import { saldoDe } from "@/lib/cuentas";
import { ErrorIA } from "@/lib/ia";
import { evaluarAutoRespuestas, type RespuestaAutoIA } from "@/lib/ia-autoestudio";
import { diccionarioDe } from "@/lib/i18n/diccionario";
import { textos } from "@/lib/i18n/servidor";
import { formato, esIdioma } from "@/lib/i18n/idiomas";
import { ErrorPaginasPdf, normalizarFoto, pdfAImagenes } from "@/lib/imagenes";
import { alumnoActual } from "@/lib/sesion";
import type { ResultadoAuto } from "@/lib/tipos";

export const maxDuration = 300;

const MAX_SEGUNDOS = 4 * 3600;

// El alumno termina una actividad autoasignada: lo cerrado se califica por código; lo escrito y
// los desarrollos en foto los revisa la IA (con créditos del profesor del curso).
export async function POST(req: Request, ctx: RouteContext<"/api/autoestudio/[id]">) {
  const { id } = await ctx.params;
  const { t } = await textos();
  const te = t.autoestudio.errores;
  const cuenta = await alumnoActual();
  if (!cuenta) return Response.json({ error: te.sinSesion }, { status: 401 });
  const db = await leer();
  const act = (db.autoactividades ?? []).find((a) => a.id === id && a.alumnoId === cuenta.id);
  if (!act) return Response.json({ error: te.noEncontrada }, { status: 404 });
  if (act.estado !== "pendiente") return Response.json({ error: te.yaTerminada }, { status: 409 });
  const grupo = grupoDe(db, act.grupoId);

  const form = await req.formData();
  const leerJson = (campo: string): unknown[] => {
    try {
      const v = JSON.parse(String(form.get(campo) ?? "[]"));
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  const segundos = Math.max(0, Math.min(MAX_SEGUNDOS, Math.round(Number(form.get("segundos")) || 0)));
  const resultados: ResultadoAuto[] = [];
  let alerta = false;
  const apoyo = (esIdioma(act.idioma) ? diccionarioDe(act.idioma) : t).autoestudio.apoyo;

  // Tarjetas: el alumno escribió lo que recordaba y se autoevaluó.
  if (act.tarjetas) {
    const crudas = leerJson("tarjetas") as { numero?: number; texto?: unknown; nivel?: unknown }[];
    act.tarjetas.forEach((_, i) => {
      const c = crudas.find((x) => Number(x?.numero) === i + 1);
      const texto = String(c?.texto ?? "").slice(0, LARGO_PETICION);
      const nivel: AutoevaluacionTarjeta = c?.nivel === "si" || c?.nivel === "casi" ? c.nivel : "no";
      const riesgo = senalesDeRiesgo(texto);
      alerta ||= riesgo;
      resultados.push({ numero: i + 1, logro: riesgo ? 0 : LOGRO_TARJETA[nivel], respuesta: texto, comentario: riesgo ? apoyo : undefined });
    });
  }

  // Ejercicios (práctica, a mano y preguntas de videos y lecturas).
  const ejercicios = act.ejercicios ?? [];
  const crudas = leerJson("respuestas") as { numero?: number; seleccion?: unknown; texto?: unknown }[];
  const paraIA: RespuestaAutoIA[] = [];
  const fotos: Record<number, string[]> = {};
  const carpeta = `autoestudio/${act.id}`;
  for (const ej of ejercicios) {
    const c = crudas.find((x) => Number(x?.numero) === ej.numero);
    const seleccion = Array.isArray(c?.seleccion) ? c.seleccion.map((x) => String(x ?? "").slice(0, 120)) : [];
    const texto = String(c?.texto ?? "").slice(0, 4000);
    if (!vaALaIA(ej.tipo)) {
      // Lo que respondió, escrito como la clave: pares en las relaciones, palabras en completar.
      const respuesta =
        ej.tipo === "relacion" || ej.tipo === "relacion_imagenes"
          ? seleccion.map((l, i) => (l ? `${i + 1}-${l}` : "")).filter(Boolean).join(", ")
          : seleccion.filter(Boolean).join(ej.tipo === "completar" ? " · " : ", ");
      resultados.push({ numero: ej.numero, logro: logroEjercicio(ej, seleccion) ?? 0, respuesta });
      continue;
    }
    if (ej.tipo === "texto") {
      if (senalesDeRiesgo(texto)) {
        alerta = true;
        resultados.push({ numero: ej.numero, logro: 0, respuesta: texto, comentario: apoyo });
      } else if (!texto.trim()) {
        resultados.push({ numero: ej.numero, logro: 0, respuesta: "" });
      } else {
        paraIA.push({ numero: ej.numero, texto });
        resultados.push({ numero: ej.numero, logro: 0, respuesta: texto });
      }
      continue;
    }
    // Manuscrito: fotos o un PDF de su procedimiento.
    const archivos = form.getAll(`archivo-${ej.numero}`).filter((f): f is File => f instanceof File && f.size > 0);
    if (archivos.length > MAX_FOTOS_EJERCICIO) return Response.json({ error: formato(te.maxFotos, { max: MAX_FOTOS_EJERCICIO }) }, { status: 400 });
    const jpgs: Buffer[] = [];
    for (const f of archivos) {
      const datos = Buffer.from(await f.arrayBuffer());
      try {
        if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) jpgs.push(...(await pdfAImagenes(datos)));
        else jpgs.push(await normalizarFoto(datos));
      } catch (e) {
        if (e instanceof ErrorPaginasPdf) return Response.json({ error: formato(te.maxFotos, { max: MAX_FOTOS_EJERCICIO }) }, { status: 400 });
        return Response.json({ error: formato(te.archivoInvalido, { n: ej.numero }) }, { status: 400 });
      }
    }
    if (jpgs.length > MAX_FOTOS_EJERCICIO * 2) return Response.json({ error: formato(te.maxFotos, { max: MAX_FOTOS_EJERCICIO }) }, { status: 400 });
    fotos[ej.numero] = jpgs.map((_, i) => `${carpeta}/r${ej.numero}-${i + 1}.jpg`);
    if (jpgs.length) {
      paraIA.push({ numero: ej.numero, imagenes: jpgs.map((j) => ({ base64: j.toString("base64"), mediaType: "image/jpeg" as const })) });
      jpgs.forEach((j, i) => guardarArchivo(fotos[ej.numero][i], j));
    }
    resultados.push({ numero: ej.numero, logro: 0, respuesta: jpgs.length ? "📷" : "" });
  }

  // Lo escrito y las fotos van a la IA (sin nombre ni matrícula), con créditos del profesor.
  let costo = 0;
  if (paraIA.length) {
    const nFotos = paraIA.reduce((s, r) => s + (r.imagenes?.length ?? 0), 0);
    const nTextos = paraIA.filter((r) => r.texto !== undefined).length;
    costo = costoEvaluar(nTextos, nFotos);
    if (!grupo?.profesorId || saldoDe(db, grupo.profesorId) < costo) return Response.json({ error: te.sinCreditos }, { status: 402 });
    try {
      const ia = await evaluarAutoRespuestas(ejercicios, paraIA, { profesorId: grupo.profesorId, idioma: esIdioma(act.idioma) ? act.idioma : undefined });
      for (const r of ia) {
        const res = resultados.find((x) => x.numero === r.numero);
        if (res) Object.assign(res, { logro: r.logro, comentario: r.comentario });
      }
    } catch (e) {
      console.error(e);
      return Response.json({ error: e instanceof ErrorIA ? e.message : te.ia }, { status: 502 });
    }
  }

  const total = (act.tarjetas?.length ?? 0) + ejercicios.length;
  const calificacion = calificacionAuto(resultados, total);
  const ahora = new Date().toISOString();
  modificar((d) => {
    const a = d.autoactividades?.find((x) => x.id === act.id);
    if (!a || a.estado !== "pendiente") return;
    Object.assign(a, {
      estado: "completada",
      calificacion,
      resultados,
      segundos,
      completadaEn: ahora,
      alerta: a.alerta || alerta || undefined,
      archivos: Object.values(fotos).flat(),
      creditos: sumarCreditos(a.creditos ?? 0, costo),
    });
    if (costo > 0 && grupo?.profesorId) {
      d.movimientos.unshift({
        profesorId: grupo.profesorId,
        fecha: ahora.slice(0, 10),
        concepto: `Autoestudio de alumno · revisión con IA · ${act.tema}`,
        cantidad: -costo,
      });
    }
  });
  return Response.json({ ok: true, calificacion, resultados, segundos, alerta });
}

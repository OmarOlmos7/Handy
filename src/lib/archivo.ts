// Archivo y limpieza del servidor: pasa las fotos de las entregas al PDF corregido
// (y las borra) y elimina las actividades que cumplieron su año de conservación.
import "server-only";
import fs from "node:fs";
import { actividadDe, borrarCarpeta, grupoDe, guardarArchivo, leerAhora, modificar, rutaAbsoluta } from "./almacen";
import { diccionarioDe } from "./i18n/diccionario";
import { esIdioma } from "./i18n/idiomas";
import { pdfHojasCorregidas } from "./pdf";
import { debeArchivarse, fechaBorrado } from "./retencion";

/** Guarda las hojas corregidas en PDF y borra las fotos de la entrega. */
export async function archivarEntrega(actividadId: string, matricula: string): Promise<boolean> {
  const db = leerAhora();
  const actividad = actividadDe(db, actividadId);
  const entrega = db.entregas.find((e) => e.actividadId === actividadId && e.matricula === matricula);
  if (!actividad || !entrega?.imagenes?.length || entrega.pdf || /[\\/]|^\.\.?$/.test(matricula)) return false;
  const fotos = entrega.imagenes;
  // Las anotaciones fijas ("Reactivo 3 · 2/4") van en el idioma del profesor, como los comentarios de la IA.
  const grupo = grupoDe(db, actividad.grupoId);
  const idioma = db.profesores.find((p) => p.id === grupo?.profesorId)?.config?.idioma;
  const pdf = await pdfHojasCorregidas(actividad, entrega, diccionarioDe(esIdioma(idioma) ? idioma : "es").alumno.pdf);
  const ruta = guardarArchivo(`actividades/${actividadId}/entregas/${matricula}/corregida-${Date.now()}.pdf`, pdf);
  const listo = modificar((d) => {
    const e = d.entregas.find((x) => x.actividadId === actividadId && x.matricula === matricula);
    // Si mientras tanto llegó otra entrega o se borró, no se toca.
    if (!e || e.pdf || e.imagenes?.join() !== fotos.join()) return false;
    e.pdf = ruta;
    e.archivadaEn = new Date().toISOString();
    delete e.imagenes;
    return true;
  });
  if (!listo) {
    fs.rmSync(rutaAbsoluta(ruta), { force: true });
    return false;
  }
  for (const f of fotos) fs.rmSync(rutaAbsoluta(f), { force: true });
  return true;
}

let ultimaRevision = 0;
let enCurso = false;

/**
 * Revisa, como máximo cada 10 minutos, qué entregas ya pueden archivarse y qué actividades
 * cumplieron su año, y las procesa. Se llama después de responder (no frena las páginas).
 */
export async function mantenimiento(ahora = new Date()) {
  if (enCurso || ahora.getTime() - ultimaRevision < 10 * 60_000) return;
  enCurso = true;
  ultimaRevision = ahora.getTime();
  try {
    const db = leerAhora();
    for (const e of db.entregas) {
      const a = actividadDe(db, e.actividadId);
      if (a && debeArchivarse(a, e, ahora)) {
        try {
          await archivarEntrega(e.actividadId, e.matricula);
        } catch (err) {
          console.error("No se pudo archivar la entrega", e.actividadId, err);
        }
      }
    }
    const vencidas = db.actividades
      .filter((a) => !a.demo && fechaBorrado(a, db.entregas.filter((e) => e.actividadId === a.id)) <= ahora)
      .map((a) => a.id);
    if (vencidas.length) {
      modificar((d) => {
        d.actividades = d.actividades.filter((a) => !vencidas.includes(a.id));
        d.entregas = d.entregas.filter((e) => !vencidas.includes(e.actividadId));
      });
      vencidas.forEach((id) => borrarCarpeta(`actividades/${id}`));
      console.log(`Se borraron ${vencidas.length} actividades con más de un año`);
    }
  } finally {
    enCurso = false;
  }
}

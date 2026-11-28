// Casos equivalentes de una actividad (perfil CREAR, etapa 2): al terminar uno, su calificación
// cuenta como el último intento de la actividad y queda en el historial. Si agotó los 5 casos sin
// llegar al 70 %, se avisa al profesor que el alumno necesita una asesoría.
import { randomUUID } from "node:crypto";
import { diccionarioDe } from "../i18n/diccionario";
import { esIdioma, formato } from "../i18n/idiomas";
import type { BaseDeDatos } from "../tipos";
import { UMBRAL_LOGRO } from "./etapas";
import { MAX_CASOS, calificacionCasoEnEscala, registrarIntentoCaso } from "./intentos";

/** Cierra un caso terminado: calificación que se reporta, intento y, si hace falta, aviso de asesoría. */
export function cerrarCaso(db: BaseDeDatos, autoactividadId: string, ahora: Date = new Date()) {
  const caso = db.autoactividades?.find((a) => a.id === autoactividadId);
  if (!caso?.casoDe || caso.estado !== "completada" || caso.calificacion === undefined) return;
  const actividad = db.actividades.find((a) => a.id === caso.casoDe!.actividadId);
  const entrega = db.entregas.find((e) => e.actividadId === caso.casoDe!.actividadId && e.matricula === caso.matricula);
  if (!actividad || !entrega) return;
  entrega.calificacionCaso = calificacionCasoEnEscala(actividad, caso.calificacion);
  registrarIntentoCaso(db, actividad, caso);
  if (caso.casoDe.numero < MAX_CASOS || caso.calificacion >= UMBRAL_LOGRO) return;
  const grupo = db.grupos.find((g) => g.id === caso.grupoId);
  const profesor = grupo && db.profesores.find((p) => p.id === grupo.profesorId);
  const idioma = profesor?.config?.idioma;
  const t = diccionarioDe(esIdioma(idioma) ? idioma : "es").perfil.seguimiento.avisoAsesoria;
  (db.avisos ??= []).push({
    id: randomUUID().replace(/-/g, "").slice(0, 16),
    grupoId: caso.grupoId,
    autor: { tipo: "alumno", matricula: caso.matricula, alumnoId: caso.alumnoId },
    destino: { tipo: "profesor" },
    destinatarios: [],
    asunto: formato(t.asunto, { actividad: actividad.titulo }).slice(0, 120),
    texto: formato(t.texto, { actividad: actividad.titulo, n: MAX_CASOS, cal: Math.round(caso.calificacion) }),
    anexos: [],
    enviadoEn: ahora.toISOString(),
    leidos: { [caso.matricula]: ahora.toISOString() },
    automatico: true,
  });
}

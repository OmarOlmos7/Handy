// Avisos de asesorías que manda la app sola: el recordatorio de la mañana del día de la asesoría y
// el aviso cuando el profesor la cancela. Llegan al centro de avisos del alumno y a su correo (si el
// servidor tiene SMTP).
import "server-only";
import { randomUUID } from "node:crypto";
import { leerAhora, modificar } from "./almacen";
import { duracionTexto, hora, pendientesDeRecordatorio } from "./asesorias";
import { notificarAviso } from "./avisos-correo";
import { diccionarioDe } from "./i18n/diccionario";
import { LOCALE, esIdioma, formato, type Idioma } from "./i18n/idiomas";
import type { Asesoria, Aviso, BaseDeDatos } from "./tipos";

function base() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** "jueves 3 de diciembre" en el idioma dado. */
export function diaLargo(fecha: string, locale: string) {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

interface Mensaje {
  aviso: Aviso;
  asunto: string;
  cuerpo: string;
}

/** Arma el aviso para el alumno (sin guardarlo) en su idioma. */
function mensaje(db: BaseDeDatos, a: Asesoria, tipo: "recordatorio" | "cancelada"): Mensaje | undefined {
  const grupo = db.grupos.find((g) => g.id === a.grupoId);
  const alumno = grupo?.alumnos.find((x) => x.matricula === a.matricula);
  if (!grupo || !alumno) return undefined;
  const profesor = db.profesores.find((p) => p.id === grupo.profesorId);
  const idioma: Idioma = esIdioma(a.idioma) ? a.idioma : "es";
  const t = diccionarioDe(idioma).asesorias;
  const tr = t.recordatorio;
  const curso = `${grupo.materia} · ${grupo.nombre}`;
  const valores = {
    nombre: alumno.nombre.split(" ")[0],
    curso,
    profesor: profesor?.nombre ?? "",
    hora: hora(a.inicio),
    fin: hora(a.inicio + a.duracion),
    dur: duracionTexto(a.duracion),
    dia: diaLargo(a.fecha, LOCALE[idioma]),
    tema: a.tema,
    comentarios: a.comentarios ? formato(tr.comentarios, { c: a.comentarios }) : "",
  };
  const asunto = formato(tipo === "recordatorio" ? tr.asunto : tr.cancelada.asunto, valores);
  const texto = formato(tipo === "recordatorio" ? tr.texto : tr.cancelada.texto, valores);
  const url = `${base()}/alumno/cursos/${grupo.id}/asesorias`;
  const aviso: Aviso = {
    id: randomUUID().replace(/-/g, "").slice(0, 16),
    grupoId: grupo.id,
    autor: { tipo: "profesor", profesorId: grupo.profesorId ?? "" },
    destino: { tipo: "alumnos", matriculas: [a.matricula] },
    destinatarios: [a.matricula],
    asunto,
    texto,
    anexos: [],
    enviadoEn: new Date().toISOString(),
    leidos: {},
    automatico: true,
  };
  const cuerpo = [texto, "", formato(tr.abrir, { url }), "", "—", tr.pie].join("\n");
  return { aviso, asunto: `${curso} · ${asunto}`, cuerpo };
}

async function enviar(mensajes: Mensaje[]) {
  for (const m of mensajes) await notificarAviso(m.aviso.id, { asunto: m.asunto, cuerpoAlumno: m.cuerpo, cuerpoProfesor: m.cuerpo });
}

/**
 * Manda los recordatorios del día que falten. Marca cada asesoría y guarda su aviso en el mismo
 * cambio de la base, así dos corridas a la vez no mandan doble. Devuelve cuántos salieron.
 */
export async function enviarRecordatorios(ahora: Date = new Date()): Promise<number> {
  const mensajes = modificar((db) => {
    const lista: Mensaje[] = [];
    for (const a of pendientesDeRecordatorio(db.asesorias ?? [], ahora)) {
      const m = mensaje(db, a, "recordatorio");
      a.recordatorio = ahora.toISOString();
      if (!m) continue;
      (db.avisos ??= []).push(m.aviso);
      lista.push(m);
    }
    return lista;
  });
  await enviar(mensajes);
  return mensajes.length;
}

/** Aviso al alumno de que el profesor canceló su asesoría. Nunca lanza errores. */
export async function avisarCancelacion(asesoriaId: string) {
  try {
    const db = leerAhora();
    const a = (db.asesorias ?? []).find((x) => x.id === asesoriaId);
    const m = a && mensaje(db, a, "cancelada");
    if (!m) return;
    modificar((d) => {
      (d.avisos ??= []).push(m.aviso);
    });
    await enviar([m]);
  } catch (e) {
    console.error("Aviso de asesoría cancelada", e);
  }
}

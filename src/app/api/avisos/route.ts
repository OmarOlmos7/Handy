import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { borrarCarpeta, leer, modificar } from "@/lib/almacen";
import { ErrorAvisoCurso, MAX_ANEXOS_AVISO, carpetaAviso, extracto, leerDestino, limpiarContenido, puedeVerAviso, resolverDestino } from "@/lib/avisos";
import { notificarAviso } from "@/lib/avisos-correo";
import { MAX_BYTES_ARCHIVO, MAX_BYTES_TOTAL } from "@/lib/contenido";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { urlBase } from "@/lib/qr";
import { alumnoActual, matriculaEnCurso, profesorActual } from "@/lib/sesion";
import { ErrorArchivos, guardarArchivosContenido } from "@/lib/subir-contenido";
import type { Aviso, AutorAviso, DestinoAviso } from "@/lib/tipos";

export const maxDuration = 120;

const MB = (b: number) => Math.round(b / 1024 / 1024);

// Envía un aviso del curso con texto y anexos. El profesor del curso elige a quién (todo el grupo,
// un equipo o alumnos); el alumno siempre le escribe a su profesor. Después de responder se avisa
// por correo a los destinatarios (si el servidor tiene correo configurado).
export async function POST(req: Request) {
  const { t } = await textos();
  const ta = t.avisos;
  const form = await req.formData().catch(() => undefined);
  if (!form) return Response.json({ error: ta.noSeEnvio }, { status: 400 });
  const grupoId = String(form.get("grupoId") ?? "");
  const db = await leer();
  const grupo = db.grupos.find((g) => g.id === grupoId);
  if (!grupo) return Response.json({ error: ta.errores.noEncontrado }, { status: 404 });

  const profesor = await profesorActual();
  const esProfesor = Boolean(profesor && grupo.profesorId === profesor.id);
  const alumno = esProfesor ? undefined : await alumnoActual();
  const matricula = matriculaEnCurso(alumno, grupoId);
  if (!esProfesor && !matricula) return Response.json({ error: ta.errores.noEncontrado }, { status: 403 });

  const archivos = form.getAll("archivos").filter((f): f is File => f instanceof File && f.size > 0);
  let autor: AutorAviso;
  let destino: DestinoAviso;
  let destinatarios: string[];
  let contenido: { asunto: string; texto: string };
  try {
    contenido = limpiarContenido(String(form.get("asunto") ?? ""), String(form.get("texto") ?? ""), archivos.length);
    if (esProfesor) {
      const leido = leerDestino(String(form.get("destino") ?? ""));
      if (!leido) throw new ErrorAvisoCurso("destino");
      ({ destino, destinatarios } = resolverDestino(db, grupo, leido));
      autor = { tipo: "profesor", profesorId: profesor!.id };
    } else {
      destino = { tipo: "profesor" };
      destinatarios = [];
      autor = { tipo: "alumno", matricula: matricula!, alumnoId: alumno!.id };
    }
  } catch (e) {
    if (e instanceof ErrorAvisoCurso) return Response.json({ error: ta.errores[e.clave] }, { status: 400 });
    throw e;
  }

  // Solo se responde a un aviso del mismo curso que esta persona puede ver.
  const respondeA = String(form.get("respondeA") ?? "");
  const original = respondeA ? (db.avisos ?? []).find((a) => a.id === respondeA && a.grupoId === grupoId) : undefined;
  const valida = original && puedeVerAviso(original, { profesorDelCurso: esProfesor, matricula });

  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  let anexos: Aviso["anexos"] = [];
  if (archivos.length) {
    try {
      anexos = (await guardarArchivosContenido(archivos, carpetaAviso(id), MAX_ANEXOS_AVISO)).anexos;
    } catch (e) {
      borrarCarpeta(carpetaAviso(id));
      if (e instanceof ErrorArchivos) {
        const tc = t.contenido.errores;
        const mensaje =
          e.clave === "cantidad"
            ? formato(tc.cantidad, { n: MAX_ANEXOS_AVISO })
            : e.clave === "tipo"
              ? formato(tc.tipo, { nombre: e.nombre ?? "" })
              : e.clave === "tamano"
                ? formato(tc.tamano, { nombre: e.nombre ?? "", mb: MB(MAX_BYTES_ARCHIVO) })
                : e.clave === "total"
                  ? formato(tc.total, { mb: MB(MAX_BYTES_TOTAL) })
                  : ta.noSeEnvio;
        return Response.json({ error: mensaje }, { status: 400 });
      }
      throw e;
    }
  }

  const aviso: Aviso = {
    id,
    grupoId,
    autor,
    destino,
    destinatarios,
    asunto: contenido.asunto,
    texto: contenido.texto,
    anexos,
    enviadoEn: new Date().toISOString(),
    leidos: {},
    ...(valida ? { respondeA } : {}),
  };
  modificar((d) => {
    (d.avisos ??= []).push(aviso);
  });

  // Correo a los destinatarios, en el idioma de quien escribe, sin frenar la respuesta.
  const base = await urlBase();
  const curso = `${grupo.materia} · ${grupo.nombre}`;
  const nombreAutor = esProfesor ? profesor!.nombre : (grupo.alumnos.find((a) => a.matricula === matricula)?.nombre ?? alumno!.nombre);
  const cuerpo = (url: string) =>
    [
      formato(ta.mail.cuerpo, { autor: nombreAutor, curso }),
      "",
      aviso.asunto || ta.sinAsunto,
      extracto(aviso.texto, 1500),
      ...(anexos.length ? ["", formato(ta.mail.anexos, { n: anexos.length })] : []),
      "",
      formato(ta.mail.abrir, { url }),
      "",
      "—",
      ta.mail.pie,
    ].join("\n");
  const textosCorreo = {
    asunto: formato(ta.mail.asunto, { curso, asunto: aviso.asunto || extracto(aviso.texto, 60) || ta.sinAsunto }),
    cuerpoAlumno: cuerpo(`${base}/alumno/cursos/${grupoId}/avisos`),
    cuerpoProfesor: cuerpo(`${base}/profesor/grupos/${grupoId}/avisos`),
  };
  after(() => notificarAviso(id, textosCorreo));

  revalidatePath("/profesor", "layout");
  revalidatePath("/alumno", "layout");
  return Response.json({ ok: true, id });
}

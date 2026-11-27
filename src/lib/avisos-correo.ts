// Aviso por correo a quienes recibe un mensaje del curso. Si el servidor no tiene correo
// configurado (SMTP), no se envía nada y el aviso queda en la app de todos modos.
import "server-only";
import { leerAhora, modificar } from "./almacen";
import { correoValido } from "./cuentas";
import { correoConfigurado, enviarCorreo } from "./correo";
import type { CorreosAviso } from "./tipos";

export interface TextosCorreoAviso {
  /** Asunto del correo (ya con el curso y el asunto del aviso). */
  asunto: string;
  /** Cuerpo para los alumnos y para el profesor (ya con el enlace de cada uno). */
  cuerpoAlumno: string;
  cuerpoProfesor: string;
}

/**
 * Envía el correo a cada destinatario del aviso (a la dirección de la lista del curso, o a la del
 * profesor si lo escribió un alumno) y guarda cuántos salieron. Nunca lanza errores.
 */
export async function notificarAviso(avisoId: string, textos: TextosCorreoAviso): Promise<CorreosAviso | undefined> {
  try {
    const db = leerAhora();
    const aviso = (db.avisos ?? []).find((a) => a.id === avisoId);
    const grupo = aviso && db.grupos.find((g) => g.id === aviso.grupoId);
    if (!aviso || !grupo) return undefined;
    const para: { correo: string; cuerpo: string }[] = [];
    let sinCorreo = 0;
    if (aviso.destino.tipo === "profesor") {
      const profesor = db.profesores.find((p) => p.id === grupo.profesorId);
      if (profesor && correoValido(profesor.correo)) para.push({ correo: profesor.correo, cuerpo: textos.cuerpoProfesor });
      else sinCorreo++;
    } else {
      const porMatricula = new Map(grupo.alumnos.map((a) => [a.matricula, a]));
      for (const m of aviso.destinatarios) {
        const correo = porMatricula.get(m)?.correo?.trim();
        if (correo && correoValido(correo)) para.push({ correo, cuerpo: textos.cuerpoAlumno });
        else sinCorreo++;
      }
    }
    const resultado: CorreosAviso = { enviados: 0, fallidos: 0, sinCorreo };
    if (!correoConfigurado()) resultado.sinConfigurar = true;
    else {
      // Uno por uno: cada destinatario recibe su propio correo y no ve las direcciones de los demás.
      for (const p of new Map(para.map((x) => [x.correo.toLowerCase(), x])).values()) {
        try {
          await enviarCorreo(p.correo, textos.asunto, p.cuerpo);
          resultado.enviados++;
        } catch (e) {
          resultado.fallidos++;
          console.error("Aviso por correo", e instanceof Error ? e.message : e);
        }
      }
    }
    modificar((d) => {
      const a = (d.avisos ?? []).find((x) => x.id === avisoId);
      if (a) a.correos = resultado;
    });
    return resultado;
  } catch (e) {
    console.error("Aviso por correo", e);
    return undefined;
  }
}

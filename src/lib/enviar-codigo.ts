// Envío del código del curso a los alumnos por correo, uno por uno, para que paguen su membresía
// (licencia) con él. Aquí solo se decide a quién se manda; el envío lo hace la acción del servidor.
import { correoValido } from "./cuentas";
import type { Alumno, Grupo } from "./tipos";

export interface DestinatariosCodigo {
  /** Alumnos elegidos con correo válido (sin repetir correo). */
  para: Pick<Alumno, "matricula" | "nombre" | "correo">[];
  /** Elegidos sin correo o con un correo no válido. */
  sinCorreo: number;
}

/** Toma de la lista del curso los alumnos elegidos (por matrícula) y separa los que no tienen correo. */
export function destinatariosCodigo(grupo: Pick<Grupo, "alumnos">, matriculas: string[]): DestinatariosCodigo {
  const elegidas = new Set(matriculas.map((m) => String(m)));
  const vistos = new Set<string>();
  const para: DestinatariosCodigo["para"] = [];
  let sinCorreo = 0;
  for (const a of grupo.alumnos) {
    if (!elegidas.has(a.matricula)) continue;
    const correo = (a.correo ?? "").trim();
    if (!correo || !correoValido(correo)) {
      sinCorreo++;
      continue;
    }
    const clave = correo.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    para.push({ matricula: a.matricula, nombre: a.nombre, correo });
  }
  return { para, sinCorreo };
}

/** Primer nombre del alumno para el saludo (el correo no lleva el nombre completo). */
export function nombreSaludo(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? "";
}

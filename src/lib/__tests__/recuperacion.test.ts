import { describe, expect, it } from "vitest";
import { construirMensaje } from "../correo-mensaje";
import { hashContrasena, verificarContrasena } from "../cuentas";
import { buscarRecuperacion, crearRecuperacion, usarRecuperacion, VIGENCIA_RECUPERACION_MS } from "../recuperacion";
import type { BaseDeDatos } from "../tipos";

function base(): BaseDeDatos {
  return {
    version: 3,
    profesores: [{ id: "p1", tipo: "profesor", nombre: "Laura Méndez", correo: "laura@escuela.mx", contrasena: hashContrasena("anterior1"), creadoEn: "" }],
    cuentasAlumno: [{ id: "a1", tipo: "alumno", nombre: "Ana López", matricula: "A01", correo: "ana@escuela.mx", contrasena: hashContrasena("vieja1"), creadoEn: "" }],
    sesiones: [
      { token: "x", expira: "2099-01-01", profesorId: "p1" },
      { token: "y", expira: "2099-01-01", alumnoId: "a1" },
    ],
    grupos: [],
    actividades: [],
    entregas: [],
    movimientos: [],
  };
}

describe("recuperar contraseña", () => {
  it("cambia la contraseña con el enlace, una sola vez, y cierra las sesiones", () => {
    const db = base();
    const token = crearRecuperacion(db, "profesor", "p1", 1000)!;
    expect(token).toBeTruthy();
    expect(db.recuperaciones?.[0].hash).not.toBe(token);
    expect(usarRecuperacion(db, token, hashContrasena("nueva123"), 2000)).toBe("profesor");
    expect(verificarContrasena("nueva123", db.profesores[0].contrasena)).toBe(true);
    expect(db.sesiones.map((s) => s.token)).toEqual(["y"]);
    expect(usarRecuperacion(db, token, hashContrasena("otra1234"), 3000)).toBeUndefined();
  });
  it("el enlace vence en una hora", () => {
    const db = base();
    const token = crearRecuperacion(db, "alumno", "a1", 0)!;
    expect(buscarRecuperacion(db, token, VIGENCIA_RECUPERACION_MS - 1)?.cuentaId).toBe("a1");
    expect(buscarRecuperacion(db, token, VIGENCIA_RECUPERACION_MS + 1)).toBeUndefined();
  });
  it("no manda otro correo a la misma cuenta antes de un minuto", () => {
    const db = base();
    expect(crearRecuperacion(db, "alumno", "a1", 0)).toBeTruthy();
    expect(crearRecuperacion(db, "alumno", "a1", 30_000)).toBeUndefined();
    expect(crearRecuperacion(db, "alumno", "a1", 61_000)).toBeTruthy();
  });
});

describe("mensaje de correo", () => {
  it("codifica el asunto con acentos y no deja meter cabeceras", () => {
    const m = construirMensaje({ de: "App <no@x.mx>", para: "a@b.mx\r\nBcc: c@d.mx", asunto: "Recupera tu contraseña", texto: "Hola\n.\nAdiós", id: "<1@x.mx>", fecha: new Date(0) });
    const [cabeceras, cuerpo] = m.split("\r\n\r\n");
    expect(cabeceras).toContain("Subject: =?UTF-8?B?");
    expect(cabeceras.split("\r\n").some((l) => l.startsWith("Bcc:"))).toBe(false);
    expect(Buffer.from(cuerpo.replace(/\r\n/g, ""), "base64").toString("utf8")).toBe("Hola\r\n.\r\nAdiós");
  });
});

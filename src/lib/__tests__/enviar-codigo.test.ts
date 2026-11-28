import { describe, expect, it } from "vitest";
import { destinatariosCodigo, nombreSaludo } from "../enviar-codigo";

const grupo = {
  alumnos: [
    { matricula: "A1", nombre: "Ana López", correo: "ana@escuela.mx" },
    { matricula: "A2", nombre: "Luis Pérez", correo: "" },
    { matricula: "A3", nombre: "Eva Ruiz", correo: "no-es-correo" },
    { matricula: "A4", nombre: "Ana Repetida", correo: "ANA@escuela.mx" },
    { matricula: "A5", nombre: "Mario Díaz", correo: "mario@escuela.mx" },
  ],
};

describe("destinatariosCodigo", () => {
  it("manda solo a los elegidos con correo válido, sin repetir correo", () => {
    const r = destinatariosCodigo(grupo, ["A1", "A2", "A3", "A4"]);
    expect(r.para.map((a) => a.matricula)).toEqual(["A1"]);
    expect(r.sinCorreo).toBe(2);
  });
  it("ignora matrículas que no están en el curso", () => {
    const r = destinatariosCodigo(grupo, ["A5", "Z9"]);
    expect(r.para.map((a) => a.matricula)).toEqual(["A5"]);
    expect(r.sinCorreo).toBe(0);
  });
});

describe("nombreSaludo", () => {
  it("toma el primer nombre", () => {
    expect(nombreSaludo("  Ana  López ")).toBe("Ana");
  });
});

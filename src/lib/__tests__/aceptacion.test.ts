import { describe, expect, it } from "vitest";
import { CAMPO_ACEPTACION, VERSION_LEGAL, aceptacionDeFormulario, aceptoAvisos, aceptoVersionVigente, registroAceptacion } from "../legal/aceptacion";

function form(valores: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(valores)) f.append(k, v);
  return f;
}

describe("aceptación de los avisos", () => {
  it("exige la casilla con la versión vigente", () => {
    expect(aceptoAvisos(form({ [CAMPO_ACEPTACION]: VERSION_LEGAL }))).toBe(true);
    expect(aceptoAvisos(form({}))).toBe(false);
    expect(aceptoAvisos(form({ [CAMPO_ACEPTACION]: "on" }))).toBe(false);
    expect(aceptoAvisos(form({ [CAMPO_ACEPTACION]: "2020-01-01" }))).toBe(false);
  });

  it("guarda la versión y la fecha", () => {
    const ahora = new Date("2026-11-21T10:00:00Z");
    expect(registroAceptacion(ahora)).toEqual({ version: VERSION_LEGAL, fecha: "2026-11-21T10:00:00.000Z" });
    expect(aceptacionDeFormulario(form({ [CAMPO_ACEPTACION]: VERSION_LEGAL }), ahora)?.fecha).toBe("2026-11-21T10:00:00.000Z");
    expect(aceptacionDeFormulario(form({}), ahora)).toBeUndefined();
  });

  it("distingue cuentas sin registro o con otra versión", () => {
    expect(aceptoVersionVigente({})).toBe(false);
    expect(aceptoVersionVigente({ aceptacion: { version: "2020-01-01", fecha: "x" } })).toBe(false);
    expect(aceptoVersionVigente({ aceptacion: registroAceptacion() })).toBe(true);
  });
});

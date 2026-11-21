import { describe, expect, it } from "vitest";
import { IDIOMAS } from "../i18n/idiomas";
import { datosResponsable, textosLegales } from "../legal/documentos";

const datos = datosResponsable({ PRIVACIDAD_CORREO: "privacidad@ejemplo.mx", PRIVACIDAD_DOMICILIO: "Calle 1, CDMX" });

describe("textos legales", () => {
  it("todos los idiomas tienen las mismas secciones y países que el español", () => {
    const es = textosLegales("es", datos);
    const ids = (t: typeof es) => ({
      aviso: t.aviso.secciones.map((s) => s.id),
      politica: t.politica.secciones.map((s) => s.id),
      terminos: t.terminos.secciones.map((s) => s.id),
      paises: t.paises.lista.map((p) => p.id),
    });
    for (const idioma of IDIOMAS) expect(ids(textosLegales(idioma, datos)), idioma).toEqual(ids(es));
  });

  it("incluye los diez países pedidos", () => {
    expect(textosLegales("es", datos).paises.lista.map((p) => p.id)).toEqual(["mx", "us", "cl", "ar", "es", "de", "it", "gr", "jp", "cn"]);
  });

  it("sustituye la razón social, el correo y el domicilio sin dejar marcadores", () => {
    for (const idioma of IDIOMAS) {
      const texto = JSON.stringify(textosLegales(idioma, datos));
      expect(texto, idioma).not.toMatch(/\{(razon|correo|domicilio|sitio|dias|anio)\}/);
      expect(texto).toContain("Ieureka Innovación en soluciones educativas");
      expect(texto).toContain("privacidad@ejemplo.mx");
    }
    expect(JSON.stringify(textosLegales("es", datos).aviso)).toContain("Calle 1, CDMX");
  });

  it("usa valores predeterminados si el servidor no configura correo ni domicilio", () => {
    expect(datosResponsable({}).correo).toBe("privacidad@ieureka-grader.com");
  });
});

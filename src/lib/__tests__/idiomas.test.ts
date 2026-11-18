import { gzipSync } from "node:zlib";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import de from "../i18n/diccionarios/de";
import en from "../i18n/diccionarios/en";
import es from "../i18n/diccionarios/es";
import fr from "../i18n/diccionarios/fr";
import ja from "../i18n/diccionarios/ja";
import pt from "../i18n/diccionarios/pt";
import zh from "../i18n/diccionarios/zh";
import { buscarPais, ipv4ANumero, tablaDesdeCsv } from "../i18n/geoip";
import { elegirIdioma, formato, idiomasDelNavegador } from "../i18n/idiomas";

describe("idioma del navegador", () => {
  it("ordena por peso y deja solo los idiomas de la app", () => {
    expect(idiomasDelNavegador("it-IT,it;q=0.9,fr;q=0.8,en-US;q=0.7")).toEqual(["fr", "en"]);
    expect(idiomasDelNavegador("pt-BR")).toEqual(["pt"]);
    expect(idiomasDelNavegador("")).toEqual([]);
    expect(idiomasDelNavegador("zh-Hant-TW, ja;q=0")).toEqual(["zh"]);
  });
});

describe("elegir idioma", () => {
  it("usa el idioma oficial del país de la IP", () => {
    expect(elegirIdioma({ pais: "MX", acceptLanguage: "en-US" })).toBe("es");
    expect(elegirIdioma({ pais: "BR" })).toBe("pt");
    expect(elegirIdioma({ pais: "JP" })).toBe("ja");
    expect(elegirIdioma({ pais: "DE" })).toBe("de");
    expect(elegirIdioma({ pais: "FR" })).toBe("fr");
    expect(elegirIdioma({ pais: "CN" })).toBe("zh");
    expect(elegirIdioma({ pais: "US" })).toBe("en");
  });
  it("en países con varios idiomas oficiales respeta el navegador", () => {
    expect(elegirIdioma({ pais: "CA", acceptLanguage: "fr-CA" })).toBe("fr");
    expect(elegirIdioma({ pais: "CA", acceptLanguage: "es" })).toBe("en");
    expect(elegirIdioma({ pais: "CH", acceptLanguage: "fr-CH,de;q=0.5" })).toBe("fr");
  });
  it("en otros países usa el navegador o inglés; sin país, el navegador o español", () => {
    expect(elegirIdioma({ pais: "IT", acceptLanguage: "it-IT" })).toBe("en");
    expect(elegirIdioma({ pais: "IT", acceptLanguage: "it,de;q=0.8" })).toBe("de");
    expect(elegirIdioma({ acceptLanguage: "ja" })).toBe("ja");
    expect(elegirIdioma({})).toBe("es");
  });
});

describe("país por IP", () => {
  const csv = ["1.0.0.0,1.0.0.255,AU", "2001:db8::,2001:db8::ffff,US", "189.203.0.0,189.203.255.255,MX", "8.8.8.0,8.8.8.255,US"].join("\n");
  const tabla = tablaDesdeCsv(csv);

  it("convierte IPv4 a número", () => {
    expect(ipv4ANumero("1.0.0.1")).toBe(16777217);
    expect(ipv4ANumero("::ffff:1.0.0.1")).toBe(16777217);
    expect(ipv4ANumero("256.0.0.1")).toBeUndefined();
    expect(ipv4ANumero("2001:db8::1")).toBeUndefined();
  });
  it("encuentra el país del rango", () => {
    expect(buscarPais(tabla, "189.203.17.4")).toBe("MX");
    expect(buscarPais(tabla, "8.8.8.8")).toBe("US");
    expect(buscarPais(tabla, "1.0.0.200")).toBe("AU");
    expect(buscarPais(tabla, "9.9.9.9")).toBeUndefined();
    expect(buscarPais(tabla, "127.0.0.1")).toBeUndefined();
  });
  it("lee la base comprimida desde GEOIP_CSV", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "geoip-"));
    const archivo = path.join(dir, "base.csv.gz");
    writeFileSync(archivo, gzipSync(csv));
    process.env.GEOIP_CSV = archivo;
    const { paisDeIp } = await import("../i18n/geoip");
    expect(paisDeIp("189.203.1.1")).toBe("MX");
    expect(paisDeIp(undefined)).toBeUndefined();
  });
});

describe("diccionarios", () => {
  // Misma forma que el español: mismas claves y mismo número de elementos en las listas.
  function forma(x: unknown): unknown {
    if (typeof x === "string") return "texto";
    if (Array.isArray(x)) return x.map(forma);
    return Object.fromEntries(Object.entries(x as object).map(([k, v]) => [k, forma(v)]));
  }
  it.each(Object.entries({ en, fr, de, ja, pt, zh }))("%s tiene todos los textos", (_, d) => {
    expect(forma(d)).toEqual(forma(es));
  });
  it("conserva los marcadores {n} de cada texto", () => {
    const marcadores = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    function revisar(base: unknown, otro: unknown, ruta: string) {
      if (typeof base === "string") {
        expect(marcadores(otro as string), ruta).toBe(marcadores(base));
        return;
      }
      for (const [k, v] of Object.entries(base as object)) revisar(v, (otro as Record<string, unknown>)[k], `${ruta}.${k}`);
    }
    for (const [nombre, d] of Object.entries({ en, fr, de, ja, pt, zh })) revisar(es, d, nombre);
  });
  it("sustituye valores", () => {
    expect(formato("{n} créditos", { n: 5 })).toBe("5 créditos");
    expect(formato("Hola {x}", {})).toBe("Hola {x}");
  });
});

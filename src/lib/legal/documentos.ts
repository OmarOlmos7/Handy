// Textos legales por idioma, con los datos del responsable ya sustituidos.
import { DIAS_CONSERVACION, DIAS_FOTOS } from "../retencion";
import { formato, type Idioma } from "../i18n/idiomas";
import { RAZON_SOCIAL } from "./aceptacion";
import de from "./documentos/de";
import en from "./documentos/en";
import es from "./documentos/es";
import fr from "./documentos/fr";
import ja from "./documentos/ja";
import pt from "./documentos/pt";
import zh from "./documentos/zh";
import type { TextosLegales } from "./tipos";

const TEXTOS: Record<Idioma, TextosLegales> = { es, en, fr, de, ja, pt, zh };

/** Datos del responsable que aparecen en los textos (el correo y el domicilio se configuran en el servidor). */
export interface DatosResponsable {
  razon: string;
  correo: string;
  domicilio: string;
  sitio: string;
}

export const CORREO_PRIVACIDAD_PREDETERMINADO = "privacidad@ieureka-grader.com";

export function datosResponsable(entorno: Record<string, string | undefined> = {}): DatosResponsable {
  return {
    razon: RAZON_SOCIAL,
    correo: entorno.PRIVACIDAD_CORREO || CORREO_PRIVACIDAD_PREDETERMINADO,
    domicilio: entorno.PRIVACIDAD_DOMICILIO || "[domicilio fiscal por definir]",
    sitio: "ieureka-grader.com",
  };
}

/** Sustituye los marcadores {razon}, {correo}, {domicilio}, {sitio}, {dias} y {anio} en todos los textos. */
export function textosLegales(idioma: Idioma, datos: DatosResponsable): TextosLegales & { razon: string } {
  const valores = { ...datos, dias: DIAS_FOTOS, anio: DIAS_CONSERVACION };
  const f = (x: string) => formato(x, valores);
  const doc = (d: TextosLegales["aviso"]) => ({
    titulo: f(d.titulo),
    resumen: f(d.resumen),
    secciones: d.secciones.map((s) => ({ ...s, titulo: f(s.titulo), parrafos: s.parrafos.map(f), lista: s.lista?.map(f) })),
  });
  const t = TEXTOS[idioma] ?? es;
  return {
    razon: datos.razon,
    aviso: doc(t.aviso),
    politica: doc(t.politica),
    terminos: doc(t.terminos),
    paises: {
      titulo: f(t.paises.titulo),
      intro: f(t.paises.intro),
      lista: t.paises.lista.map((p) => ({ ...p, puntos: p.puntos.map(f) })),
    },
  };
}

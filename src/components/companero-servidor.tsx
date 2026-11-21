// Prepara al compañero de estudio en el servidor: calcula su ánimo y traduce lo que dice.
import type { Sugerencia } from "@/lib/autoestudio";
import { datosCompanero } from "@/lib/companero";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import type { AlumnoConSesion } from "@/lib/sesion";
import type { BaseDeDatos } from "@/lib/tipos";
import { CompaneroEstudio } from "./companero-estudio";

function textoSugerencia(t: Diccionario, s: Sugerencia): string {
  const m = t.autoestudio.companero.mensajes;
  if (s.clave === "proxima" && Number(s.valores.horas) >= 48) return formato(m.proximaDias, s.valores);
  return formato(m[s.clave], s.valores);
}

export async function CompaneroDelAlumno({ db, alumno, grupoId }: { db: BaseDeDatos; alumno: AlumnoConSesion; grupoId?: string }) {
  const { t } = await textos();
  const cursos = grupoId ? alumno.cursos.filter((c) => c.grupo.id === grupoId) : alumno.cursos;
  if (cursos.length === 0) return null;
  const d = datosCompanero(db, alumno.id, cursos);
  return (
    <CompaneroEstudio
      animo={d.animo}
      ideas={d.sugerencias.map((s) => ({ texto: textoSugerencia(t, s), tipo: s.tipo, tema: s.tema, grupoId: s.grupoId }))}
      cursos={d.cursos}
      grupoFijo={grupoId}
      restantes={d.restantes}
    />
  );
}

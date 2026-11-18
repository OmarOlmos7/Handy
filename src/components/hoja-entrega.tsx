import type { Actividad, Alumno, Entrega } from "@/lib/tipos";
import { Hoja } from "./hoja";
import { HojaFoto, HojasArchivadas } from "./hoja-foto";

/** Muestra la página con fotos reales si existen; si no (datos de ejemplo), la dibuja en SVG. */
export function HojaEntrega(props: {
  actividad: Actividad;
  alumno: Alumno;
  entrega: Entrega;
  pagina: number;
  grupoTexto: string;
  modoProfesor?: boolean;
}) {
  if (!props.entrega.imagenes?.length && props.entrega.pdf) {
    // Fotos ya archivadas: se muestran las hojas corregidas guardadas en PDF.
    if (props.pagina !== 1) return null;
    return <HojasArchivadas actividadId={props.actividad.id} matricula={props.entrega.matricula} />;
  }
  if (props.entrega.imagenes?.length) {
    return <HojaFoto actividad={props.actividad} entrega={props.entrega} pagina={props.pagina} modoProfesor={props.modoProfesor} />;
  }
  return (
    <Hoja
      actividad={props.actividad}
      pagina={props.pagina}
      modo="alumno"
      alumno={props.alumno}
      entrega={props.entrega}
      grupoTexto={props.grupoTexto}
      anotada
      modoProfesor={props.modoProfesor}
    />
  );
}

export function paginasDe(actividad: Actividad, entrega: Entrega) {
  if (!entrega.imagenes?.length && entrega.pdf) return 1;
  return entrega.imagenes?.length || actividad.paginas;
}

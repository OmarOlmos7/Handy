import type { Actividad, Alumno, Entrega } from "@/lib/tipos";
import { Hoja } from "./hoja";
import { HojaFoto } from "./hoja-foto";

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
    return (
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <iframe
          src={`/api/pdf/${props.actividad.id}/${encodeURIComponent(props.entrega.matricula)}?hojas=1#view=FitH`}
          title="Hojas corregidas"
          className="h-[80vh] w-full"
        />
        <a
          href={`/api/pdf/${props.actividad.id}/${encodeURIComponent(props.entrega.matricula)}?hojas=1`}
          target="_blank"
          className="block border-t border-slate-100 px-4 py-2 text-center text-xs font-medium text-tinta-700 hover:bg-slate-50"
        >
          Abrir las hojas corregidas en otra pestaña
        </a>
      </div>
    );
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

import { leer, modificar } from "@/lib/almacen";
import { creditosPorPagina, precisionPara, sumarCreditos } from "@/lib/configuracion";
import { saldoDe } from "@/lib/cuentas";
import { ErrorIA } from "@/lib/ia";
import { sugerirEvaluacionEtapa } from "@/lib/ia-proyecto";
import { esIdioma } from "@/lib/i18n/idiomas";
import { hayQueLeer, materialParaIA } from "@/lib/material-ia";
import { accesoProyecto } from "@/lib/proyectos-servidor";
import { profesorActual } from "@/lib/sesion";

export const maxDuration = 300;

/** Créditos de la sugerencia: una página por cada página que lee la IA (mínimo una). */
function costo(paginas: number, config: Parameters<typeof precisionPara>[1]) {
  return sumarCreditos(Math.max(1, paginas) * creditosPorPagina(precisionPara(undefined, config)));
}

// Sugerencia de evaluación con IA a partir de la evidencia de una etapa. La pide un evaluador y se
// cobra a sus créditos. A la IA van la evidencia y la rúbrica, nunca el nombre ni la matrícula.
export async function POST(req: Request, ctx: RouteContext<"/api/proyectos/[id]/sugerir">) {
  const { id } = await ctx.params;
  const profesor = await profesorActual();
  if (!profesor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const db = await leer();
  const acceso = accesoProyecto(db, id, profesor.id);
  if (!acceso) return Response.json({ error: "No autorizado" }, { status: 403 });
  const { etapaId, sujeto } = (await req.json().catch(() => ({}))) as { etapaId?: string; sujeto?: string };
  const etapa = acceso.proyecto.etapas.find((e) => e.id === etapaId);
  if (!etapa || !etapa.criterios.length) return Response.json({ error: "La etapa no tiene rúbrica" }, { status: 400 });
  const entrega = (db.entregasProyecto ?? []).find((e) => e.proyectoId === id && e.etapaId === etapaId && e.sujeto === sujeto);
  if (!entrega?.archivos.length) return Response.json({ error: "No hay evidencia" }, { status: 400 });
  const material = await materialParaIA(entrega.archivos.map((ruta, i) => ({ ruta, nombre: entrega.nombres[i] })));
  if (!hayQueLeer(material)) return Response.json({ error: "No hay evidencia que la IA pueda leer" }, { status: 400 });
  const cuesta = costo(entrega.paginasIA ?? entrega.archivos.length, profesor.config);
  if (saldoDe(db, profesor.id) < cuesta) return Response.json({ error: "No hay créditos suficientes. Compra créditos y vuelve a intentar." }, { status: 402 });
  try {
    const sugerencia = await sugerirEvaluacionEtapa(
      { titulo: acceso.proyecto.titulo, etapa, material },
      { profesorId: profesor.id, precision: precisionPara(undefined, profesor.config), idioma: esIdioma(acceso.proyecto.idioma) ? acceso.proyecto.idioma : undefined },
    );
    modificar((d) => {
      d.movimientos.unshift({
        profesorId: profesor.id,
        fecha: new Date().toISOString().slice(0, 10),
        concepto: `Proyecto · ${acceso.proyecto.titulo} · ${etapa.nombre}`,
        cantidad: -cuesta,
      });
    });
    return Response.json({ sugerencia });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err instanceof ErrorIA ? err.message : "No se pudo obtener la sugerencia." }, { status: 502 });
  }
}

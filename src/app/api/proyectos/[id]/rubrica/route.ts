import { leer } from "@/lib/almacen";
import { ErrorIA } from "@/lib/ia";
import { generarRubricaEtapa } from "@/lib/ia-proyecto";
import { esIdioma } from "@/lib/i18n/idiomas";
import { TIPOS_ETAPA } from "@/lib/proyectos";
import { accesoProyecto } from "@/lib/proyectos-servidor";
import { profesorActual } from "@/lib/sesion";
import type { TipoEtapaProyecto } from "@/lib/tipos";

export const maxDuration = 120;

// Rúbrica base de una etapa con IA, a partir de lo que el profesor lleva escrito en el modelo
// (aún sin guardar). Solo el profesor del curso. No consume créditos, como la rúbrica de las actividades.
export async function POST(req: Request, ctx: RouteContext<"/api/proyectos/[id]/rubrica">) {
  const { id } = await ctx.params;
  const profesor = await profesorActual();
  if (!profesor) return Response.json({ error: "Inicia sesión" }, { status: 401 });
  const db = await leer();
  const acceso = accesoProyecto(db, id, profesor.id);
  if (!acceso?.esDueno) return Response.json({ error: "No autorizado" }, { status: 403 });
  const cuerpo = (await req.json().catch(() => ({}))) as {
    titulo?: string;
    descripcion?: string;
    indicaciones?: string;
    etapa?: { nombre?: string; tipo?: string; instrucciones?: string; porEquipo?: boolean; conEvidencia?: boolean };
  };
  const e = cuerpo.etapa ?? {};
  const tipo: TipoEtapaProyecto = (TIPOS_ETAPA as string[]).includes(String(e.tipo)) ? (e.tipo as TipoEtapaProyecto) : "reporte";
  try {
    const criterios = await generarRubricaEtapa(
      {
        titulo: String(cuerpo.titulo || acceso.proyecto.titulo).slice(0, 140),
        descripcion: String(cuerpo.descripcion ?? acceso.proyecto.descripcion).slice(0, 3000),
        materia: acceso.grupo.materia,
        etapa: {
          nombre: String(e.nombre ?? "").slice(0, 120),
          tipo,
          instrucciones: String(e.instrucciones ?? "").slice(0, 4000),
          porEquipo: Boolean(e.porEquipo),
          conEvidencia: Boolean(e.conEvidencia),
        },
        indicaciones: String(cuerpo.indicaciones ?? "").slice(0, 2000),
      },
      { profesorId: profesor.id, idioma: esIdioma(acceso.proyecto.idioma) ? acceso.proyecto.idioma : undefined },
    );
    return Response.json({ criterios });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err instanceof ErrorIA ? err.message : "No se pudo generar la rúbrica." }, { status: 502 });
  }
}

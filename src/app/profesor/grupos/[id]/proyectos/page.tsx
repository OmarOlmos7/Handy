import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RutaProyecto } from "@/components/ruta-proyecto";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { avanceRuta, evaluadoresDe, rutaGrupo } from "@/lib/proyectos";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.proyecto.grupo.titulo };
}

/** Proyectos del grupo (uno o varios): cada uno con su ruta de avance y sus etapas para evaluar. */
export default async function ProyectosGrupo({ params }: PageProps<"/profesor/grupos/[id]/proyectos">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t } = await textos();
  const tp = t.proyecto;
  const c = t.profesor.comun;
  const proyectos = (db.proyectos ?? []).filter((p) => p.grupoId === id);
  return (
    <>
      <Encabezado
        migas={[
          { texto: c.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
        ]}
        rutaEtiqueta={c.ruta}
        titulo={`🏆 ${tp.grupo.titulo}`}
        subtitulo={tp.grupo.subtitulo}
      />
      {proyectos.length === 0 && <Tarjeta className="text-sm text-slate-600">{tp.grupo.sinProyectos}</Tarjeta>}
      <div className="space-y-5">
        {proyectos.map((p) => {
          const pasos = rutaGrupo(p, grupo.alumnos, (db.evaluacionesProyecto ?? []).filter((e) => e.proyectoId === p.id));
          const ev = evaluadoresDe(p).length;
          const cerradas = p.etapas.filter((e) => e.cerradaEn).length;
          return (
            <Tarjeta key={p.id}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900">🛠️ {p.titulo}</h2>
                  {p.descripcion && <p className="mt-1 text-sm text-slate-600">{p.descripcion}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    {formato(p.etapas.length === 1 ? tp.etapas1 : tp.etapasN, { n: p.etapas.length })} ·{" "}
                    {formato(ev === 1 ? tp.evaluadores1 : tp.evaluadoresN, { n: ev })} · {formato(tp.cerradasDe, { c: cerradas, n: p.etapas.length })}
                  </p>
                </div>
                <BotonLink variante="secundario" className="shrink-0" href={`/profesor/proyectos/${p.id}`}>
                  {tp.grupo.abrir} →
                </BotonLink>
              </div>
              <RutaProyecto
                pasos={pasos}
                avanceTotal={avanceRuta(pasos)}
                t={t}
                enlace={(etapaId) => `/profesor/proyectos/${p.id}?etapa=${etapaId}`}
                nota={tp.ruta.notaProfesor}
              />
            </Tarjeta>
          );
        })}
      </div>
    </>
  );
}

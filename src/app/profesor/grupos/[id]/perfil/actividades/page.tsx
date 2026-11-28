import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Encabezado, fechaLarga } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { perfilActivo } from "@/lib/banderas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { conPuntaje } from "@/lib/modalidad";
import { datosProfesor } from "@/lib/sesion";
import type { Actividad } from "@/lib/tipos";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.etapasActividad.titulo };
}

/** Cuántos elementos de la rúbrica (reactivos, pasos y criterios) tienen etapa fijada por el profesor. */
function conteo(a: Actividad) {
  let total = 0;
  let fijadas = 0;
  for (const r of a.reactivos) {
    total++;
    if (r.etapaCrear) fijadas++;
    for (const p of r.pasos ?? []) {
      total++;
      if (p.etapaCrear) fijadas++;
    }
  }
  for (const c of a.criterios ?? []) {
    total++;
    if (c.etapaCrear) fijadas++;
  }
  return { total, fijadas };
}

/** Actividades del curso para revisar sus etapas CREAR. */
export default async function EtapasActividades({ params }: PageProps<"/profesor/grupos/[id]/perfil/actividades">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  if (!perfilActivo()) notFound();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t, locale } = await textos();
  const te = t.perfil.etapasActividad;
  const actividades = db.actividades
    .filter((a) => a.grupoId === grupo.id && a.rubricaConfirmada && a.reactivos.length > 0 && conPuntaje(a))
    .sort((a, b) => b.fechaAplicacion.localeCompare(a.fechaAplicacion));
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: t.perfil.profesor.titulo, href: `/profesor/grupos/${grupo.id}/perfil` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={te.titulo}
        subtitulo={te.subtitulo}
      />
      {actividades.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">{te.sinActividades}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {actividades.map((a) => {
            const c = conteo(a);
            return (
              <li key={a.id}>
                <Link href={`/profesor/grupos/${grupo.id}/perfil/actividades/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900">{a.titulo}</span>
                    <span className="block text-xs text-slate-500">{fechaLarga(a.fechaAplicacion, locale)}</span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.fijadas ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                    {formato(te.fijadas, { n: c.fijadas, t: c.total })}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

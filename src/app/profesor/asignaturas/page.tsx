import type { Metadata } from "next";
import Link from "next/link";
import { BotonLink, Encabezado, Insignia, Tarjeta, fechaLarga } from "@/components/ui";
import { resumenTemario } from "@/lib/asignaturas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.asignaturas.titulo };
}

/** Asignaturas del profesor: el syllabus (unidades, temas y subtemas) de cada materia. */
export default async function Asignaturas() {
  const { db } = await datosProfesor();
  const { t, locale } = await textos();
  const ta = t.profesor.asignaturas;
  const asignaturas = db.asignaturas ?? [];
  return (
    <>
      <Encabezado
        migas={[{ texto: t.profesor.comun.panel, href: "/profesor" }]}
        titulo={ta.titulo}
        subtitulo={ta.subtitulo}
        acciones={<BotonLink href="/profesor/asignaturas/nueva">{ta.nueva}</BotonLink>}
      />
      {asignaturas.length === 0 ? (
        <Tarjeta className="text-sm text-slate-600">
          {ta.sinAsignaturas}{" "}
          <Link href="/profesor/asignaturas/nueva" className="font-medium text-tinta-700 hover:underline">
            {ta.nueva}
          </Link>
        </Tarjeta>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {asignaturas.map((a) => {
            const r = resumenTemario(a.unidades);
            return (
              <Link
                key={a.id}
                href={`/profesor/asignaturas/${a.id}`}
                className="group rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-tinta-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-slate-900 group-hover:text-tinta-700">{a.nombre}</h2>
                  <Insignia>{ta.origen[a.origen]}</Insignia>
                </div>
                {a.nivel && <p className="text-sm text-slate-500">{a.nivel}</p>}
                <p className="mt-3 text-sm text-slate-700">{formato(ta.resumen, { u: r.unidades, t: r.temas, s: r.subtemas })}</p>
                <ol className="mt-2 space-y-0.5 text-xs text-slate-500">
                  {a.unidades.slice(0, 4).map((u) => (
                    <li key={u.nombre} className="truncate">
                      {u.nombre}
                    </li>
                  ))}
                  {a.unidades.length > 4 && <li>…</li>}
                </ol>
                <p className="mt-3 text-xs text-slate-400">{formato(ta.actualizada, { f: fechaLarga(a.actualizadaEn.slice(0, 10), locale) })}</p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

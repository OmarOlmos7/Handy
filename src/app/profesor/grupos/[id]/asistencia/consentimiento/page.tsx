import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotonImprimir } from "@/components/boton-imprimir";
import { Encabezado } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosResponsable } from "@/lib/legal/documentos";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.asistencia.formato.meta };
}

/**
 * Formato imprimible de consentimiento para usar el rostro en la asistencia: una hoja por alumno con
 * su nombre, para que la firme el alumno mayor de edad o su madre, padre o tutor.
 */
export default async function FormatoConsentimiento({ params }: PageProps<"/profesor/grupos/[id]/asistencia/consentimiento">) {
  const { id } = await params;
  const { db, profesor } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t, locale } = await textos();
  const ta = t.asistencia;
  const tf = ta.formato;
  const { sitio } = datosResponsable(process.env);
  const alumnos = [...grupo.alumnos].sort((a, b) => a.nombre.localeCompare(b.nombre, locale));
  // Sin alumnos, una hoja en blanco.
  const hojas = alumnos.length ? alumnos : [{ matricula: "", nombre: "" }];
  const linea = (texto: string, valor = "") => (
    <div className="mt-5">
      <div className="min-h-7 border-b border-slate-400 px-1 pb-0.5 text-base text-slate-900">{valor}</div>
      <p className="mt-1 text-xs text-slate-500">{texto}</p>
    </div>
  );

  return (
    <>
      <div className="no-imprimir">
        <Encabezado
          migas={[
            { texto: t.profesor.comun.panel, href: "/profesor" },
            { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
            { texto: ta.meta, href: `/profesor/grupos/${grupo.id}/asistencia` },
            { texto: ta.rostros.meta, href: `/profesor/grupos/${grupo.id}/asistencia/rostros` },
          ]}
          rutaEtiqueta={t.profesor.comun.ruta}
          titulo={tf.meta}
          subtitulo={tf.nota}
          acciones={<BotonImprimir texto={tf.imprimir} />}
        />
      </div>
      <div className="space-y-6 print:space-y-0">
        {hojas.map((a, i) => (
          <article
            key={a.matricula || i}
            className="hoja-actividad mx-auto max-w-3xl rounded-xl bg-white p-8 text-sm leading-relaxed text-slate-800 shadow-sm ring-1 ring-slate-200 print:break-after-page"
          >
            <h1 className="text-lg font-semibold text-slate-900">{tf.titulo}</h1>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div>
                <dt className="inline text-slate-500">{tf.curso}: </dt>
                <dd className="inline font-medium">
                  {grupo.materia} · {grupo.nombre} ({grupo.ciclo})
                </dd>
              </div>
              <div>
                <dt className="inline text-slate-500">{tf.profesor}: </dt>
                <dd className="inline font-medium">{profesor.nombre}</dd>
              </div>
            </dl>
            {tf.parrafos.map((p, j) => (
              <p key={j} className="mt-3">
                {formato(p, { sitio })}
              </p>
            ))}
            <div className="grid grid-cols-[2fr_1fr] gap-x-6">
              {linea(tf.alumno, a.nombre)}
              {linea(tf.matricula, a.matricula)}
            </div>
            <div className="grid grid-cols-[2fr_1fr] gap-x-6">
              {linea(tf.tutor)}
              {linea(tf.parentesco)}
            </div>
            <div className="grid grid-cols-[2fr_1fr] gap-x-6">
              {linea(tf.firma)}
              {linea(tf.fecha)}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

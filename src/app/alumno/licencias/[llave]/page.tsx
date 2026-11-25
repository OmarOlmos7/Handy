import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { iniciarLicencia, simularPago } from "@/app/acciones-licencias";
import { Boton, BotonLink, Encabezado, Insignia, Tarjeta, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { formatoPrecio } from "@/lib/divisas";
import { formato } from "@/lib/i18n/idiomas";
import { divisaActual, textos } from "@/lib/i18n/servidor";
import { normalizarLlave } from "@/lib/licencias";
import { pagosDemo } from "@/lib/mercadopago";
import { alumnoActual } from "@/lib/sesion";
import { estadoVisible, tonoEstado } from "@/components/estado-licencia";

export async function generateMetadata({ params }: PageProps<"/alumno/licencias/[llave]">): Promise<Metadata> {
  const { t } = await textos();
  return { title: formato(t.licencias.alumno.detalleTitulo, { llave: normalizarLlave((await params).llave) }) };
}

/** Estado de una licencia: aquí regresa el alumno desde Mercado Pago. */
export default async function DetalleLicencia({ params }: PageProps<"/alumno/licencias/[llave]">) {
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const llave = normalizarLlave((await params).llave);
  const db = await leer();
  const l = (db.licencias ?? []).find((x) => x.llave === llave && x.alumnoId === alumno.id);
  if (!l) notFound();
  const grupo = db.grupos.find((g) => g.id === l.grupoId);
  const { t, locale } = await textos();
  const tl = t.licencias;
  const ta = tl.alumno;
  const e = estadoVisible(l);
  const divisa = await divisaActual();
  return (
    <>
      <Encabezado titulo={formato(ta.detalleTitulo, { llave: l.llave })} subtitulo={grupo ? `${grupo.materia} · ${grupo.nombre} · ${grupo.ciclo}` : l.codigoCurso} />
      <Tarjeta className="max-w-xl">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">{ta.licencia}</dt>
            <dd className="font-medium">
              {tl.tipos[l.tipo].nombre} · {formatoPrecio(l.precio, divisa, locale)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">{ta.estado}</dt>
            <dd>
              <Insignia tono={tonoEstado[e]}>{ta.estados[e]}</Insignia>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">{ta.codigo}</dt>
            <dd className="font-mono">{l.codigoCurso}</dd>
          </div>
          {l.vence && (
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{ta.vence}</dt>
              <dd>{fechaLarga(l.vence.slice(0, 10), locale)}</dd>
            </div>
          )}
        </dl>
        {e === "pagada" && (
          <>
            <p className="mt-4 rounded-lg bg-acierto-suave p-3 text-sm text-acierto" role="status">
              {formato(ta.pagadaTexto, { fecha: fechaLarga(l.vence!.slice(0, 10), locale) })}
            </p>
            <BotonLink href={`/alumno/cursos/${l.grupoId}`} className="mt-4">
              {ta.irAlCurso}
            </BotonLink>
          </>
        )}
        {e === "pendiente" && (
          <>
            <p className="mt-4 rounded-lg bg-aviso-suave p-3 text-sm text-aviso" role="status">
              {ta.pendienteTexto}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={iniciarLicencia}>
                <input type="hidden" name="codigo" value={l.codigoCurso} />
                <input type="hidden" name="tipo" value={l.tipo} />
                <Boton type="submit">{ta.volverAPagar}</Boton>
              </form>
              {pagosDemo() && (
                <form action={simularPago}>
                  <input type="hidden" name="llave" value={l.llave} />
                  <Boton type="submit" variante="secundario">
                    {ta.simular}
                  </Boton>
                </form>
              )}
            </div>
          </>
        )}
      </Tarjeta>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { iniciarLicencia } from "@/app/acciones-licencias";
import { estadoVisible, tonoEstado } from "@/components/estado-licencia";
import { Boton, Encabezado, Insignia, campo, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { formatoPrecio } from "@/lib/divisas";
import { divisaActual, textos } from "@/lib/i18n/servidor";
import { LICENCIAS, esIdLicencia } from "@/lib/licencias";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.licencias.alumno.titulo };
}

/** El alumno activa un curso con su código: elige la duración y va a pagar. */
export default async function Licencias({ searchParams }: PageProps<"/alumno/licencias">) {
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const { t, locale } = await textos();
  const tl = t.licencias;
  const ta = tl.alumno;
  const divisa = await divisaActual();
  const q = await searchParams;
  const codigo = typeof q.codigo === "string" ? q.codigo : "";
  const tipo = typeof q.tipo === "string" && esIdLicencia(q.tipo) ? q.tipo : "semestre";
  const error = typeof q.error === "string" && q.error in ta.errores ? ta.errores[q.error as keyof typeof ta.errores] : undefined;
  const db = await leer();
  const mias = (db.licencias ?? []).filter((l) => l.alumnoId === alumno.id).sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
  const grupos = new Map(db.grupos.map((g) => [g.id, g]));

  return (
    <>
      <Encabezado titulo={ta.titulo} subtitulo={ta.subtitulo} />
      <form action={iniciarLicencia} className="max-w-3xl space-y-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <label className="block max-w-xs text-sm font-medium text-slate-700">
          {ta.codigo}
          <input name="codigo" required defaultValue={codigo} className={`${campo} font-mono uppercase`} placeholder={ta.codigoEjemplo} autoCapitalize="characters" />
        </label>
        <fieldset>
          <legend className="text-sm font-medium text-slate-700">{ta.duracion}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LICENCIAS.map((l) => (
              <label key={l.id} className="relative flex cursor-pointer flex-col rounded-xl p-4 ring-2 ring-slate-200 has-[:checked]:bg-tinta-50 has-[:checked]:ring-tinta-600">
                <input type="radio" name="tipo" value={l.id} defaultChecked={l.id === tipo} className="sr-only" />
                <span className="font-semibold">{tl.tipos[l.id].nombre}</span>
                <span className="mt-1 text-2xl font-semibold">{formatoPrecio(l.precio, divisa, locale)}</span>
                {l.provisional && <span className="text-xs font-medium text-aviso">{tl.provisional}</span>}
                <span className="mt-1 text-xs text-slate-500">{tl.tipos[l.id].detalle}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p className="rounded-lg bg-error-suave p-3 text-sm text-error" role="alert">{error}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <Boton type="submit">{ta.pagar}</Boton>
          <p className="max-w-md text-xs text-slate-500">{ta.seguro}</p>
        </div>
      </form>

      <h2 className="mb-3 mt-10 text-lg font-semibold">{ta.misLicencias}</h2>
      {mias.length === 0 ? (
        <p className="text-sm text-slate-500">{ta.sinLicencias}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">{ta.curso}</th>
                <th className="px-4 py-3 font-medium">{ta.licencia}</th>
                <th className="px-4 py-3 font-medium">{ta.estado}</th>
                <th className="px-4 py-3 font-medium">{ta.vence}</th>
                <th className="px-4 py-3 font-medium">{ta.llave}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mias.map((l) => {
                const g = grupos.get(l.grupoId);
                const e = estadoVisible(l);
                return (
                  <tr key={l.llave}>
                    <td className="px-4 py-2">{g ? `${g.materia} · ${g.nombre}` : l.codigoCurso}</td>
                    <td className="px-4 py-2">{tl.tipos[l.tipo].nombre}</td>
                    <td className="px-4 py-2">
                      <Insignia tono={tonoEstado[e]}>{ta.estados[e]}</Insignia>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{l.vence ? fechaLarga(l.vence.slice(0, 10), locale) : "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs">
                      <Link href={`/alumno/licencias/${l.llave}`} className="text-tinta-700 hover:underline">
                        {l.llave}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

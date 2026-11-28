import type { Metadata } from "next";
import { ESCALA, PUNTO_PREDETERMINADO, valoresEscala } from "@/lib/configuracion";
import { Encabezado, Tarjeta, fechaLarga } from "@/components/ui";
import { QuitarEjemplo } from "@/components/quitar-ejemplo";
import { saldo } from "@/lib/almacen";
import { CREDITOS_POR_SEMANA, LICENCIAS, creditosLicencia, resumenLicenciasProfesor } from "@/lib/licencias";
import { datosProfesor } from "@/lib/sesion";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.creditos.titulo };
}

export default async function Creditos() {
  const { db, profesor } = await datosProfesor();
  const { t, locale } = await textos();
  const tc = t.profesor.creditos;
  const hayEjemplo = db.actividades.some((a) => a.demo);
  const saldoCreditos = saldo(db);
  const movimientos = db.movimientos;
  const tl = t.licencias.profesor;
  const porCurso = resumenLicenciasProfesor(db, profesor.id);
  const creditos = LICENCIAS.map(creditosLicencia);
  return (
    <>
      <Encabezado
        titulo={tc.titulo}
        subtitulo={formato(tc.subtitulo, valoresEscala(locale))}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Tarjeta>
          <p className="text-sm text-slate-500">{tc.saldo}</p>
          <p className="mt-1 text-3xl font-semibold">{saldoCreditos.toLocaleString(locale)}</p>
          <p className="text-xs text-slate-500">{formato(tc.aproximado, { n: Math.floor(saldoCreditos / (3 * ESCALA[PUNTO_PREDETERMINADO].creditos)).toLocaleString(locale) })}</p>
        </Tarjeta>
      </div>
      <h2 className="mb-1 text-lg font-semibold">{tl.creditosTitulo}</h2>
      <p className="mb-3 max-w-3xl text-sm text-slate-600">
        {formato(tl.creditosTexto, { n: CREDITOS_POR_SEMANA, min: Math.min(...creditos), max: Math.max(...creditos) })}
      </p>
      {porCurso.length === 0 ? (
        <p className="text-sm text-slate-500">{tl.sinCursos}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t.licencias.alumno.curso}</th>
                <th className="px-4 py-3 font-medium">{tl.codigoCurso}</th>
                <th className="px-4 py-3 text-right font-medium">{tl.vigentes}</th>
                <th className="px-4 py-3 text-right font-medium">{tl.creditosAbonados}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {porCurso.map(({ grupo, vigentes, creditos: abonados }) => (
                <tr key={grupo.id}>
                  <td className="px-4 py-2">
                    {grupo.materia} · {grupo.nombre}
                  </td>
                  <td className="px-4 py-2 font-mono">{grupo.codigo}</td>
                  <td className="px-4 py-2 text-right">{vigentes.toLocaleString(locale)}</td>
                  <td className="px-4 py-2 text-right font-medium text-acierto">{abonados.toLocaleString(locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2 className="mb-3 mt-10 text-lg font-semibold">{tc.movimientos}</h2>
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">{t.profesor.comun.fecha}</th>
              <th className="px-4 py-3 font-medium">{tc.concepto}</th>
              <th className="px-4 py-3 text-right font-medium">{tc.creditos}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movimientos.map((m, i) => (
              <tr key={i}>
                <td className="px-4 py-2 text-slate-600">{fechaLarga(m.fecha, locale)}</td>
                <td className="px-4 py-2">{m.concepto}</td>
                <td className={`px-4 py-2 text-right font-medium ${m.cantidad > 0 ? "text-acierto" : "text-slate-700"}`}>
                  {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hayEjemplo && (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 p-5">
          <h2 className="font-semibold">{tc.ejemploTitulo}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {tc.ejemploTexto}
          </p>
          <QuitarEjemplo />
        </div>
      )}
    </>
  );
}

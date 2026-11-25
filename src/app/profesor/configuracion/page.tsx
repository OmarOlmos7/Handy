import type { Metadata } from "next";
import { guardarCuenta, guardarPrecision, guardarRangos } from "@/app/acciones-configuracion";
import { cambiarIdioma } from "@/app/acciones-idioma";
import { ElegirLogo } from "@/components/elegir-logo";
import { ConfigPrecision } from "@/components/precision-ia";
import { Boton, Encabezado, Tarjeta, campo, fechaLarga } from "@/components/ui";
import { NIVELES_REPORTE, configuracionDe, valoresEscala, type NivelReporte } from "@/lib/configuracion";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { IDIOMAS, NOMBRE_IDIOMA, formato } from "@/lib/i18n/idiomas";
import { MAX_BYTES_LOGO, srcLogo } from "@/lib/logo";
import { textos } from "@/lib/i18n/servidor";
import { DIAS_AVISO, DIAS_FOTOS, diasRestantes, fechaBorrado } from "@/lib/retencion";
import { datosProfesor } from "@/lib/sesion";
import type { RangosCalificacion } from "@/lib/tipos";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.configuracion.titulo };
}

function Aviso({ seccion, actual, ok, error, t }: { seccion: string; actual?: string; ok?: string; error?: string; t: Diccionario }) {
  if (actual !== seccion) return null;
  // Los avisos llegan como clave del diccionario; si no lo es, se muestra el texto tal cual.
  const avisos = t.configuracion.avisos as Record<string, string>;
  if (error) return <p className="mt-4 rounded-lg bg-error-suave p-3 text-sm text-error">{avisos[error] ?? error}</p>;
  if (ok)
    return (
      <p className="mt-4 rounded-lg bg-acierto-suave p-3 text-sm text-acierto" role="status">
        {avisos[ok] ?? ok}
      </p>
    );
  return null;
}

/** "70 a 84" en el idioma elegido. */
function intervalo(nivel: NivelReporte, r: RangosCalificacion, t: Diccionario) {
  const [a, b] = { bajo: [0, r.medio - 1], medio: [r.medio, r.alto - 1], alto: [r.alto, r.superior - 1], superior: [r.superior, 100] }[nivel];
  return formato(t.configuracion.intervalo, { a, b });
}

/** Preferencias del profesor: cuenta, idioma, rangos de calificación para reportes y precisión de la IA. */
export default async function Configuracion({ searchParams }: PageProps<"/profesor/configuracion">) {
  const { profesor, db } = await datosProfesor();
  const { idioma, t, locale } = await textos();
  const c = t.configuracion;
  const ahora = new Date();
  const conservacion = db.actividades
    .filter((a) => !a.demo)
    .map((a) => {
      const entregas = db.entregas.filter((e) => e.actividadId === a.id);
      const borrado = fechaBorrado(a, entregas);
      return {
        actividad: a,
        grupo: db.grupos.find((g) => g.id === a.grupoId),
        evaluadas: entregas.filter((e) => e.resultados.length > 0 && (e.imagenes?.length || e.pdf)).length,
        borrado,
        dias: diasRestantes(borrado, ahora),
      };
    })
    .sort((x, y) => x.borrado.getTime() - y.borrado.getTime());
  const conf = configuracionDe(profesor.config);
  const q = await searchParams;
  const texto = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);
  const aviso = { actual: texto("s"), ok: texto("ok"), error: texto("error"), t };
  const r = conf.rangos;
  const [antesAnio, despuesAnio = ""] = c.conservacionAnio.split("{anio}");

  return (
    <>
      <Encabezado titulo={c.titulo} subtitulo={c.subtitulo} />
      <div className="space-y-6">
        <Tarjeta>
          <h2 id="idioma" className="scroll-mt-6 text-lg font-semibold">
            {c.idiomaTitulo}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{c.idiomaTexto}</p>
          <form action={cambiarIdioma} className="mt-4">
            <input type="hidden" name="volver" value="/profesor/configuracion?s=idioma&ok=idiomaGuardado#idioma" />
            <fieldset className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
              <legend className="sr-only">{c.idiomaTitulo}</legend>
              {IDIOMAS.map((i) => (
                <label
                  key={i}
                  lang={i}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 has-[:checked]:bg-tinta-50 has-[:checked]:font-medium has-[:checked]:text-tinta-700 has-[:checked]:ring-2 has-[:checked]:ring-tinta-500 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-tinta-400"
                >
                  <input type="radio" name="idioma" value={i} defaultChecked={i === idioma} className="h-4 w-4 accent-tinta-600" />
                  {NOMBRE_IDIOMA[i]}
                </label>
              ))}
            </fieldset>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Boton type="submit">{c.guardarIdioma}</Boton>
              <span className="text-xs text-slate-500">{c.etapaIdioma}</span>
            </div>
          </form>
          <Aviso seccion="idioma" {...aviso} />
        </Tarjeta>

        <Tarjeta>
          <h2 id="cuenta" className="scroll-mt-6 text-lg font-semibold">
            {c.cuentaTitulo}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{formato(c.correoAcceso, { correo: profesor.correo })}</p>
          <form action={guardarCuenta} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2 sm:max-w-md">
              {c.nombre}
              <input name="nombre" required maxLength={80} defaultValue={profesor.nombre} autoComplete="name" className={campo} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {c.contrasenaActual}
              <input name="actual" type="password" autoComplete="current-password" className={campo} />
            </label>
            <span className="hidden sm:block" />
            <label className="block text-sm font-medium text-slate-700">
              {c.nuevaContrasena}
              <input name="nueva" type="password" minLength={8} autoComplete="new-password" className={campo} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              {c.confirmarContrasena}
              <input name="confirmar" type="password" minLength={8} autoComplete="new-password" className={campo} />
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Boton type="submit">{c.guardar}</Boton>
              <span className="text-xs text-slate-500">{c.notaContrasena}</span>
            </div>
          </form>
          <Aviso seccion="cuenta" {...aviso} />
        </Tarjeta>

        <Tarjeta>
          <h2 id="logo" className="scroll-mt-6 text-lg font-semibold">
            {c.logoTitulo}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{c.logoTexto}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="flex h-20 w-32 items-center justify-center rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={srcLogo(profesor.config)} alt={c.logoActual} className="max-h-full max-w-full object-contain" />
            </span>
            <p className="text-sm text-slate-600">{profesor.config?.logo ? c.logoPersonalizado : c.logoOriginal}</p>
          </div>
          <div className="mt-4">
            <ElegirLogo
              maxBytes={MAX_BYTES_LOGO}
              textos={{ elegir: c.logoElegir, guardar: c.guardarLogo, nota: c.logoNota, grande: c.avisos.logoGrande }}
            />
          </div>
          {profesor.config?.logo && (
            <form action="/api/logo" method="post" className="mt-3">
              <input type="hidden" name="accion" value="restaurar" />
              <Boton type="submit" variante="secundario">
                {c.restaurarLogo}
              </Boton>
            </form>
          )}
          <Aviso seccion="logo" {...aviso} />
        </Tarjeta>

        <Tarjeta>
          <h2 id="rangos" className="scroll-mt-6 text-lg font-semibold">
            {c.rangosTitulo}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{c.rangosTexto}</p>
          <form action={guardarRangos} className="mt-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {[...NIVELES_REPORTE].reverse().map((n) => (
                <div key={n.clave} className="rounded-lg p-3 ring-1 ring-slate-200">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: n.color }} aria-hidden />
                    {c.niveles[n.clave]}
                  </p>
                  {n.clave === "bajo" ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {c.desde0}
                      <span className="mt-1 block text-xs text-slate-500">{formato(c.actual, { r: intervalo("bajo", r, t) })}</span>
                    </p>
                  ) : (
                    <label className="mt-2 block text-xs text-slate-500">
                      {c.desde}
                      <input
                        name={n.clave}
                        type="number"
                        min={1}
                        max={100}
                        required
                        defaultValue={r[n.clave]}
                        className={`${campo} mt-1 w-24`}
                      />
                      <span className="mt-1 block">{formato(c.actual, { r: intervalo(n.clave, r, t) })}</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Boton type="submit">{c.guardarRangos}</Boton>
              <span className="text-xs text-slate-500">{c.rangosPredeterminados}</span>
            </div>
          </form>
          <Aviso seccion="rangos" {...aviso} />
        </Tarjeta>

        <Tarjeta>
          <h2 id="precision" className="scroll-mt-6 text-lg font-semibold">
            {c.precisionTitulo}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{c.precisionTexto}</p>
          <form action={guardarPrecision} className="mt-4">
            <ConfigPrecision motor={conf.motor} esfuerzos={conf.esfuerzos} />
            <p className="mt-3 text-xs text-slate-500">{formato(c.consumoNota, valoresEscala(locale))}</p>
            <Boton type="submit" className="mt-4">
              {c.guardarPrecision}
            </Boton>
          </form>
          <Aviso seccion="precision" {...aviso} />
        </Tarjeta>
        <Tarjeta>
          <h2 id="conservacion" className="scroll-mt-6 text-lg font-semibold">
            {c.conservacionTitulo}
          </h2>
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <p>{formato(c.conservacionFotos, { n: DIAS_FOTOS })}</p>
            <p>
              {antesAnio}
              <strong className="font-semibold text-slate-800">{c.unAnio}</strong>
              {despuesAnio}
            </p>
            <p className="rounded-lg bg-aviso-suave px-3 py-2 text-slate-800">{c.conservacionAviso}</p>
          </div>
          {conservacion.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{c.sinActividades}</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3 font-medium">{c.colActividad}</th>
                    <th className="py-2 pr-3 font-medium">{c.colCurso}</th>
                    <th className="py-2 pr-3 font-medium">{c.colBorrado}</th>
                    <th className="py-2 text-right font-medium">{c.colDescargar}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conservacion.map((x) => (
                    <tr key={x.actividad.id}>
                      <td className="py-2 pr-3 font-medium">{x.actividad.titulo}</td>
                      <td className="py-2 pr-3 text-slate-600">{x.grupo ? `${x.grupo.materia} · ${x.grupo.nombre}` : "—"}</td>
                      <td className={`py-2 pr-3 ${x.dias <= DIAS_AVISO ? "font-medium text-error" : "text-slate-600"}`}>
                        {fechaLarga(x.borrado.toISOString().slice(0, 10), locale)}
                        {x.dias <= DIAS_AVISO && formato(c.enDias, { n: Math.max(0, x.dias) })}
                      </td>
                      <td className="py-2 text-right">
                        {x.evaluadas > 0 ? (
                          <a href={`/api/pdf/${x.actividad.id}/grupo`} className="text-xs font-medium text-tinta-700 hover:underline">
                            {formato(c.pdfGrupo, { n: x.evaluadas })}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">{c.sinReportes}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>
    </>
  );
}

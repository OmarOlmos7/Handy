import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BotonLink, Logo } from "@/components/ui";
import { SelectorIdioma } from "@/components/selector-idioma";
import { ESCALA, INFO_MOTOR, PUNTO_PREDETERMINADO } from "@/lib/configuracion";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import { divisaActual, textos } from "@/lib/i18n/servidor";
import { type Divisa, formatoPorPagina, formatoPrecio, textoDivisa } from "@/lib/divisas";
import { PLANES, ahorroContra, planDe, type Plan } from "@/lib/planes";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await textos();
  const divisa = textoDivisa(await divisaActual(), locale, t.comun.ivaIncluido);
  return { title: t.precios.metaTitulo, description: formato(t.precios.metaDescripcion, { divisa }) };
}

function Paloma({ claro }: { claro?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`mt-0.5 h-4 w-4 shrink-0 ${claro ? "text-tinta-200" : "text-tinta-600"}`} fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Botón de contacto del plan Escuela: el correo se configura en el servidor (CONTACTO_CORREO). */
async function BotonContacto({ texto, clase, t }: { texto: string; clase: string; t: Diccionario }) {
  await connection();
  const correo = process.env.CONTACTO_CORREO;
  if (!correo) {
    return (
      <Link href="/registro" className={clase}>
        {texto}
      </Link>
    );
  }
  return (
    <a href={`mailto:${correo}?subject=${encodeURIComponent(t.precios.asuntoEscuela)}`} className={clase}>
      {texto}
    </a>
  );
}

function TarjetaPlan({ plan, t, locale, divisa }: { plan: Plan; t: Diccionario; locale: string; divisa: Divisa }) {
  const texto = t.planes[plan.id];
  const porPagina = plan.precio ? formatoPorPagina(plan.precio, plan.creditos, divisa, locale) : undefined;
  const ahorro = ahorroContra(plan, planDe("basico"));
  const d = plan.destacado;
  const claseBoton = `mt-4 flex min-h-17 w-full items-center justify-center rounded-lg px-4 py-2 text-center text-sm font-medium leading-tight transition ${
    d ? "bg-white text-tinta-700 hover:bg-tinta-50" : "bg-slate-900 text-white hover:bg-slate-700"
  }`;
  return (
    <section
      className={`relative flex flex-col rounded-2xl p-6 ring-1 ${d ? "bg-tinta-600 text-white shadow-xl ring-tinta-600" : "bg-white shadow-sm ring-slate-200"}`}
      aria-labelledby={`plan-${plan.id}`}
    >
      {d && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-0.5 text-xs font-medium text-tinta-700 shadow-sm ring-1 ring-tinta-200">
          {t.precios.masPopular}
        </span>
      )}
      <h2 id={`plan-${plan.id}`} className="text-center text-xl font-semibold">
        {texto.nombre}
      </h2>

      {/* Precio y detalle con la misma altura en todos los planes: títulos, precios y botones alineados. */}
      <div className="mt-6 flex h-11 items-end justify-center gap-1.5 text-center">
        {plan.precio === undefined ? (
          <span className="text-3xl font-semibold tracking-tight">{t.precios.aLaMedida}</span>
        ) : (
          <>
            <span className="text-4xl font-semibold tracking-tight">{formatoPrecio(plan.precio, divisa, locale)}</span>
          </>
        )}
      </div>
      <p className={`mt-1 min-h-15 text-center text-sm ${d ? "text-tinta-100" : "text-slate-500"}`}>{texto.periodo}</p>
      <p className={`mt-1 min-h-8 text-center text-xs font-medium ${d ? "text-white" : "text-tinta-700"}`}>
        {porPagina !== undefined && formato(t.precios.porPagina, { p: porPagina })}
        {ahorro !== undefined && ` · ${formato(t.precios.ahorra, { n: ahorro })}`}
      </p>

      {plan.boton.href ? (
        <Link href={plan.boton.href} className={claseBoton}>
          {texto.boton}
        </Link>
      ) : (
        <Suspense fallback={<span className={claseBoton}>{texto.boton}</span>}>
          <BotonContacto texto={texto.boton} clase={claseBoton} t={t} />
        </Suspense>
      )}

      <div className={`mt-6 border-t pt-5 ${d ? "border-white/20" : "border-slate-100"}`}>
        <p className={`text-sm font-medium ${d ? "text-white" : "text-slate-800"}`}>{texto.incluye}</p>
        <ul className="mt-3 space-y-2.5 text-sm">
          {texto.ventajas.map((v) => (
            <li key={v} className={`flex gap-2.5 ${d ? "text-white" : "text-slate-600"}`}>
              <Paloma claro={d} />
              {v}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Página pública de planes y precios (se abre en otra pestaña desde la de ingreso). */
export default async function Precios() {
  const { idioma, t, locale } = await textos();
  const pr = t.precios;
  const divisa = await divisaActual();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f6f7f9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/">
            <Logo grande />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <SelectorIdioma actual={idioma} etiqueta={t.comun.idioma} />
            <BotonLink href="/ingresar" variante="fantasma">
              {t.comun.ingresar}
            </BotonLink>
            <BotonLink href="/registro" className="hidden sm:inline-flex">
              {t.comun.probarGratis}
            </BotonLink>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{pr.titulo}</h1>
          <p className="mt-3 text-slate-600">{formato(pr.texto, { divisa: textoDivisa(divisa, locale, t.comun.ivaIncluido) })}</p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PLANES.map((p) => (
            <TarjetaPlan key={p.id} plan={p} t={t} locale={locale} divisa={divisa} />
          ))}
        </div>

        <section className="mt-16" aria-labelledby="precision">
          <h2 id="precision" className="text-2xl font-semibold tracking-tight">
            {pr.precisionTitulo}
          </h2>
          <p className="mt-2 max-w-3xl text-slate-600">{pr.precisionTexto}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {ESCALA.map((e, k) => {
              const info = t.escala[e.punto];
              const consumo = k + 1;
              return (
                <div key={e.punto} className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <h3 className="font-semibold">{info.nombre}</h3>
                  <p className="mt-1 text-xs font-medium text-tinta-700">
                    {formato(t.configuracion.motorEsfuerzo, {
                      m: INFO_MOTOR[e.precision.motor].nombreModelo,
                      e: t.esfuerzos[e.precision.esfuerzo].toLocaleLowerCase(locale),
                    })}
                  </p>
                  <p className="mt-2 flex-1 text-sm text-slate-600">{info.descripcion}</p>
                  <p className="mt-3 text-xs text-slate-500">{formato(t.configuracion.tokensPagina, { n: e.tokens.toLocaleString(locale) })}</p>
                  <p className="text-xs font-medium text-slate-700">
                    {e.creditos === 1 ? t.configuracion.creditoPagina : formato(t.configuracion.creditosPagina, { n: e.creditos })}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    {pr.consumo}
                    <span className="flex gap-1" aria-label={formato(pr.consumoDe, { n: consumo })}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={`h-1.5 w-4 rounded-full ${i <= consumo ? "bg-tinta-500" : "bg-slate-200"}`} />
                      ))}
                    </span>
                  </div>
                  {k === PUNTO_PREDETERMINADO && <span className="mt-2 text-xs font-medium text-tinta-700">{pr.predeterminado}</span>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16" aria-labelledby="preguntas">
          <h2 id="preguntas" className="text-2xl font-semibold tracking-tight">
            {pr.preguntasTitulo}
          </h2>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            {pr.preguntas.map(([p, r]) => (
              <div key={p} className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
                <dt className="font-medium">{p}</dt>
                <dd className="mt-1 text-sm text-slate-600">{r}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}

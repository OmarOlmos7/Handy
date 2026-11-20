import Link from "next/link";
import { EjemploEntregable, type TipoEntregable } from "@/components/ejemplo-entregable";
import { EjemploReactivo, type TipoEjemplo } from "@/components/ejemplo-reactivo";
import { BotonLink, Logo } from "@/components/ui";
import { SelectorIdioma } from "@/components/selector-idioma";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { textos } from "@/lib/i18n/servidor";

const IMAGENES_PASOS = ["/inicio/paso-1-hoja.webp", "/inicio/paso-2-celular.webp", "/inicio/paso-3-rubrica.webp", "/inicio/paso-4-revision.webp"];

const ENTREGABLES: TipoEntregable[] = ["hoja", "alumno", "grupo", "excel"];

const reactivos: { ejemplo: TipoEjemplo; proximamente?: boolean }[] = [
  { ejemplo: "vf" },
  { ejemplo: "opcion" },
  { ejemplo: "alveolos" },
  { ejemplo: "columnas" },
  { ejemplo: "parentesis" },
  { ejemplo: "desarrollo" },
  { ejemplo: "algoritmo" },
  { ejemplo: "ensayo" },
  { ejemplo: "dibujo" },
  { ejemplo: "audio", proximamente: true },
];

function HojaDemo({ t }: { t: Diccionario["demo"] }) {
  return (
    <div className="relative mx-auto w-full max-w-sm rotate-1 rounded-lg bg-papel p-6 shadow-xl ring-1 ring-slate-200">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">{t.materia}</p>
          <p className="text-sm font-semibold text-slate-800">{t.titulo}</p>
        </div>
        <div className="grid h-10 w-10 grid-cols-4 gap-px bg-white p-0.5 ring-1 ring-slate-300" aria-hidden>
          {[1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1].map((n, i) => (
            <span key={i} className={n ? "bg-slate-800" : "bg-white"} />
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-700">
        {t.nombre} <span className="font-mano text-xl text-slate-700">Sofía Hernández</span>
      </p>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-700">
            {t.r1} <span className="font-mano text-xl text-slate-600">{t.v}</span>
          </span>
          <span className="text-xl font-bold text-acierto">✓</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-700">
            {t.r2} <span className="font-mano text-xl text-slate-600">a) m/s</span>
          </span>
          <span className="text-xl font-bold text-error">✗</span>
        </div>
        <p className="font-mano -mt-2 text-lg leading-tight text-error">{t.c2}</p>
        <div className="rounded border border-dashed border-slate-300 p-2">
          <p className="text-slate-700">{t.r5}</p>
          <p className="font-mano text-xl leading-snug text-slate-600">v = d / t = 150 / 2</p>
          <p className="font-mano text-xl leading-snug text-slate-600">
            v = 75 <span className="text-error underline decoration-error decoration-wavy">  </span>
          </p>
          <p className="font-mano text-lg leading-tight text-error">{t.c5}</p>
        </div>
      </div>
      <div className="absolute -right-4 -top-4 rounded-full bg-tinta-600 px-3 py-1.5 text-sm font-semibold text-white shadow">
        8.4 / 10
      </div>
    </div>
  );
}

export default async function Inicio() {
  const { idioma, t } = await textos();
  const i = t.inicio;
  return (
    <div className="flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Logo grande />
          <nav className="hidden gap-6 text-sm text-slate-600 lg:flex">
            <a href="#como-funciona" className="hover:text-slate-900">{i.nav.comoFunciona}</a>
            <a href="#entregables" className="hover:text-slate-900">{i.nav.queRecibes}</a>
            <Link href="/precios" className="hover:text-slate-900">{i.nav.precios}</Link>
            <a href="#privacidad" className="hover:text-slate-900">{i.nav.privacidad}</a>
          </nav>
          <div className="flex flex-wrap items-center gap-2">
            <SelectorIdioma actual={idioma} etiqueta={t.comun.idioma} />
            <BotonLink href="/ingresar" variante="fantasma">{t.comun.ingresar}</BotonLink>
            <BotonLink href="/registro" className="hidden sm:inline-flex">{t.comun.probarGratis}</BotonLink>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-gradient-to-b from-tinta-50 to-[#f6f7f9]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
            <div>
              <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-medium text-tinta-700 ring-1 ring-tinta-200">
                {i.etiqueta}
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">{i.titulo}</h1>
              <p className="mt-5 text-lg text-slate-600">{i.texto}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <BotonLink href="/registro">{i.crearCuenta}</BotonLink>
                <BotonLink href="/alumno" variante="secundario">
                  {i.soyAlumno}
                </BotonLink>
              </div>
              <p className="mt-4 text-sm text-slate-500">{i.gratis}</p>
            </div>
            <HojaDemo t={t.demo} />
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">{i.comoFunciona}</h2>
          <p className="mt-2 max-w-2xl text-slate-600">{i.comoFuncionaTexto}</p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {i.pasos.map((p, n) => (
              <li key={n} className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <div className="flex h-56 items-center justify-center border-b border-slate-100 bg-slate-50 p-3">
                  <a href={IMAGENES_PASOS[n]} target="_blank" className="flex h-full w-full items-center justify-center" title={i.verImagen}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={IMAGENES_PASOS[n]} alt={p.alt} loading="lazy" className="max-h-full w-auto max-w-full rounded-md object-contain shadow-sm" />
                  </a>
                </div>
                <div className="p-5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tinta-600 text-sm font-semibold text-white">
                    {n + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{p.titulo}</h3>
                  <p className="mt-2 text-sm text-slate-600">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-slate-500">{i.notaImagenes}</p>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-3xl font-semibold tracking-tight">{i.reactivosTitulo}</h2>
            <p className="mt-2 max-w-2xl text-slate-600">{i.reactivosTexto}</p>
            <div className="mt-8 overflow-x-auto rounded-xl ring-1 ring-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-2/5 px-4 py-3 font-medium">{i.colTipo}</th>
                    <th className="px-4 py-3 font-medium">{i.colEjemplo}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reactivos.map((r) => (
                    <tr key={r.ejemplo} className="align-middle">
                      <td className="px-4 py-4 font-medium text-slate-800">
                        {i.tipos[r.ejemplo]}
                        {r.proximamente && (
                          <span className="ml-2 rounded-full bg-aviso-suave px-2 py-0.5 text-xs font-medium text-aviso">{i.proximamente}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <EjemploReactivo tipo={r.ejemplo} t={t.ejemplos} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">{i.notaEjemplos}</p>
          </div>
        </section>

        <section id="entregables" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">{i.entregablesTitulo}</h2>
          <p className="mt-2 text-slate-600">{i.notaEjemplos}</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {ENTREGABLES.map((e) => (
              <div key={e} className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h3 className="font-semibold">{i.entregables[e][0]}</h3>
                <p className="mt-2 text-sm text-slate-600">{i.entregables[e][1]}</p>
                <EjemploEntregable tipo={e} t={t.entregable} />
              </div>
            ))}
          </div>
        </section>

        <section id="privacidad" className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">{i.privacidadTitulo}</h2>
          <ul className="mt-6 grid gap-4 text-sm text-slate-700 md:grid-cols-3">
            {i.privacidad.map((texto) => (
              <li key={texto} className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
                {texto}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex flex-wrap items-center gap-4">
            <Link href="#privacidad">{i.avisoPrivacidad}</Link>
            <Link href="/precios">{t.comun.precios}</Link>
            <Link href="/ingresar">{t.comun.ingresar}</Link>
            <SelectorIdioma actual={idioma} etiqueta={t.comun.idioma} />
          </div>
        </div>
        <p className="mx-auto max-w-6xl px-4 pb-6 text-xs text-slate-400">
          <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
            {t.comun.ubicacionIp}
          </a>
        </p>
      </footer>
    </div>
  );
}

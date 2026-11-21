import Link from "next/link";
import { connection } from "next/server";
import { BotonLink, Logo } from "@/components/ui";
import { SelectorIdioma } from "@/components/selector-idioma";
import { VERSION_LEGAL } from "@/lib/legal/aceptacion";
import { datosResponsable, textosLegales } from "@/lib/legal/documentos";
import type { CondicionPais, DocumentoLegal } from "@/lib/legal/tipos";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";

export type ClaveDocumento = "aviso" | "politica" | "terminos";

export const RUTA_DOCUMENTO: Record<ClaveDocumento, string> = {
  aviso: "/aviso-de-privacidad",
  politica: "/politica-de-datos",
  terminos: "/terminos",
};

/** Textos legales en el idioma de la petición, con el correo y domicilio configurados en el servidor. */
export async function cargarTextosLegales() {
  await connection();
  const { idioma, t, locale } = await textos();
  return { idioma, t, locale, legal: textosLegales(idioma, datosResponsable(process.env)) };
}

function Paises({ titulo, intro, lista }: { titulo: string; intro: string; lista: CondicionPais[] }) {
  return (
    <section id="paises" className="scroll-mt-6">
      <h2 className="text-xl font-semibold tracking-tight">{titulo}</h2>
      <p className="mt-2 text-slate-700">{intro}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {lista.map((p) => (
          <article key={p.id} id={`pais-${p.id}`} className="scroll-mt-6 rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h3 className="font-semibold text-slate-900">{p.pais}</h3>
            <p className="mt-1 text-xs text-slate-500">{p.leyes}</p>
            <p className="mt-1 text-xs text-slate-500">{p.autoridad}</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {p.puntos.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Página de un documento legal: aviso de borrador, índice, secciones y enlaces a los otros documentos. */
export async function PaginaLegal({ clave }: { clave: ClaveDocumento }) {
  const { idioma, t, locale, legal } = await cargarTextosLegales();
  const tl = t.legal;
  const doc: DocumentoLegal = legal[clave];
  const conPaises = clave === "politica";
  const fecha = new Date(`${VERSION_LEGAL}T12:00:00Z`).toLocaleDateString(locale, { dateStyle: "long", timeZone: "UTC" });
  const nombres: Record<ClaveDocumento, string> = { aviso: tl.avisoPrivacidad, politica: tl.politicaDatos, terminos: tl.terminos };
  const indice = [...doc.secciones.map((s) => ({ id: s.id, titulo: s.titulo })), ...(conPaises ? [{ id: "paises", titulo: legal.paises.titulo }] : [])];
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
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:py-14">
        <p role="note" className="rounded-lg bg-aviso-suave p-3 text-sm font-medium text-aviso">
          {tl.borrador}
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{doc.titulo}</h1>
        <p className="mt-3 text-slate-600">{doc.resumen}</p>
        <p className="mt-2 text-sm text-slate-500">
          {formato(tl.vigencia, { fecha })} · {formato(tl.responsable, { razon: legal.razon })}
        </p>

        <nav aria-label={tl.indice} className="mt-8 rounded-xl bg-white p-5 ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-slate-700">{tl.indice}</p>
          <ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {indice.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-tinta-700 hover:underline">
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {doc.secciones.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-6">
              <h2 className="text-xl font-semibold tracking-tight">{s.titulo}</h2>
              {s.parrafos.map((p) => (
                <p key={p} className="mt-3 leading-relaxed text-slate-700">
                  {p}
                </p>
              ))}
              {s.lista && (
                <ul className="mt-3 list-disc space-y-2 pl-6 leading-relaxed text-slate-700">
                  {s.lista.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          {conPaises && <Paises {...legal.paises} />}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>{legal.razon}</span>
          <nav aria-label={tl.otrosDocumentos} className="flex flex-wrap items-center gap-4">
            {(Object.keys(RUTA_DOCUMENTO) as ClaveDocumento[]).map((k) => (
              <Link key={k} href={RUTA_DOCUMENTO[k]} aria-current={k === clave ? "page" : undefined} className={k === clave ? "font-medium text-slate-800" : "hover:underline"}>
                {nombres[k]}
              </Link>
            ))}
            <Link href="/" className="hover:underline">
              {tl.volverInicio}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

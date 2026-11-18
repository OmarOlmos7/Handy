"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Idioma } from "@/lib/i18n/idiomas";
import { SelectorIdioma } from "./selector-idioma";
import { Logo } from "./ui";

export function BarraApp({
  enlaces,
  usuario,
  extra,
  configuracion,
  idioma,
  textoConfiguracion = "Configuración",
}: {
  enlaces: { href: string; texto: string; exacto?: boolean }[];
  usuario: { nombre: string; rol: string };
  extra?: React.ReactNode;
  /** Ruta de la configuración; muestra un engrane a la izquierda del nombre. */
  configuracion?: string;
  /** Selector de idioma (idioma actual y etiqueta). */
  idioma?: { actual: Idioma; etiqueta: string };
  textoConfiguracion?: string;
}) {
  const ruta = usePathname();
  return (
    <header className="no-imprimir border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/">
          <Logo grande />
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
          {enlaces.map((e) => {
            const activo = e.exacto ? ruta === e.href : ruta.startsWith(e.href);
            return (
              <Link
                key={e.href}
                href={e.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 ${activo ? "bg-tinta-50 font-medium text-tinta-700" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {e.texto}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {idioma && <SelectorIdioma actual={idioma.actual} etiqueta={idioma.etiqueta} />}
          {extra}
          <div className="flex items-center gap-2">
            {configuracion && (
              <Link
                href={configuracion}
                title={textoConfiguracion}
                aria-label={textoConfiguracion}
                aria-current={ruta.startsWith(configuracion) ? "page" : undefined}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  ruta.startsWith(configuracion) ? "bg-tinta-50 text-tinta-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                </svg>
              </Link>
            )}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tinta-100 text-xs font-semibold text-tinta-700">
              {usuario.nombre
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0])
                .join("")}
            </span>
            <span className="hidden text-sm leading-tight md:block">
              <span className="block font-medium">{usuario.nombre}</span>
              <span className="block text-xs text-slate-500">{usuario.rol}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

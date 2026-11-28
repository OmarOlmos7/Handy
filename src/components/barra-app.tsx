"use client";

// Marco de las vistas de trabajo (profesor, alumno y administración) a pantalla completa:
// encabezado fijo arriba con el logo al extremo izquierdo, franja izquierda fija con las secciones
// y las herramientas de la página, y al centro el contenido, que es lo único que se desplaza.
// En el teléfono la franja se abre como cajón con el botón de menú.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Idioma } from "@/lib/i18n/idiomas";
import { FechaClima } from "./fecha-clima";
import { DestinoLateral } from "./franja-lateral";
import { useTextos } from "./proveedor-textos";
import { SelectorIdioma } from "./selector-idioma";

export type IconoMenu =
  | "panel"
  | "calendario"
  | "avisos"
  | "nueva"
  | "curso"
  | "asignaturas"
  | "creditos"
  | "admin"
  | "actividades"
  | "profesor";

export interface EnlaceMenu {
  href: string;
  texto: string;
  exacto?: boolean;
  /** Lo pinta como botón azul. */
  destacado?: boolean;
  icono?: IconoMenu;
}

const trazo = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "h-[18px] w-[18px] shrink-0",
};

function Icono({ nombre }: { nombre: IconoMenu }) {
  switch (nombre) {
    case "panel":
      return (
        <svg {...trazo}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "calendario":
      return (
        <svg {...trazo}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "avisos":
      return (
        <svg {...trazo}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
        </svg>
      );
    case "nueva":
      return (
        <svg {...trazo}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5M12 11v6M9 14h6" />
        </svg>
      );
    case "curso":
      return (
        <svg {...trazo}>
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          <path d="M12 10v6M9 13h6" />
        </svg>
      );
    case "asignaturas":
      return (
        <svg {...trazo}>
          <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" />
          <path d="M4 21a2 2 0 0 1 2-2h13M9 7h6" />
        </svg>
      );
    case "creditos":
      return (
        <svg {...trazo}>
          <circle cx="12" cy="12" r="9" />
          <path d="M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2.1-.6-2.5-1.5M12 6.5v1.5M12 16v1.5" />
        </svg>
      );
    case "admin":
      return (
        <svg {...trazo}>
          <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "actividades":
      return (
        <svg {...trazo}>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" />
        </svg>
      );
    case "profesor":
      return (
        <svg {...trazo}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
        </svg>
      );
  }
}

// Franja izquierda plegada o no en la computadora; se recuerda en este navegador.
const CLAVE_PLEGADA = "marco-franja-plegada";
const avisosPlegada = new Set<() => void>();
function suscribirPlegada(aviso: () => void) {
  avisosPlegada.add(aviso);
  return () => avisosPlegada.delete(aviso);
}
function leerPlegada() {
  try {
    return localStorage.getItem(CLAVE_PLEGADA) === "1";
  } catch {
    return false;
  }
}
function guardarPlegada(valor: boolean) {
  try {
    localStorage.setItem(CLAVE_PLEGADA, valor ? "1" : "0");
  } catch {
    // Sin almacenamiento (modo privado): solo dura mientras la página siga abierta.
  }
  avisosPlegada.forEach((a) => a());
}

function Menu({ enlaces, ruta, titulo }: { enlaces: EnlaceMenu[]; ruta: string; titulo: string }) {
  return (
    <nav aria-label={titulo} className="space-y-0.5">
      {enlaces.map((e) => {
        const activo = e.exacto ? ruta === e.href : ruta === e.href || ruta.startsWith(`${e.href}/`);
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={activo ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              e.destacado
                ? `bg-tinta-600 font-medium text-white shadow-sm hover:bg-tinta-700 ${activo ? "ring-2 ring-tinta-300" : ""}`
                : activo
                  ? "bg-tinta-50 font-medium text-tinta-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {e.icono && <Icono nombre={e.icono} />}
            <span className="min-w-0 flex-1 truncate">{e.texto}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function BarraApp({
  enlaces,
  usuario,
  extra,
  configuracion,
  idioma,
  textoConfiguracion = "Configuración",
  logo,
  children,
}: {
  /** Secciones de la franja izquierda. */
  enlaces: EnlaceMenu[];
  /** Nombre, tipo de perfil (va debajo del nombre) y un dato extra, como el correo. */
  usuario: { nombre: string; rol: string; tipo?: string };
  extra?: React.ReactNode;
  /** Ruta de la configuración; muestra un engrane a la izquierda del nombre. */
  configuracion?: string;
  /** Selector de idioma (idioma actual y etiqueta). */
  idioma?: { actual: Idioma; etiqueta: string };
  textoConfiguracion?: string;
  /** Imagen del logo; sin ella, la de iEureka-Grader. */
  logo?: string;
  children: React.ReactNode;
}) {
  const ruta = usePathname();
  const { t } = useTextos();
  const tm = t.marco.menu;
  // El cajón del teléfono se cierra solo al cambiar de página: guarda en qué ruta se abrió.
  const [cajonEn, setCajonEn] = useState<string | null>(null);
  const cajon = cajonEn === ruta;
  const plegada = useSyncExternalStore(suscribirPlegada, leerPlegada, () => false);
  // Donde las páginas ponen sus herramientas (<Lateral>): el cajón si está abierto, si no la franja.
  const [nodoFranja, setNodoFranja] = useState<HTMLElement | null>(null);
  const [nodoCajon, setNodoCajon] = useState<HTMLElement | null>(null);
  const destino = (cajon ? nodoCajon : null) ?? (plegada ? null : nodoFranja);

  // Como el que se desplaza es el centro (no la ventana), al cambiar de página se regresa arriba.
  const centro = useRef<HTMLElement>(null);
  const rutaAnterior = useRef(ruta);
  useEffect(() => {
    if (rutaAnterior.current === ruta) return;
    rutaAnterior.current = ruta;
    if (!window.location.hash) centro.current?.scrollTo(0, 0);
  }, [ruta]);

  function alternar() {
    // En la computadora pliega o despliega la franja; en el teléfono abre o cierra el cajón.
    if (window.matchMedia("(min-width: 1024px)").matches) guardarPlegada(!plegada);
    else setCajonEn(cajon ? null : ruta);
  }

  const iniciales = usuario.nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  return (
    <DestinoLateral.Provider value={destino}>
    <div className="flex h-dvh flex-col overflow-hidden print:block print:h-auto print:overflow-visible">
      {/* Encabezado fijo: logo al extremo izquierdo; fecha, clima y cuenta a la derecha. */}
      <header className="no-imprimir z-30 flex flex-none items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 sm:px-4">
        <div className={`flex min-w-0 items-center gap-2 ${plegada ? "" : "lg:w-[15.5rem]"}`}>
          <Link href="/" className="flex min-w-0 items-center gap-2.5 font-bold tracking-tight text-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo ?? "/logo.png"} alt="" width={330} height={382} className="h-11 w-auto max-w-[4.5rem] object-contain sm:h-14 sm:max-w-[6rem]" />
            <span className="flex flex-col text-[17px] leading-[19px] sm:text-[21px] sm:leading-[23px]">
              <span>iEureka</span>
              <span>Grader</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={alternar}
            aria-label={tm.abrir}
            title={plegada ? tm.desplegar : tm.plegar}
            aria-expanded={cajon}
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <FechaClima />
          </div>
          {idioma && <SelectorIdioma actual={idioma.actual} etiqueta={idioma.etiqueta} />}
          <div className="hidden items-center gap-2 sm:flex">{extra}</div>
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
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tinta-100 text-xs font-semibold text-tinta-700">{iniciales}</span>
          <span className="hidden max-w-[14rem] text-sm leading-tight md:block">
            <span className="block truncate font-medium">{usuario.nombre}</span>
            {usuario.tipo && <span className="block text-xs font-medium text-tinta-700">{usuario.tipo}</span>}
            <span className="block truncate text-xs text-slate-500">{usuario.rol}</span>
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 print:block">
        {/* Franja izquierda fija (computadora). */}
        {!plegada && (
          <aside className="no-imprimir hidden w-64 flex-none overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 lg:block">
            <Menu enlaces={enlaces} ruta={ruta} titulo={tm.secciones} />
            <div ref={setNodoFranja} className="mt-4 border-t border-slate-200 pt-4 empty:hidden" />
          </aside>
        )}

        {/* Contenido central: lo único que se desplaza. */}
        <main ref={centro} id="contenido" className="min-w-0 flex-1 overflow-y-auto print:overflow-visible">
          <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>

      {/* Cajón del teléfono y la tableta. */}
      {cajon && (
        <div className="no-imprimir fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={tm.secciones}>
          <button type="button" aria-label={tm.cerrar} className="absolute inset-0 bg-slate-900/40" onClick={() => setCajonEn(null)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto bg-white px-3 py-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <FechaClima />
              <button
                type="button"
                onClick={() => setCajonEn(null)}
                aria-label={tm.cerrar}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2 px-1 sm:hidden">{extra}</div>
            <Menu enlaces={enlaces} ruta={ruta} titulo={tm.secciones} />
            <div ref={setNodoCajon} className="mt-4 border-t border-slate-200 pt-4 empty:hidden" />
          </div>
        </div>
      )}
    </div>
    </DestinoLateral.Provider>
  );
}

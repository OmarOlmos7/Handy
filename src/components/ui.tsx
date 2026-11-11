import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { EstadoActividad, EstadoEntrega } from "@/lib/tipos";
import type { Nivel } from "@/lib/estadisticas";

type Variante = "primario" | "secundario" | "fantasma";

const estilosBoton: Record<Variante, string> = {
  primario: "bg-tinta-600 text-white hover:bg-tinta-700 shadow-sm",
  secundario: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50",
  fantasma: "text-tinta-700 hover:bg-tinta-50",
};

const baseBoton =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta-500 disabled:opacity-50";

export function BotonLink({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={`${baseBoton} ${estilosBoton[variante]} ${className}`} {...props} />;
}

export function Boton({
  variante = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante }) {
  return <button className={`${baseBoton} ${estilosBoton[variante]} ${className}`} {...props} />;
}

export function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 ${className}`}>
      {children}
    </section>
  );
}

type Tono = "gris" | "azul" | "verde" | "rojo" | "ambar";
const tonos: Record<Tono, string> = {
  gris: "bg-slate-100 text-slate-700",
  azul: "bg-tinta-50 text-tinta-700",
  verde: "bg-acierto-suave text-acierto",
  rojo: "bg-error-suave text-error",
  ambar: "bg-aviso-suave text-aviso",
};

export function Insignia({ tono = "gris", children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tonos[tono]}`}>
      {children}
    </span>
  );
}

const textoEstadoActividad: Record<EstadoActividad, [string, Tono]> = {
  esperando_entregas: ["Esperando entregas", "gris"],
  rubrica_pendiente: ["Rúbrica pendiente", "ambar"],
  evaluando: ["Por evaluar", "azul"],
  en_revision: ["Lista para revisar", "ambar"],
  publicada: ["Publicada", "verde"],
};

export function InsigniaActividad({ estado }: { estado: EstadoActividad }) {
  const [texto, tono] = textoEstadoActividad[estado];
  return <Insignia tono={tono}>{texto}</Insignia>;
}

const textoEstadoEntrega: Record<EstadoEntrega, [string, Tono]> = {
  sin_entregar: ["Sin entregar", "rojo"],
  entregada: ["Entregada", "gris"],
  evaluada: ["Evaluada por IA", "azul"],
  aprobada: ["Aprobada", "verde"],
};

export function InsigniaEntrega({ estado }: { estado: EstadoEntrega }) {
  const [texto, tono] = textoEstadoEntrega[estado];
  return <Insignia tono={tono}>{texto}</Insignia>;
}

const textoNivel: Record<Nivel, [string, Tono]> = {
  alto: ["Alto", "verde"],
  medio: ["Medio", "ambar"],
  bajo: ["Bajo", "rojo"],
};

export function InsigniaNivel({ nivel }: { nivel: Nivel }) {
  const [texto, tono] = textoNivel[nivel];
  return <Insignia tono={tono}>{texto}</Insignia>;
}

export function colorCalificacion(cal: number) {
  if (cal >= 8.5) return "text-acierto";
  if (cal >= 7) return "text-aviso";
  return "text-error";
}

/** Barra horizontal de porcentaje (0 a 100). */
export function Barra({ valor, tono }: { valor: number; tono?: "auto" | "azul" }) {
  const color =
    tono === "azul"
      ? "bg-tinta-500"
      : valor >= 85
        ? "bg-acierto"
        : valor >= 70
          ? "bg-amber-500"
          : "bg-error";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="presentation">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, valor)}%` }} />
    </div>
  );
}

export function Encabezado({
  titulo,
  subtitulo,
  migas,
  acciones,
}: {
  titulo: string;
  subtitulo?: ReactNode;
  migas?: { texto: string; href: string }[];
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {migas && (
          <nav className="mb-1 flex flex-wrap gap-1 text-sm text-slate-500" aria-label="Ruta">
            {migas.map((m, i) => (
              <span key={m.href}>
                <Link href={m.href} className="hover:text-tinta-700">
                  {m.texto}
                </Link>
                {i < migas.length - 1 && <span className="mx-1">/</span>}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-slate-600">{subtitulo}</p>}
      </div>
      {acciones && <div className="no-imprimir flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

export function Logo({ claro = false, grande = false }: { claro?: boolean; grande?: boolean }) {
  const color = claro ? "text-white" : "text-slate-900";
  if (grande) {
    // Versión grande: logo y nombre en dos líneas que miden juntas el 60 % del alto del logo.
    return (
      <span className={`flex items-center gap-3 font-bold tracking-tight md:gap-5 ${color}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" width={330} height={382} className="h-24 w-auto md:h-40" />
        <span className="flex flex-col text-[26px] leading-[29px] md:text-[43px] md:leading-[48px]">
          <span>iEureka</span>
          <span>Grader</span>
        </span>
      </span>
    );
  }
  return (
    <span className={`flex items-center gap-2 font-semibold ${color}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width={36} height={42} className="h-10 w-auto" />
      iEureka-Grader
    </span>
  );
}

export function fechaLarga(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[m - 1]} ${a}`;
}

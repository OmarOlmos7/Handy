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

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span className={`flex items-center gap-2 font-semibold ${claro ? "text-white" : "text-slate-900"}`}>
      <svg viewBox="0 0 36 36" className="h-9 w-9" aria-hidden>
        {/* Hoja con paloma y tache, y un foco encendido encima */}
        <rect x="3" y="9.5" width="20" height="24.5" rx="3" fill="#fff" stroke="#2554e8" strokeWidth="2" />
        <path d="M7.5 18.5l3 3 5.5-6.5" fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 25.5l5.5 5.5M13.5 25.5l-5.5 5.5" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M26 1.2v2.2M19.6 3.6l1.5 1.5M32.4 3.6l-1.5 1.5M34.6 10h-2.1" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
        <path
          d="M26 4.6a5.6 5.6 0 0 0-3.4 10.05c.7.55 1.1 1.2 1.1 1.95h4.6c0-.75.4-1.4 1.1-1.95A5.6 5.6 0 0 0 26 4.6z"
          fill="#facc15"
          stroke="#b45309"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M24.6 12.4l1.4-2 1.4 2" fill="none" stroke="#b45309" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="23.7" y="17.2" width="4.6" height="1.6" rx=".6" fill="#475569" />
        <rect x="24.3" y="19.2" width="3.4" height="1.4" rx=".6" fill="#475569" />
      </svg>
      Ieureka-Grader
    </span>
  );
}

export function fechaLarga(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[m - 1]} ${a}`;
}

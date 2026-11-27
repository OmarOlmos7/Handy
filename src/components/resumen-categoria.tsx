import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import type { ResumenAvance } from "@/lib/portal-alumno";

/** Resumen de una categoría plegable: total, terminadas, en proceso y sin iniciar. */
export function ResumenCategoria({ resumen: r, t }: { resumen: ResumenAvance; t: Diccionario }) {
  const tc = t.alumno.cursos;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
        {r.total === 1 ? tc.resumenCategoria1 : formato(tc.resumenCategoria, { n: r.total })}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-acierto-suave px-2 py-0.5 text-acierto"><Punto className="bg-acierto" /> {formato(tc.terminadas, { n: r.terminadas })}</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-aviso-suave px-2 py-0.5 text-aviso"><Punto className="bg-amber-400" /> {formato(tc.enProceso, { n: r.enProceso })}</span>
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-slate-500 ring-1 ring-slate-200"><Punto className="bg-white ring-1 ring-slate-400" /> {formato(tc.sinIniciar, { n: r.sinIniciar })}</span>
    </span>
  );
}

function Punto({ className }: { className: string }) {
  return <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${className}`} />;
}

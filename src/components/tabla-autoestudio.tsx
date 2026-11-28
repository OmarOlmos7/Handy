// Tabla de actividades autoasignadas de un alumno: la ve el alumno (con enlace a cada una) y el
// profesor desde el cuaderno de calificaciones.
import Link from "next/link";
import { duracion, resumenAutoestudio } from "@/lib/autoestudio";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import type { Autoactividad } from "@/lib/tipos";
import { colorCalificacion } from "./ui";

const ICONO = { practica: "📝", manuscrita: "✍️", videos: "🎬", lectura: "📖", tarjetas: "🃏" } as const;

function fecha(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
}

export function ResumenAutoestudioTexto({ lista, grupoId, matricula, t }: { lista: Autoactividad[]; grupoId: string; matricula: string; t: Diccionario }) {
  const r = resumenAutoestudio(lista, grupoId, matricula);
  return <>{formato(t.autoestudio.tabla.resumen, { n: r.completadas, p: r.promedio === null ? "—" : r.promedio, t: duracion(r.segundos) })}</>;
}

export function TablaAutoestudio({ lista, t, locale, enlaces, profesor }: { lista: Autoactividad[]; t: Diccionario; locale: string; enlaces?: boolean; profesor?: boolean }) {
  const ta = t.autoestudio;
  const tt = ta.tabla;
  if (lista.length === 0) return <p className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{profesor ? ta.profesor.vacio : tt.vacio}</p>;
  const ordenada = [...lista].sort((a, b) => (b.completadaEn ?? b.creadaEn).localeCompare(a.completadaEn ?? a.creadaEn));
  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2">{tt.actividad}</th>
            <th className="px-3 py-2">{tt.tipo}</th>
            <th className="px-3 py-2">{tt.fecha}</th>
            <th className="px-3 py-2 text-center">{tt.tiempo}</th>
            <th className="px-3 py-2 text-center">{tt.nota}</th>
            <th className="px-3 py-2">{tt.comentario}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ordenada.map((a) => (
            <tr key={a.id} className="align-top hover:bg-slate-50/70">
              <td className="px-4 py-2.5">
                {enlaces ? (
                  <Link href={`/alumno/autoestudio/${a.id}`} className="font-medium text-slate-900 hover:text-tinta-700">
                    {a.titulo}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-900">{a.titulo}</span>
                )}
                <span className="block text-xs text-slate-500">{a.tema}</span>
                <span className="mt-1 inline-block rounded-md bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-800">{formato(ta.asignadaPor, { quien: ta.quienEstudiante })}</span>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">
                {ICONO[a.tipo]} {ta.tipos[a.tipo]}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{fecha(a.completadaEn ?? a.creadaEn, locale)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-center tabular-nums text-slate-700">{a.segundos ? duracion(a.segundos) : "—"}</td>
              <td className="px-3 py-2.5 text-center">
                {a.estado === "completada" && a.calificacion !== undefined ? (
                  <span className={`text-base font-semibold tabular-nums ${colorCalificacion(a.calificacion, 100)}`}>{a.calificacion}</span>
                ) : enlaces ? (
                  <Link href={`/alumno/autoestudio/${a.id}`} className="rounded-lg bg-tinta-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-tinta-700">
                    {tt.continuar}
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500">{a.estado === "evaluando" ? tt.evaluando : tt.pendiente}</span>
                )}
              </td>
              <td className="max-w-64 px-3 py-2.5 text-slate-700">
                {a.animo && <span className="mr-1 text-lg">{a.animo}</span>}
                {a.sentir}
                {profesor && a.alerta && (
                  <span title={ta.profesor.alertaAyuda} className="mt-1 block rounded-md bg-error-suave px-1.5 py-0.5 text-xs font-semibold text-error">
                    ⚠ {ta.profesor.alerta}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

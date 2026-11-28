"use client";

// Herramientas de un curso en la franja izquierda: vistas (Analíticas, Cuaderno, Rutas, Avance del
// temario y Lista de alumnos) y, tras un espacio, Nueva actividad, Proyecto y Duplicar actividad.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CursoDirectorio } from "@/lib/copiar";
import { DirectorioActividades } from "./copiar-elemento";
import { IconoAlumnos, IconoCuaderno, IconoGrafica, IconoMapa, IconoRuta } from "./iconos";
import { useTextos } from "./proveedor-textos";

export function HerramientasCurso({
  grupoId,
  nombre,
  proyectos,
  directorio,
}: {
  grupoId: string;
  /** Materia y grupo, por ejemplo "Física · 3° B". */
  nombre: string;
  proyectos: number;
  directorio: CursoDirectorio[];
}) {
  const ruta = usePathname();
  const { t } = useTextos();
  const tm = t.marco.curso;
  const tc = t.profesor.curso;
  const base = `/profesor/grupos/${grupoId}`;
  const vistas = [
    { href: `${base}/analiticas`, texto: tc.analiticas, icono: <IconoGrafica /> },
    { href: `${base}/cuaderno`, texto: tc.cuaderno, icono: <IconoCuaderno /> },
    { href: `${base}/rutas`, texto: t.ruta.profesor.boton, icono: <IconoRuta /> },
    { href: `${base}/avance`, texto: tc.avanceTemario, icono: <IconoMapa /> },
    { href: `${base}/alumnos`, texto: tm.alumnos, icono: <IconoAlumnos /> },
  ];
  const enCurso = ruta === base;
  return (
    <div className="space-y-4">
      <div>
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{tm.titulo}</p>
        <Link
          href={base}
          aria-current={enCurso ? "page" : undefined}
          className={`mt-1 block rounded-lg px-3 py-1.5 text-sm font-semibold leading-snug ${enCurso ? "bg-tinta-50 text-tinta-800" : "text-slate-900 hover:bg-slate-100"}`}
        >
          {nombre}
        </Link>
      </div>
      <nav aria-label={tm.vistas} className="space-y-1.5">
        {vistas.map((v) => {
          const activo = ruta === v.href || ruta.startsWith(`${v.href}/`);
          return (
            <Link
              key={v.href}
              href={v.href}
              aria-current={activo ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ring-1 transition ${
                activo ? "bg-tinta-50 text-tinta-800 ring-tinta-300" : "bg-white text-slate-800 ring-slate-300 hover:bg-slate-50"
              }`}
            >
              {v.icono}
              <span className="min-w-0 flex-1 leading-tight">{v.texto}</span>
            </Link>
          );
        })}
      </nav>
      {/* Espacio y luego lo que se crea en el curso: Nueva actividad, debajo Proyecto y Duplicar. */}
      <div className="space-y-1.5 border-t border-slate-200 pt-4">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{tm.crear}</p>
        <Link
          href={`/profesor/actividades/nueva?grupo=${grupoId}`}
          className="flex items-center justify-center gap-2 rounded-lg bg-tinta-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-tinta-700"
        >
          {tc.nuevaActividad}
        </Link>
        <Link
          href={`${base}/proyectos`}
          aria-current={ruta.startsWith(`${base}/proyectos`) ? "page" : undefined}
          className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          <span aria-hidden>🏆</span>
          <span className="flex-1">{t.proyecto.grupo.boton}</span>
          {proyectos > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{proyectos}</span>}
        </Link>
        <DirectorioActividades grupoId={grupoId} cursos={directorio} className="w-full !px-3" />
      </div>
    </div>
  );
}

/** Herramientas del curso del alumno en la franja izquierda (sus vistas del curso). */
export function HerramientasCursoAlumno({ grupoId, nombre }: { grupoId: string; nombre: string }) {
  const ruta = usePathname();
  const { t } = useTextos();
  const tm = t.marco.curso;
  const tc = t.alumno.cursos;
  const base = `/alumno/cursos/${grupoId}`;
  const vistas = [
    { href: `${base}/ruta`, texto: t.ruta.boton, icono: <IconoRuta /> },
    { href: `${base}/mapa`, texto: tc.mapa, icono: <IconoMapa /> },
    { href: `${base}/analiticas`, texto: tc.analiticas, icono: <IconoGrafica /> },
    { href: `${base}/cuaderno`, texto: tc.cuaderno, icono: <IconoCuaderno /> },
    { href: `${base}/proyecto`, texto: t.proyecto.alumno.boton, icono: <span aria-hidden>🏆</span> },
    { href: `${base}/autoestudio`, texto: t.autoestudio.tabla.ver, icono: <span aria-hidden>✨</span> },
  ];
  const enCurso = ruta === base;
  return (
    <div className="space-y-4">
      <div>
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{tm.titulo}</p>
        <Link
          href={base}
          aria-current={enCurso ? "page" : undefined}
          className={`mt-1 block rounded-lg px-3 py-1.5 text-sm font-semibold leading-snug ${enCurso ? "bg-tinta-50 text-tinta-800" : "text-slate-900 hover:bg-slate-100"}`}
        >
          {nombre}
        </Link>
      </div>
      <nav aria-label={tm.vistas} className="space-y-1.5">
        {vistas.map((v) => {
          const activo = ruta === v.href || ruta.startsWith(`${v.href}/`);
          return (
            <Link
              key={v.href}
              href={v.href}
              aria-current={activo ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ring-1 transition ${
                activo ? "bg-tinta-50 text-tinta-800 ring-tinta-300" : "bg-white text-slate-800 ring-slate-300 hover:bg-slate-50"
              }`}
            >
              {v.icono}
              <span className="min-w-0 flex-1 leading-tight">{v.texto}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

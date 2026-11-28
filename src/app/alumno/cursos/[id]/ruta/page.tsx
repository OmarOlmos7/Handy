import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CompaneroDelAlumno } from "@/components/companero-servidor";
import { LeyendaRuta, RutaEspina } from "@/components/ruta-espina";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { esTipoAutoactividad } from "@/lib/autoestudio";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { AMARILLO_PROGRESO, AZUL_CERTIFICADA, colorRuta, type TemaRuta, type UnidadRuta } from "@/lib/ruta-aprendizaje";
import { rutaDelAlumno } from "@/lib/ruta-curso";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.ruta.titulo };
}

const ICONO_TIPO = { practica: "📝", manuscrita: "✍️", videos: "🎬", lectura: "📖", tarjetas: "🃏" } as const;

const ESTILO_ESTADO: Record<UnidadRuta["estado"], { fondo: string; texto: string }> = {
  certificada: { fondo: AZUL_CERTIFICADA, texto: "#fff" },
  en_progreso: { fondo: AMARILLO_PROGRESO, texto: "#713f12" },
  sin_iniciar: { fondo: "#fff", texto: "#475569" },
};

/** Tarjeta de una unidad: estado, nivel, examen de certificación y temas por trabajar. */
function TarjetaUnidad({ u, t, enlace, vista }: { u: UnidadRuta; t: Diccionario; enlace: (tema: TemaRuta) => string; vista: string }) {
  const tr = t.ruta;
  const color = colorRuta(u.indice);
  const est = ESTILO_ESTADO[u.estado];
  const recomendados = u.temas.filter((x) => x.recomendado);
  const dominados = u.temas.filter((x) => x.estado === "dominado");
  const opcionales = u.temas.filter((x) => !x.recomendado && x.estado !== "dominado");
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold"
          style={{ background: est.fondo, color: u.estado === "sin_iniciar" ? color : est.texto, boxShadow: `0 0 0 3px #fff, 0 0 0 6px ${color}` }}
        >
          {u.estado === "certificada" ? "✓" : u.indice + 1}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.12em] uppercase" style={{ color }}>
            {formato(tr.unidad, { n: u.indice + 1 })} · {tr.estados[u.estado]}
          </p>
          <h3 className="mt-0.5 text-lg leading-snug font-bold text-slate-900">
            <Link href={vista} className="hover:text-tinta-700 hover:underline">
              {u.nombre}
            </Link>
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {u.nivel ? formato(tr.tuNivel, { nivel: tr.valoracion.niveles[u.nivel] }) : tr.sinNivel}
            {u.estado !== "certificada" && <> · {tr.prioridades[u.prioridad]}</>}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        {u.certificaciones.length === 0 ? (
          tr.sinCertificacion
        ) : (
          <ul className="space-y-1">
            {u.certificaciones.map((c) => (
              <li key={c.id} className="flex items-start gap-1.5">
                <span aria-hidden className={c.lograda ? "text-blue-600" : "text-slate-400"}>
                  {c.lograda ? "✔" : "○"}
                </span>
                <span>
                  {formato(tr.certificacion, { titulo: c.titulo, m: c.minimo })} · {c.porcentaje === null ? tr.sinPresentar : formato(tr.tuCalificacion, { p: Math.round(c.porcentaje) })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {recomendados.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{tr.nadaPorTrabajar}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {recomendados.map((tm) => (
            <li key={tm.nombre} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
              <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800" title={tm.nombre}>
                  {tm.nombre}
                </p>
                <p className="text-xs text-slate-500">
                  {ICONO_TIPO[tm.tipo]} {tr.acciones[tm.accion]} · {t.autoestudio.tipos[tm.tipo]}
                  {tm.porcentaje !== null && <> · {formato(tr.avance, { p: Math.round(tm.porcentaje) })}</>}
                </p>
              </div>
              <Link href={enlace(tm)} className="shrink-0 text-sm font-semibold text-tinta-700 hover:underline">
                {tr.estudiar} →
              </Link>
            </li>
          ))}
        </ul>
      )}
      {dominados.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          ✓ {dominados.map((d) => `${d.nombre} (${formato(tr.avance, { p: Math.round(d.porcentaje ?? 0) })})`).join(" · ")}
        </p>
      )}
      {opcionales.length > 0 && u.estado !== "certificada" && <p className="mt-2 text-xs text-slate-400">{formato(tr.opcionales, { temas: opcionales.map((o) => o.nombre).join(", ") })}</p>}
      <Link href={vista} className="mt-4 self-start rounded-lg px-1 text-sm font-semibold text-tinta-700 hover:underline">
        {tr.verUnidad} →
      </Link>
    </article>
  );
}

/**
 * Ruta de aprendizaje del alumno en un curso: diagrama de espina de pescado de "Inicio" a
 * "Completado" con las unidades en orden y, de cada una, los temas a repasar o practicar según su
 * valoración inicial y su avance. Tocar un tema abre el alta de una actividad de autoestudio.
 */
export default async function RutaCursoAlumno({ params, searchParams }: PageProps<"/alumno/cursos/[id]/ruta">) {
  const { id } = await params;
  const sp = await searchParams;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo, alumno: enCurso } = curso;
  const { t } = await textos();
  const tr = t.ruta;
  const db = await leer();
  const asignatura = asignaturaDelCurso(db, grupo);
  const migas = [
    { texto: t.alumno.panel.titulo, href: "/alumno" },
    { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/alumno/cursos/${grupo.id}` },
  ];
  if (!asignatura || asignatura.unidades.length === 0) {
    return (
      <>
        <Encabezado migas={migas} rutaEtiqueta={t.profesor.comun.ruta} titulo={tr.titulo} />
        <Tarjeta className="text-sm text-slate-600">{t.alumno.cursos.sinMapa}</Tarjeta>
      </>
    );
  }
  const { ruta, valoracion } = rutaDelAlumno(db, grupo.id, asignatura, { cuentaId: alumno.id, matricula: enCurso.matricula });
  // Sin valoración inicial, primero se hace (de ella sale la ruta).
  if (!valoracion) redirect(`/alumno/cursos/${grupo.id}/valoracion`);

  const base = `/alumno/cursos/${grupo.id}/ruta`;
  const vistaUnidad = (i: number) => `${base}/${i + 1}`;
  // Cada tema abre la vista de su unidad con el editor listo para ese tema.
  const enlaceTema = (i: number, tm: TemaRuta) => `${vistaUnidad(i)}?tema=${encodeURIComponent(tm.nombre.replace(/^\s*\d+(\.\d+)*[.)]?\s+/, ""))}&tipo=${tm.tipo}#estudiar`;
  const temaInicial = typeof sp.tema === "string" ? sp.tema.slice(0, 120) : undefined;
  const tipoInicial = esTipoAutoactividad(sp.tipo) ? sp.tipo : undefined;

  return (
    <>
      <Encabezado
        migas={migas}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={`${tr.titulo} · ${asignatura.nombre}`}
        subtitulo={formato(tr.resumen, { c: ruta.certificadas, n: ruta.unidades.length, p: ruta.pendientes })}
        acciones={
          <BotonLink variante="secundario" href={`/alumno/cursos/${grupo.id}/valoracion`}>
            {tr.rehacer}
          </BotonLink>
        }
      />
      {ruta.completada && <p className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 ring-1 ring-blue-200">🎉 {tr.felicidades}</p>}
      <section aria-label={tr.diagrama} className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{tr.comoFunciona}</p>
        </div>
        <div className="overflow-x-auto px-2 py-2">
          <RutaEspina ruta={ruta} t={t} enlaceTema={enlaceTema} enlaceUnidad={vistaUnidad} />
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3">
          <LeyendaRuta t={t} />
          <p className="text-xs text-slate-400 sm:hidden">{tr.deslizar}</p>
        </div>
      </section>

      <div id="estudiar" className="mt-6 scroll-mt-20">
        <CompaneroDelAlumno key={`${temaInicial ?? ""}|${tipoInicial ?? ""}`} db={db} alumno={alumno} grupoId={grupo.id} temaInicial={temaInicial} tipoInicial={tipoInicial} />
      </div>

      <section aria-labelledby="detalle-ruta" className="mt-2">
        <h2 id="detalle-ruta" className="mb-3 text-base font-semibold text-slate-800">
          {tr.detalle}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {ruta.unidades.map((u) => (
            <TarjetaUnidad key={u.nombre} u={u} t={t} enlace={(tm) => enlaceTema(u.indice, tm)} vista={vistaUnidad(u.indice)} />
          ))}
        </div>
      </section>
    </>
  );
}

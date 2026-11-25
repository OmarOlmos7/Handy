import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CompaneroDelAlumno } from "@/components/companero-servidor";
import { FilaActividadAlumno } from "@/components/fila-actividad-alumno";
import { CirculoEstado } from "@/components/histograma-rutas";
import { TablaAutoestudio } from "@/components/tabla-autoestudio";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { duracion, esTipoAutoactividad } from "@/lib/autoestudio";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { actividadesVisibles } from "@/lib/portal-alumno";
import { AMARILLO_PROGRESO, AZUL_CERTIFICADA, DOMINIO, colorRuta, esDeLaUnidad, tableroUnidad, type TemaRuta, type UnidadRuta } from "@/lib/ruta-aprendizaje";
import { rutaDelAlumno } from "@/lib/ruta-curso";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.ruta.titulo };
}

const sinNumero = (s: string) => s.replace(/^\s*\d+(\.\d+)*[.)]?\s+/, "");
const ICONO_TIPO = { practica: "📝", manuscrita: "✍️", videos: "🎬", lectura: "📖", tarjetas: "🃏" } as const;
const ESTILO_TEMA: Record<TemaRuta["estado"], string> = {
  dominado: "bg-blue-50 text-blue-800 ring-blue-200",
  en_progreso: "bg-amber-50 text-amber-900 ring-amber-200",
  pendiente: "bg-slate-50 text-slate-600 ring-slate-200",
};

function Indicador({ titulo, valor, detalle, acento }: { titulo: string; valor: ReactNode; detalle?: ReactNode; acento: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" style={{ borderTop: `4px solid ${acento}` }}>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{titulo}</p>
      <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{valor}</div>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

/** Barras horizontales: promedio de cada tema de la unidad, con la marca de dominio (80 %). */
function AvanceTemas({ u, t, enlace }: { u: UnidadRuta; t: Diccionario; enlace: (tm: TemaRuta) => string }) {
  const tv = t.ruta.unidadVista;
  const color = colorRuta(u.indice);
  return (
    <ul className="space-y-3">
      {u.temas.map((tm) => (
        <li key={tm.nombre} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800" title={tm.nombre}>
              {sinNumero(tm.nombre)}
            </p>
            <span className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${ESTILO_TEMA[tm.estado]}`}>{t.ruta.estadosTema[tm.estado]}</span>
          </div>
          <div className="order-3 col-span-2 flex items-center gap-2 sm:order-none sm:col-span-1">
            <div className="relative h-3 flex-1 rounded-full bg-slate-100" title={tm.porcentaje === null ? tv.sinNota : `${Math.round(tm.porcentaje)} %`}>
              {tm.porcentaje !== null && <div className="h-3 rounded-full" style={{ width: `${Math.max(2, Math.min(100, tm.porcentaje))}%`, background: color }} />}
              <span aria-hidden className="absolute -top-1 h-5 w-0.5 rounded bg-slate-400" style={{ left: `${DOMINIO}%` }} />
            </div>
            <span className="w-16 text-right text-sm font-semibold text-slate-700 tabular-nums">{tm.porcentaje === null ? "—" : `${Math.round(tm.porcentaje)} %`}</span>
          </div>
          <Link href={enlace(tm)} className="justify-self-end text-sm font-semibold text-tinta-700 hover:underline">
            {ICONO_TIPO[tm.tipo]} {tv.trabajar} →
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Vista de una unidad de la ruta de aprendizaje del alumno: su tablero de rendimiento, las
 * actividades que asignó el profesor en la unidad, las que el alumno se asignó y el editor para
 * asignarse una nueva sobre un tema de la unidad.
 */
export default async function UnidadRutaAlumno({ params, searchParams }: PageProps<"/alumno/cursos/[id]/ruta/[unidad]">) {
  const { id, unidad: numero } = await params;
  const sp = await searchParams;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo, alumno: enCurso } = curso;
  const { t, locale } = await textos();
  const tr = t.ruta;
  const tv = tr.unidadVista;
  const db = await leer();
  const asignatura = asignaturaDelCurso(db, grupo);
  const indice = Number(numero) - 1;
  if (!asignatura || !Number.isInteger(indice) || indice < 0 || indice >= asignatura.unidades.length) notFound();
  const ahora = new Date();
  const { ruta, valoracion, actividades, autoactividades } = rutaDelAlumno(db, grupo.id, asignatura, { cuentaId: alumno.id, matricula: enCurso.matricula }, ahora);
  if (!valoracion) redirect(`/alumno/cursos/${grupo.id}/valoracion`);

  const u = ruta.unidades[indice];
  const unidadAsig = asignatura.unidades[indice];
  const color = colorRuta(indice);
  const base = `/alumno/cursos/${grupo.id}/ruta`;
  const enlaceTema = (tm: TemaRuta) => `${base}/${indice + 1}?tema=${encodeURIComponent(sinNumero(tm.nombre))}&tipo=${tm.tipo}#estudiar`;

  const delProfesor = actividadesVisibles(db.actividades, grupo.id, ahora).filter((a) => a.temario?.asignaturaId === asignatura.id && a.temario.unidad === u.nombre);
  const paraTablero = actividades.filter((a) => a.temario?.unidad === u.nombre);
  const propias = autoactividades.filter((x) => esDeLaUnidad(x.tema, unidadAsig));
  const tab = tableroUnidad(u, paraTablero, propias);

  const temaInicial = typeof sp.tema === "string" ? sp.tema.slice(0, 120) : undefined;
  const tipoInicial = esTipoAutoactividad(sp.tipo) ? sp.tipo : undefined;
  const cert = u.certificaciones;
  const pct = (p: number | null) => (p === null ? "—" : `${Math.round(p)} %`);

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/alumno/cursos/${grupo.id}` },
          { texto: tr.titulo, href: base },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={`${formato(tr.unidad, { n: indice + 1 })} · ${u.nombre.replace(/^(unidad|unit)\s*\d+[.:)\-–]?\s*/i, "")}`}
        subtitulo={
          <>
            {tr.estados[u.estado]} · {u.nivel ? formato(tr.tuNivel, { nivel: tr.valoracion.niveles[u.nivel] }) : tr.sinNivel}
            {u.estado !== "certificada" && <> · {tr.prioridades[u.prioridad]}</>}
          </>
        }
        acciones={
          <BotonLink variante="secundario" href={base}>
            ← {tv.volver}
          </BotonLink>
        }
      />

      {/* Unidades del curso: para pasar de una a otra sin volver al diagrama. */}
      <nav aria-label={tv.unidades} className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {ruta.unidades.map((x) => {
          const actual = x.indice === indice;
          return (
            <Link
              key={x.nombre}
              href={`${base}/${x.indice + 1}`}
              aria-current={actual ? "page" : undefined}
              title={`${x.nombre} · ${tr.estados[x.estado]}`}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${actual ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
            >
              <CirculoEstado estado={x.estado} color={colorRuta(x.indice)} tam={18} />
              {formato(tr.unidad, { n: x.indice + 1 })}
            </Link>
          );
        })}
      </nav>

      <section aria-labelledby="tablero-unidad" className="mb-8">
        <h2 id="tablero-unidad" className="mb-3 text-base font-semibold text-slate-800">
          {tv.tablero}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Indicador
            titulo={tv.certificacion}
            acento={u.estado === "certificada" ? AZUL_CERTIFICADA : u.estado === "en_progreso" ? AMARILLO_PROGRESO : "#cbd5e1"}
            valor={
              <span className="flex items-center gap-2 text-lg">
                <CirculoEstado estado={u.estado} color={color} tam={24} />
                {u.estado === "certificada" ? tv.certificada : cert.length ? tv.porCertificar : tv.sinExamen}
              </span>
            }
            detalle={cert.length ? cert.map((c) => `${c.titulo}: ${c.porcentaje === null ? tr.sinPresentar : `${Math.round(c.porcentaje)} %`} (≥ ${c.minimo} %)`).join(" · ") : tr.sinCertificacion}
          />
          <Indicador titulo={tv.promedio} acento={color} valor={pct(tab.promedio)} detalle={tab.promedio === null ? tv.sinCalificacion : tv.promedioAyuda} />
          <Indicador
            titulo={tv.delProfesor}
            acento="#0284c7"
            valor={pct(tab.profesor.promedio)}
            detalle={formato(tv.entregadas, { e: tab.profesor.entregadas, n: tab.profesor.total })}
          />
          <Indicador
            titulo={tv.autoasignadas}
            acento="#7c3aed"
            valor={pct(tab.autoestudio.promedio)}
            detalle={formato(tv.completadas, { n: tab.autoestudio.completadas, t: duracion(tab.autoestudio.segundos) })}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_16px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              {tv.avanceTemas} · {tv.temasDominados}: {formato(tv.deTemas, { d: tab.temas.dominados, n: tab.temas.total })}
            </h3>
            <p className="text-xs text-slate-500">{tv.avanceAyuda}</p>
          </div>
          <AvanceTemas u={u} t={t} enlace={enlaceTema} />
        </div>
      </section>

      <section aria-labelledby="del-profesor" className="mb-8">
        <h2 id="del-profesor" className="mb-2 flex items-baseline gap-2 text-base font-semibold text-slate-800">
          {tv.asignadas}
          <span className="rounded-full bg-sky-100 px-2 text-xs font-medium text-sky-800">{delProfesor.length}</span>
        </h2>
        {delProfesor.length === 0 ? (
          <Tarjeta className="text-sm text-slate-500">{tv.asignadasVacio}</Tarjeta>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            {delProfesor.map((a) => (
              <FilaActividadAlumno key={a.id} actividad={a} entrega={db.entregas.find((e) => e.actividadId === a.id && e.matricula === enCurso.matricula)} ahora={ahora} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="propias" className="mb-8">
        <h2 id="propias" className="mb-2 flex items-baseline gap-2 text-base font-semibold text-slate-800">
          {tv.propias}
          <span className="rounded-full bg-violet-100 px-2 text-xs font-medium text-violet-800">{propias.length}</span>
        </h2>
        <TablaAutoestudio lista={propias} t={t} locale={locale} enlaces />
      </section>

      <section id="estudiar" aria-labelledby="crear" className="scroll-mt-20">
        <h2 id="crear" className="text-base font-semibold text-slate-800">
          {tv.crear}
        </h2>
        <p className="mt-1 mb-3 text-sm text-slate-500">{tv.crearAyuda}</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {u.temas.map((tm) => {
            const elegido = temaInicial === sinNumero(tm.nombre);
            return (
              <Link
                key={tm.nombre}
                href={enlaceTema(tm)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${elegido ? "text-white" : "bg-white text-slate-700 hover:border-slate-400"}`}
                style={elegido ? { background: color, borderColor: color } : { borderColor: "#e2e8f0" }}
              >
                {sinNumero(tm.nombre)}
              </Link>
            );
          })}
        </div>
        <CompaneroDelAlumno key={`${temaInicial ?? ""}|${tipoInicial ?? ""}`} db={db} alumno={alumno} grupoId={grupo.id} temaInicial={temaInicial} tipoInicial={tipoInicial} />
      </section>
    </>
  );
}

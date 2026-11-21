import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Columnas } from "@/components/graficas";
import { MapaTemario } from "@/components/mapa-temario";
import { Cifra, Seccion, num } from "@/components/tablero";
import { Tarjeta } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { avanceGrupo, colorProgreso, type AvanceAlumno, type Insight } from "@/lib/avance-grupo";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { avanceTemario, relacionesValidas } from "@/lib/mapa-temario";
import { datosProfesor } from "@/lib/sesion";
import { textoTiempo } from "@/lib/tiempo";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.avance.meta };
}

/** Pastel chico (en CSS) con el color del avance. */
function Pie({ p, tam = 18 }: { p: number | null; tam?: number }) {
  const c = colorProgreso(p);
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: tam, height: tam, background: `conic-gradient(${c} ${p ?? 0}%, #e2e8f0 0)`, boxShadow: `inset 0 0 0 1.5px ${c}` }}
    />
  );
}

const ESTILO_INSIGHT: Record<Insight["tipo"], string> = {
  alerta: "bg-error-suave text-error",
  oportunidad: "bg-amber-50 text-amber-800",
  logro: "bg-emerald-50 text-emerald-700",
  dato: "bg-sky-50 text-sky-700",
};

/** Avance del grupo en el temario: grafo con minipies por unidad y analíticas para actuar. */
export default async function AvanceTemarioGrupo({ params }: PageProps<"/profesor/grupos/[id]/avance">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t } = await textos();
  const tv = t.profesor.avance;
  const tc = t.profesor.comun;
  const asignatura = asignaturaDelCurso(db, grupo);
  const ag = asignatura ? avanceGrupo(asignatura, grupo, db.actividades, db.entregas, db.tiempos ?? []) : null;
  const hay = Boolean(ag && ag.resumen.actividades > 0);

  const migas = (
    <nav className="mb-1 flex flex-wrap gap-1 text-sm text-slate-500" aria-label={tc.ruta}>
      <Link href="/profesor" className="hover:text-tinta-700">
        {tc.panel}
      </Link>
      <span>/</span>
      <Link href={`/profesor/grupos/${grupo.id}`} className="hover:text-tinta-700">
        {grupo.materia} · {grupo.nombre}
      </Link>
    </nav>
  );

  if (!asignatura || !ag || !hay)
    return (
      <>
        <div className="mb-6">
          {migas}
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{tv.meta}</h1>
        </div>
        <Tarjeta className="text-sm text-slate-600">{asignatura ? formato(tv.sinActividades, { a: asignatura.nombre }) : tv.sinAsignatura}</Tarjeta>
      </>
    );

  const r = ag.resumen;
  const nA = grupo.alumnos.length;
  // El grafo: color de cada tema = % del grupo que realizó sus actividades.
  const ligadas = db.actividades.filter((a) => a.id in ag.porActividad);
  const avance = avanceTemario(asignatura, ligadas, (actId) => ({ porcentaje: ag.porActividad[actId] ?? null }));
  const indicadores = Object.fromEntries(ag.unidades.map((u) => [u.nombre, u.avance]));

  const orden = [...ag.alumnos].sort((a, b) => b.avance - a.avance || (b.promedio ?? 0) - (a.promedio ?? 0) || b.segundos - a.segundos);
  const top = orden.slice(0, 5);
  const bajos = orden.slice(-5).reverse().filter((a) => !top.includes(a) || orden.length <= 5);
  const temasTiempo = ag.temas.filter((x) => x.segundos > 0).sort((a, b) => b.segundos - a.segundos).slice(0, 8);
  const maxTema = temasTiempo[0]?.segundos ?? 1;

  const conTiempo = r.segundos > 0;
  const serieHoras = conTiempo ? ag.horas.segundos.map((s) => Math.round(s / 60)) : ag.horas.entregas;
  const serieDias = conTiempo ? ag.dias.segundos.map((s) => Math.round(s / 60)) : ag.dias.entregas;
  // Lunes primero.
  const ordenDias = [1, 2, 3, 4, 5, 6, 0];

  const textoInsight = (x: Insight) => {
    const v = { ...x.valores };
    if (x.clave === "diaPico") v.d = tv.diasLargos[Number(v.d)];
    const plantilla = (tv.textos as Record<string, string>)[x.clave];
    return plantilla ? formato(plantilla, v) : "";
  };

  const FilaAlumno = ({ a }: { a: AvanceAlumno }) => (
    <li className="flex items-center gap-3 py-2">
      <Pie p={a.avance} tam={22} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{a.nombre}</p>
        <p className="text-xs text-slate-500">
          {formato(tv.alumnoDetalle, { r: a.realizadas, t: a.total, u: a.unidadesTerminadas, tiempo: textoTiempo(a.segundos) })}
          {a.promedio !== null ? ` · ${tv.promedio} ${num(a.promedio)} %` : ""}
        </p>
      </div>
      <span className="text-sm font-semibold tabular-nums" style={{ color: colorProgreso(a.avance) === "#eab308" ? "#a16207" : colorProgreso(a.avance) }}>
        {num(a.avance)} %
      </span>
    </li>
  );

  return (
    <>
      <div className="mb-6">
        {migas}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{tv.meta}</h1>
        <p className="mt-1 text-sm text-slate-600">{formato(tv.subtitulo, { a: asignatura.nombre, n: r.actividades, m: nA })}</p>
      </div>

      <div className="min-w-0 space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Cifra titulo={tv.avanceTotal} valor={`${num(r.avance)} %`} detalle={tv.avanceTotalDetalle} />
          <Cifra titulo={tv.unidadesTerminadas} valor={String(r.unidadesTerminadas)} detalle={formato(tv.unidadesTerminadasDetalle, { t: r.totalUnidades })} />
          <Cifra
            titulo={tv.unidadesEnProceso}
            valor={String(r.unidadesEnProceso)}
            detalle={r.avanceEnProceso !== null ? formato(tv.unidadesEnProcesoDetalle, { p: num(r.avanceEnProceso) }) : undefined}
          />
          <Cifra
            titulo={tv.unidadesSinIniciar}
            valor={String(r.unidadesSinIniciar)}
            detalle={formato(tv.unidadesSinIniciarDetalle, { p: num(r.totalUnidades ? (r.unidadesSinIniciar / r.totalUnidades) * 100 : 0), t: r.totalUnidades })}
          />
          <Cifra titulo={tv.realizadas} valor={`${r.realizadas}`} detalle={formato(tv.realizadasDetalle, { n: r.posibles, a: r.actividades })} />
          <Cifra titulo={tv.tiempo} valor={textoTiempo(r.segundos)} detalle={formato(tv.tiempoDetalle, { p: textoTiempo(nA ? r.segundos / nA : 0) })} />
        </div>

        <section className="space-y-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{tv.mapa}</h2>
            <p className="text-xs text-slate-500">{tv.mapaNota}</p>
          </div>
          <MapaTemario
            key={asignatura.id}
            asignatura={asignatura}
            relaciones={relacionesValidas(asignatura)}
            avance={avance}
            modo="profesor"
            escala="progreso"
            indicadores={indicadores}
            enlaceActividad="/profesor/actividades/"
          />
        </section>

        {ag.insights.length > 0 && (
          <Seccion titulo={tv.insights} nota={tv.insightsNota}>
            <ul className="grid gap-2 lg:grid-cols-2">
              {ag.insights.map((x, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTILO_INSIGHT[x.tipo]}`}>{tv.tipos[x.tipo]}</span>
                  <span>{textoInsight(x)}</span>
                </li>
              ))}
            </ul>
          </Seccion>
        )}

        <Seccion titulo={tv.porUnidad}>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="px-2 py-1.5 font-medium">{tv.unidad}</th>
                  <th className="px-2 py-1.5 text-center font-medium">{tv.actividades}</th>
                  <th className="px-2 py-1.5 font-medium">{tv.avance}</th>
                  <th className="px-2 py-1.5 text-center font-medium">{tv.terminaron}</th>
                  <th className="px-2 py-1.5 text-center font-medium">{tv.promedio}</th>
                  <th className="px-2 py-1.5 text-right font-medium">{tv.tiempoCol}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ag.unidades.map((u) => (
                  <tr key={u.nombre}>
                    <td className="px-2 py-2 text-slate-800">
                      <span className="mr-1.5 text-xs text-slate-400">{u.indice + 1}.</span>
                      {u.nombre}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums text-slate-600">{u.actividades || "–"}</td>
                    <td className="px-2 py-2">
                      <span className="flex items-center gap-2">
                        <Pie p={u.avance} />
                        <span className="tabular-nums font-semibold text-slate-800">{u.avance === null ? "–" : `${num(u.avance)} %`}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums text-slate-600">{u.actividades ? `${u.terminaron}/${nA}` : "–"}</td>
                    <td className="px-2 py-2 text-center tabular-nums text-slate-600">{u.promedio === null ? "–" : `${num(u.promedio)} %`}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-600">{u.segundos ? textoTiempo(u.segundos) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Seccion titulo={tv.mayorAvance}>
            <ul className="divide-y divide-slate-100">
              {top.map((a) => (
                <FilaAlumno key={a.matricula} a={a} />
              ))}
            </ul>
          </Seccion>
          <Seccion titulo={tv.menorAvance}>
            <ul className="divide-y divide-slate-100">
              {bajos.map((a) => (
                <FilaAlumno key={a.matricula} a={a} />
              ))}
            </ul>
          </Seccion>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Seccion titulo={tv.temasTiempo} nota={tv.temasTiempoNota}>
            {temasTiempo.length === 0 ? (
              <p className="text-sm text-slate-500">{tv.sinTiempo}</p>
            ) : (
              <ul className="space-y-3">
                {temasTiempo.map((x) => (
                  <li key={x.clave}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate text-slate-700" title={x.clave}>
                        {x.nombre}
                        <span className="ml-1.5 text-xs text-slate-400">{formato(t.profesor.mapa.unidadCorta, { n: x.unidad + 1 })}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-900">{textoTiempo(x.segundos)}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-tinta-500" style={{ width: `${Math.max(2, (x.segundos / maxTema) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>
          <Seccion titulo={tv.horarios} nota={conTiempo ? tv.horariosNotaTiempo : tv.horariosNotaEntregas} className="lg:col-span-2">
            <Columnas
              filas={serieHoras.map((v, h) => ({ nombre: String(h), valor: v, detalle: `${h}:00–${(h + 1) % 24}:00` }))}
              max={Math.max(...serieHoras, 1)}
              colorDe={() => "#3b6ef6"}
            />
          </Seccion>
        </div>

        <Seccion titulo={tv.porDia} nota={conTiempo ? tv.porDiaNotaTiempo : tv.porDiaNotaEntregas}>
          <Columnas filas={ordenDias.map((d) => ({ nombre: tv.dias[d], valor: serieDias[d] }))} max={Math.max(...serieDias, 1)} colorDe={() => "#14b8a6"} />
        </Seccion>
      </div>
    </>
  );
}

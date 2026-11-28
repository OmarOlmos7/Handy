import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AjustesCurso } from "@/components/asesorias";
import { ListaFueraHorario, PuntoEstado } from "@/components/asistencia";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { ahoraEnMexico, asuetoDeAgenda, duracionTexto } from "@/lib/asesorias";
import { fechaCorta } from "@/lib/asesorias-vista";
import {
  conteoLista,
  horaTexto,
  minutosPorSemana,
  periodoAsistencia,
  registroDe,
  resumenCurso,
  resumenPorAlumno,
  sesionDeHoy,
  sesionesDelCurso,
  type SesionClase,
} from "@/lib/asistencia";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";
import type { RegistroAsistencia } from "@/lib/tipos";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.asistencia.meta };
}

/** Días antes de hoy que se ven sin "Ver todas las sesiones". */
const DIAS_RECIENTES = 14;

/** Asistencia del curso: horario, sesiones con su lista y el resumen por alumno. */
export default async function AsistenciaCurso({ params, searchParams }: PageProps<"/profesor/grupos/[id]/asistencia">) {
  const { id } = await params;
  const { todas } = await searchParams;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t, locale } = await textos();
  const ta = t.asistencia;
  const tc = ta.curso;
  const { fecha: hoy, minutos } = ahoraEnMexico();
  const agenda = (db.agendas ?? [])[0];
  const registros = (db.asistencias ?? []).filter((r) => r.grupoId === grupo.id);
  const sesiones = sesionesDelCurso(grupo, hoy, registros, (f) => asuetoDeAgenda(agenda, f));
  const resumen = resumenCurso(grupo, sesiones, registros, hoy, minutos);
  const porAlumno = resumenPorAlumno(grupo, registros, locale);
  const deHoy = sesionDeHoy(sesiones, hoy, minutos);
  const base = `/profesor/grupos/${grupo.id}/asistencia`;
  const verTodas = todas === "1";
  const desdeRecientes = new Date(Date.parse(`${hoy}T00:00:00Z`) - DIAS_RECIENTES * 86_400_000).toISOString().slice(0, 10);
  const hastaRecientes = new Date(Date.parse(`${hoy}T00:00:00Z`) + 7 * 86_400_000).toISOString().slice(0, 10);
  const visibles = verTodas ? sesiones : sesiones.filter((s) => s.fecha >= desdeRecientes && s.fecha <= hastaRecientes);
  // Las más recientes arriba.
  const lista = [...visibles].reverse();
  const conRostro = (db.rostros ?? []).filter((r) => r.grupoId === grupo.id && r.descriptores.length).length;
  const horario = grupo.horario ?? [];
  const periodo = periodoAsistencia(grupo, hoy);

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={`${ta.meta} · ${grupo.materia} · ${grupo.nombre}`}
        subtitulo={tc.subtitulo}
        acciones={
          <>
            {deHoy && <BotonLink href={`${base}/${deHoy.id}`}>✅ {tc.tomarHoy}</BotonLink>}
            <BotonLink variante="secundario" href={`${base}/rostros`}>
              🙂 {tc.rostros}
              {conRostro > 0 && <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{conRostro}</span>}
            </BotonLink>
          </>
        }
      />

      <Tarjeta className="relative mb-5 !p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{tc.horario}</p>
            {horario.length ? (
              <>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {horario.map((c) => (
                    <li key={`${c.dia}-${c.inicio}`} className="rounded-lg bg-tinta-50 px-2.5 py-1 text-sm font-medium text-tinta-800">
                      {ta.diasCortos[c.dia - 1]} {horaTexto(c.inicio)}–{horaTexto(c.fin)}
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-slate-500">
                  {grupo.cadaSemanas === 2 ? ta.horario.cada2 : ta.horario.cada1} ·{" "}
                  {formato(ta.horario.resumen, { h: duracionTexto(minutosPorSemana(horario, grupo.cadaSemanas)) })} · {fechaCorta(periodo.desde, locale)} –{" "}
                  {fechaCorta(periodo.hasta, locale)}
                </p>
              </>
            ) : (
              <p className="mt-1 max-w-prose text-sm text-slate-700">{tc.sinHorario}</p>
            )}
            {horario.length > 0 && (!grupo.inicio || !grupo.fin) && <p className="mt-1 text-xs text-aviso">{tc.sinFechas}</p>}
          </div>
          <div className="flex items-center gap-1 text-sm text-tinta-700">
            <span className="hidden sm:inline">{tc.editar}</span>
            <AjustesCurso grupoId={grupo.id} inicio={grupo.inicio} fin={grupo.fin} horario={grupo.horario} cadaSemanas={grupo.cadaSemanas} />
          </div>
        </div>
      </Tarjeta>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { titulo: tc.promedio, valor: resumen.porcentaje === null ? "—" : `${resumen.porcentaje} %`, clase: "text-acierto" },
          { titulo: tc.listas, valor: `${resumen.tomadas} / ${resumen.pasadas}`, clase: "text-slate-900" },
          { titulo: tc.pendientes, valor: String(resumen.pendientes), clase: resumen.pendientes ? "text-aviso" : "text-slate-900" },
          { titulo: `${tc.retardos} · ${tc.faltas}`, valor: `${resumen.retardos} · ${resumen.faltas}`, clase: "text-slate-900" },
        ].map((x) => (
          <Tarjeta key={x.titulo} className="!p-4">
            <p className="text-xs text-slate-500">{x.titulo}</p>
            <p className={`mt-1 text-2xl font-semibold ${x.clase}`}>{x.valor}</p>
          </Tarjeta>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-lg font-semibold">{tc.sesiones}</h2>
            <Link href={verTodas ? base : `${base}?todas=1`} className="text-sm text-tinta-700 hover:underline">
              {verTodas ? tc.verRecientes : tc.verTodas}
            </Link>
          </div>
          {lista.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">{horario.length ? tc.sinSesiones : tc.sinHorario}</p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              {lista.map((s) => (
                <FilaSesion key={s.id} s={s} base={base} hoy={hoy} minutos={minutos} locale={locale} t={ta} grupo={grupo} registro={registroDe(registros, grupo.id, s.fecha, s.inicio)} />
              ))}
            </ul>
          )}
          <ListaFueraHorario base={base} hoy={hoy} />
        </section>

        <aside>
          <h2 className="mb-3 text-lg font-semibold">{tc.porAlumno}</h2>
          {porAlumno.length === 0 ? (
            <p className="text-sm text-slate-500">{tc.sinAlumnos}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">{tc.alumno}</th>
                    <th className="px-2 py-2 text-center font-medium" title={ta.estados.asistencia}>
                      <PuntoEstado estado="asistencia" />
                    </th>
                    <th className="px-2 py-2 text-center font-medium" title={ta.estados.retardo}>
                      <PuntoEstado estado="retardo" />
                    </th>
                    <th className="px-2 py-2 text-center font-medium" title={ta.estados.falta}>
                      <PuntoEstado estado="falta" />
                    </th>
                    <th className="px-3 py-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {porAlumno.map((a) => (
                    <tr key={a.matricula} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">{a.nombre}</td>
                      <td className="px-2 py-2 text-center">{a.asistencia}</td>
                      <td className="px-2 py-2 text-center">{a.retardo}</td>
                      <td className="px-2 py-2 text-center">{a.falta}</td>
                      <td
                        className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${
                          a.porcentaje === null ? "text-slate-400" : a.porcentaje < 80 ? "text-error" : a.porcentaje < 90 ? "text-aviso" : "text-acierto"
                        }`}
                      >
                        {a.porcentaje === null ? "—" : `${a.porcentaje} %`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">{tc.leyenda}</p>
        </aside>
      </div>
    </>
  );
}

function FilaSesion({
  s,
  base,
  hoy,
  minutos,
  locale,
  t,
  grupo,
  registro,
}: {
  s: SesionClase;
  base: string;
  hoy: string;
  minutos: number;
  locale: string;
  t: Awaited<ReturnType<typeof textos>>["t"]["asistencia"];
  grupo: Parameters<typeof conteoLista>[0];
  registro: RegistroAsistencia | undefined;
}) {
  const tc = t.curso;
  const esHoy = s.fecha === hoy;
  const futura = s.fecha > hoy || (esHoy && s.inicio > minutos + 30);
  const c = registro ? conteoLista(grupo, registro) : undefined;
  const dia = t.dias[(new Date(`${s.fecha}T12:00:00Z`).getUTCDay() + 6) % 7];
  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 ${esHoy ? "bg-tinta-50/60" : ""}`}>
      <div className="min-w-[11rem] flex-1">
        <p className="font-medium text-slate-900">
          {dia} {fechaCorta(s.fecha, locale)}
          {esHoy && <span className="ml-2 rounded-full bg-tinta-600 px-2 py-0.5 text-[11px] font-semibold text-white">{tc.hoy}</span>}
        </p>
        <p className="text-xs text-slate-500">
          {horaTexto(s.inicio)}–{horaTexto(s.fin)}
          {s.asueto && <span className="ml-2 text-aviso">{formato(tc.asueto, { nombre: s.asueto })}</span>}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {c ? (
          <span className="flex items-center gap-2.5 text-slate-700" aria-label={formato(t.sesion.resumen, { a: c.asistencia, r: c.retardo, f: c.falta, s: c.sinMarca })}>
            <span className="inline-flex items-center gap-1">
              <PuntoEstado estado="asistencia" /> {c.asistencia}
            </span>
            <span className="inline-flex items-center gap-1">
              <PuntoEstado estado="retardo" /> {c.retardo}
            </span>
            <span className="inline-flex items-center gap-1">
              <PuntoEstado estado="falta" /> {c.falta}
            </span>
            {registro?.metodo === "foto" && <span title={tc.conFoto}>📷</span>}
          </span>
        ) : (
          <span className={`text-xs font-medium ${s.asueto ? "text-slate-400" : futura ? "text-slate-400" : "text-aviso"}`}>
            {s.asueto ? "" : futura ? tc.proxima : tc.pendiente}
          </span>
        )}
        <Link
          href={`${base}/${s.id}`}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ${
            c ? "text-slate-700 ring-slate-300 hover:bg-slate-50" : futura ? "text-slate-500 ring-slate-200 hover:bg-slate-50" : "bg-tinta-600 text-white ring-tinta-600 hover:bg-tinta-700"
          }`}
        >
          {c ? tc.abrir : tc.tomar}
        </Link>
      </div>
    </li>
  );
}

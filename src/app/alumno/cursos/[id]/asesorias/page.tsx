import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AgendaAlumno, MisAsesorias } from "@/components/asesorias";
import { Encabezado, Tarjeta } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { MAX_PENDIENTES_ALUMNO, ahoraEnMexico, asesoriasDelCurso, duracionTexto, fechaValida, fechasSemana, lunesDe, resumenAsesorias, semanaParaAlumno, sumarDias } from "@/lib/asesorias";
import { textoPeriodo, vistaAsesoria } from "@/lib/asesorias-vista";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.asesorias.meta };
}

/** Asesorías del alumno en un curso: agenda de su profesor para pedir una y sus asesorías. */
export default async function AsesoriasAlumno({ params, searchParams }: PageProps<"/alumno/cursos/[id]/asesorias">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo, alumno: enCurso } = curso;
  const { t, locale } = await textos();
  const ta = t.asesorias;
  const tc = ta.curso;
  const q = await searchParams;
  const db = await leer();
  const ahora = new Date();
  const hoy = ahoraEnMexico(ahora).fecha;
  const actual = lunesDe(hoy);
  const semana = lunesDe(fechaValida(q.semana) ?? hoy);
  const fechas = fechasSemana(semana);
  const agenda = (db.agendas ?? []).find((a) => a.profesorId === grupo.profesorId);
  const asesorias = db.asesorias ?? [];
  const franjas = semanaParaAlumno({ agenda, asesorias, grupo, matricula: enCurso.matricula }, fechas, ahora);
  const mias = asesoriasDelCurso(asesorias, grupo.id, enCurso.matricula).map((a) => vistaAsesoria(a, { grupo, locale, paraProfesor: false }, ahora));
  const r = resumenAsesorias(asesorias, grupo, enCurso.matricula, ahora);
  const periodo = textoPeriodo(ta, grupo.inicio, grupo.fin, locale);
  const sinAgenda = !agenda?.bloques.some((b) => b.tipo === "asesoria");

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/alumno/cursos/${grupo.id}` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={`🙋 ${ta.meta} · ${grupo.materia}`}
        subtitulo={tc.subtituloAlumno}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta className="!p-4">
          <p className="text-xs text-slate-500">{tc.realizadas}</p>
          <p className="mt-1 text-2xl font-semibold text-acierto">{r.realizadas}</p>
        </Tarjeta>
        <Tarjeta className="!p-4">
          <p className="text-xs text-slate-500">{tc.tiempo}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{duracionTexto(r.minutos)}</p>
        </Tarjeta>
        <Tarjeta className="!p-4">
          <p className="text-xs text-slate-500">{tc.proximas}</p>
          <p className="mt-1 text-2xl font-semibold text-tinta-700">{r.proximas}</p>
        </Tarjeta>
        <Tarjeta className="!p-4">
          <p className="text-xs text-slate-500">{tc.periodoCurso}</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{periodo ?? ta.sinPeriodo}</p>
        </Tarjeta>
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section>
          <AgendaAlumno
            grupoId={grupo.id}
            semana={semana}
            fechas={fechas}
            hoy={hoy}
            franjas={franjas}
            rutaBase={`/alumno/cursos/${grupo.id}/asesorias?`}
            anterior={sumarDias(semana, -7)}
            siguiente={sumarDias(semana, 7)}
            actual={actual}
            sinAgenda={sinAgenda}
          />
          <p className="mt-3 text-xs text-slate-500">{formato(ta.alumno.limite, { n: MAX_PENDIENTES_ALUMNO })}</p>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">{ta.alumno.tusAsesorias}</h2>
          <MisAsesorias asesorias={mias} />
        </section>
      </div>
    </>
  );
}

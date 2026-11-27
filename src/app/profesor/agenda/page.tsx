import type { Metadata } from "next";
import Link from "next/link";
import { AgendaSemanal, type CitaAgenda } from "@/components/agenda-semanal";
import { FichaAsesoriaProfesor } from "@/components/asesorias";
import { Encabezado, Tarjeta } from "@/components/ui";
import { activa, ahoraEnMexico, celdasDeBloques, duracionTexto, fechaValida, fechasSemana, lunesDe, minutosDisponibles, sumarDias, yaPaso } from "@/lib/asesorias";
import { vistaAsesoria } from "@/lib/asesorias-vista";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.asesorias.agenda };
}

/**
 * Agenda semanal del profesor (lunes a viernes, 7:00 a 18:00): marca clases, comida, proyectos y
 * reuniones como no disponibles y las franjas de asesoría; ve las asesorías que agendaron sus alumnos.
 * Con ?curso= se abre desde la tarjeta de un curso y resalta sus asesorías.
 */
export default async function AgendaProfesor({ searchParams }: PageProps<"/profesor/agenda">) {
  const { db } = await datosProfesor();
  const { t, locale } = await textos();
  const ta = t.asesorias;
  const tp = ta.profesor;
  const q = await searchParams;
  const ahora = new Date();
  const hoy = ahoraEnMexico(ahora).fecha;
  const actual = lunesDe(hoy);
  const semana = lunesDe(fechaValida(q.semana) ?? hoy);
  const fechas = fechasSemana(semana);
  const curso = typeof q.curso === "string" ? db.grupos.find((g) => g.id === q.curso) : undefined;
  const agenda = (db.agendas ?? [])[0];
  const bloques = agenda?.bloques ?? [];
  const enSemana = new Set(fechas);
  const asesorias = (db.asesorias ?? []).filter((a) => enSemana.has(a.fecha));
  const grupoDe = (id: string) => db.grupos.find((g) => g.id === id);
  const citas: CitaAgenda[] = asesorias.filter(activa).map((a) => {
    const g = grupoDe(a.grupoId);
    return {
      id: a.id,
      fecha: a.fecha,
      inicio: a.inicio,
      duracion: a.duracion,
      alumno: g?.alumnos.find((x) => x.matricula === a.matricula)?.nombre ?? a.matricula,
      curso: g ? `${g.materia} · ${g.nombre}` : "",
      resaltar: !curso || a.grupoId === curso.id,
    };
  });
  const vistas = asesorias
    .filter((a) => a.estado !== "cancelada")
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio)
    .filter((a) => !curso || a.grupoId === curso.id)
    .map((a) => vistaAsesoria(a, { grupo: grupoDe(a.grupoId), locale, agenda, paraProfesor: true }, ahora));
  const porRegistrar = (db.asesorias ?? []).filter((a) => a.estado === "agendada" && yaPaso(a, ahora)).length;
  const parametros = curso ? `curso=${curso.id}&` : "";

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          ...(curso ? [{ texto: `${curso.materia} · ${curso.nombre}`, href: `/profesor/grupos/${curso.id}` }] : []),
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={`🗓️ ${ta.agenda}`}
        subtitulo={tp.subtitulo}
        acciones={
          curso && (
            <Link href={`/profesor/grupos/${curso.id}/asesorias`} className="text-sm font-medium text-tinta-700 hover:underline">
              {tp.verCurso} →
            </Link>
          )
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Tarjeta className="!p-4">
          <p className="text-xs text-slate-500">{tp.disponibleSemana}</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700">{duracionTexto(minutosDisponibles(agenda, fechas))}</p>
        </Tarjeta>
        <Tarjeta className="!p-4">
          <p className="text-xs text-slate-500">{tp.agendadasSemana}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{citas.length}</p>
        </Tarjeta>
        <Tarjeta className="!p-4">
          <p className="text-xs text-slate-500">{tp.porRegistrar}</p>
          <p className={`mt-1 text-2xl font-semibold ${porRegistrar ? "text-aviso" : "text-slate-900"}`}>{porRegistrar}</p>
          <p className="text-xs text-slate-500">{tp.porRegistrarTexto}</p>
        </Tarjeta>
      </div>
      <AgendaSemanal
        key={`${semana}-${agenda?.actualizadaEn ?? ""}`}
        semana={semana}
        fechas={fechas}
        hoy={hoy}
        semanales={celdasDeBloques(bloques.filter((b) => !b.fecha))}
        deLaSemana={celdasDeBloques(bloques.filter((b) => b.fecha && enSemana.has(b.fecha)))}
        citas={citas}
        cursos={db.grupos.filter((g) => !g.archivado).map((g) => `${g.materia} ${g.nombre}`)}
        rutaBase={`/profesor/agenda?${parametros}`}
        anterior={sumarDias(semana, -7)}
        siguiente={sumarDias(semana, 7)}
        actual={actual}
      />
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">
          {tp.asesoriasSemana} {curso && <span className="text-sm font-normal text-slate-500">· {formato(tp.delCurso, { curso: `${curso.materia} · ${curso.nombre}` })}</span>}
        </h2>
        {vistas.length === 0 ? (
          <p className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{tp.sinAsesoriasSemana}</p>
        ) : (
          <ul className="space-y-3">
            {vistas.map((v) => (
              <FichaAsesoriaProfesor key={v.id} a={v} mostrarCurso={!curso} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarioGeneral, type DiaCalendario } from "@/components/calendario-general";
import { Encabezado } from "@/components/ui";
import { hoyAlumno, mesVecino, semanasDelMes } from "@/lib/agenda-hoy";
import { ahoraEnMexico, fechaValida, fechasSemana, lunesDe, sumarDias } from "@/lib/asesorias";
import { leer } from "@/lib/almacen";
import { textos } from "@/lib/i18n/servidor";
import { actividadesVisibles } from "@/lib/portal-alumno";
import { alumnoActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.asesorias.calendario.titulo };
}

/**
 * Calendario general del alumno: clases que el profesor ligó a sus cursos, actividades comunes,
 * asesorías, cierres de entrega y asuetos, por semana o por mes, con filtro por curso.
 */
export default async function CalendarioAlumno({ searchParams }: PageProps<"/alumno/calendario">) {
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  const { t, locale } = await textos();
  const tc = t.asesorias.calendario;
  const q = await searchParams;
  const db = await leer();
  const ahora = new Date();
  const hoy = ahoraEnMexico(ahora).fecha;
  const vista = q.vista === "mes" ? "mes" : "semana";
  const fecha = fechaValida(q.fecha) ?? hoy;
  const archivados = db.cuentasAlumno.find((c) => c.id === alumno.id)?.archivados ?? {};
  const activos = alumno.cursos.filter(({ grupo }) => !archivados[grupo.id]);
  const curso = typeof q.curso === "string" && activos.some((c) => c.grupo.id === q.curso) ? q.curso : undefined;
  const cursos = activos.map(({ grupo, alumno: enCurso }) => ({ grupo, matricula: enCurso.matricula, agenda: (db.agendas ?? []).find((a) => a.profesorId === grupo.profesorId) }));
  const actividades = activos.flatMap(({ grupo }) => actividadesVisibles(db.actividades, grupo.id, ahora));
  const itemsDe = (f: string) => hoyAlumno({ cursos, asesorias: db.asesorias ?? [], actividades, fecha: f, grupoId: curso });

  const mes = fecha.slice(0, 7);
  const lunes = lunesDe(fecha);
  const fechas = vista === "mes" ? semanasDelMes(fecha).flat() : fechasSemana(lunes);
  const dias: DiaCalendario[] = fechas.map((f) => ({ fecha: f, items: itemsDe(f), delMes: vista === "semana" || f.startsWith(mes) }));
  const fmt = (f: string, o: Intl.DateTimeFormatOptions) => new Date(`${f}T12:00:00Z`).toLocaleDateString(locale, { ...o, timeZone: "UTC" });
  const titulo =
    vista === "mes"
      ? fmt(`${mes}-01`, { month: "long", year: "numeric" })
      : `${fmt(fechas[0], { day: "numeric", month: "short" })} – ${fmt(fechas[4], { day: "numeric", month: "short", year: "numeric" })}`;
  const ruta = (c: { vista?: string; fecha?: string; curso?: string | null }) => {
    const p = new URLSearchParams();
    const v = c.vista ?? vista;
    if (v === "mes") p.set("vista", "mes");
    p.set("fecha", c.fecha ?? fecha);
    const cu = c.curso === null ? undefined : (c.curso ?? curso);
    if (cu) p.set("curso", cu);
    return `/alumno/calendario?${p}`;
  };

  return (
    <>
      <Encabezado migas={[{ texto: t.alumno.panel.titulo, href: "/alumno" }]} rutaEtiqueta={t.profesor.comun.ruta} titulo={`🗓️ ${tc.titulo}`} subtitulo={tc.subtituloAlumno} />
      <CalendarioGeneral
        t={t}
        locale={locale}
        vista={vista}
        dias={dias}
        hoy={hoy}
        titulo={titulo}
        ruta={ruta}
        anterior={vista === "mes" ? mesVecino(fecha, -1) : sumarDias(lunes, -7)}
        siguiente={vista === "mes" ? mesVecino(fecha, 1) : sumarDias(lunes, 7)}
        actual={hoy}
        cursos={activos.map(({ grupo }) => ({ id: grupo.id, nombre: `${grupo.materia} · ${grupo.nombre}` }))}
        curso={curso}
      />
    </>
  );
}

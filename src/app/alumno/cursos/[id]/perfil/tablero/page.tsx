import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TableroAlumno, tarjetaTablero } from "@/components/tablero-perfil";
import { BotonLink, Encabezado } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { perfilActivo } from "@/lib/banderas";
import { PRECISION_PREDETERMINADA, creditosPorPagina } from "@/lib/configuracion";
import { alumnoEnGrupo } from "@/lib/cuentas";
import { textos } from "@/lib/i18n/servidor";
import { tieneConsentimiento } from "@/lib/perfil/consentimiento";
import { ETAPAS_CREAR, modeloDelCurso } from "@/lib/perfil/crear";
import { diagnosticoInicial, finesDeCursos } from "@/lib/perfil/diagnostico-inicial";
import { porUnidad, reporteAlumno } from "@/lib/perfil/tablero";
import { alumnoActual } from "@/lib/sesion";
import type { EtapaCrear } from "@/lib/tipos";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.tablero.titulo };
}

/**
 * Tablero del alumno (perfil CREAR, etapa 3): resumen, fortalezas, áreas y recomendaciones,
 * evolución, horario de trabajo, avance por unidad, Stroop y la ruta de mejora redactada por IA.
 * El alumno solo ve sus propios datos.
 */
export default async function TableroDelAlumno({ params }: PageProps<"/alumno/cursos/[id]/perfil/tablero">) {
  const { id } = await params;
  const alumno = await alumnoActual();
  if (!alumno) redirect("/alumno");
  if (!perfilActivo()) notFound();
  const curso = alumno.cursos.find((c) => c.grupo.id === id);
  if (!curso) notFound();
  const { grupo } = curso;
  const { t } = await textos();
  const tp = t.perfil;
  const tt = tp.tablero;
  const db = await leer();
  const base = `/alumno/cursos/${grupo.id}`;
  const consentimiento = tieneConsentimiento(db.consentimientosPerfil, alumno.id);
  const reporte = reporteAlumno(db.intentosPerfil ?? [], alumno.id, grupo.id);
  const asignatura = asignaturaDelCurso(db, grupo);
  const conTemario = asignatura && asignatura.unidades.length > 0 ? asignatura : undefined;
  const actividades = db.actividades.filter((a) => a.grupoId === grupo.id);
  const valoracion = (db.valoraciones ?? []).find((v) => v.alumnoId === alumno.id && v.grupoId === grupo.id);
  const cuenta = db.cuentasAlumno.find((c) => c.id === alumno.id);
  const fines = cuenta ? finesDeCursos(db.grupos.filter((g) => alumnoEnGrupo(g, cuenta))) : [];
  const dx = diagnosticoInicial(db, alumno.id, grupo.id, conTemario?.id, new Date(), fines);
  const modelo = modeloDelCurso(db.modelosCrear, grupo);
  const ruta = (db.rutasMejora ?? []).find((r) => r.alumnoId === alumno.id && r.grupoId === grupo.id);

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.alumno.panel.titulo, href: "/alumno" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: base },
          { texto: tp.titulo, href: `${base}/perfil` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={tt.titulo}
        subtitulo={tt.subtitulo}
      />
      <div className="mx-auto max-w-3xl">
        {!consentimiento ? (
          <section className={tarjetaTablero}>
            <p className="text-sm text-slate-700">{tt.errores.sinConsentimiento}</p>
            <BotonLink className="mt-3" href={`${base}/perfil`}>
              {tp.titulo}
            </BotonLink>
          </section>
        ) : reporte.intentos === 0 ? (
          <section className={tarjetaTablero}>
            <p className="text-sm text-slate-700">{tt.sinDatos}</p>
            <BotonLink className="mt-3" variante="secundario" href={`${base}/perfil/seguimiento`}>
              {tp.seguimiento.titulo}
            </BotonLink>
          </section>
        ) : (
          <TableroAlumno
            vista="alumno"
            grupoId={grupo.id}
            reporte={reporte}
            unidades={conTemario ? porUnidad((db.intentosPerfil ?? []).filter((x) => x.alumnoId === alumno.id && x.grupoId === grupo.id), actividades, conTemario.unidades.map((u) => u.nombre), valoracion) : null}
            stroop={dx.stroop}
            evidencias={Object.fromEntries(ETAPAS_CREAR.map((e) => [e, modelo.etapas[e].evidencias])) as Record<EtapaCrear, string>}
            titulos={new Map(actividades.map((a) => [a.id, a.titulo]))}
            ruta={ruta}
            costoRuta={creditosPorPagina(PRECISION_PREDETERMINADA)}
          />
        )}
      </div>
    </>
  );
}

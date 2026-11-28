import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TableroAlumno, tarjetaTablero } from "@/components/tablero-perfil";
import { Encabezado } from "@/components/ui";
import { grupoDe, leer } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { perfilActivo } from "@/lib/banderas";
import { PRECISION_PREDETERMINADA, creditosPorPagina } from "@/lib/configuracion";
import { textos } from "@/lib/i18n/servidor";
import { ETAPAS_CREAR, modeloDelCurso } from "@/lib/perfil/crear";
import { datosPerfilGrupo, filasDiagnostico } from "@/lib/perfil/diagnostico-inicial";
import { porUnidad, reporteAlumno } from "@/lib/perfil/tablero";
import { datosProfesor } from "@/lib/sesion";
import type { EtapaCrear } from "@/lib/tipos";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.tablero.tituloProfesor };
}

/** Tablero de un alumno para su profesor. Solo con el consentimiento vigente del alumno. */
export default async function TableroAlumnoProfesor({ params }: PageProps<"/profesor/grupos/[id]/perfil/alumnos/[matricula]">) {
  const { id, matricula: param } = await params;
  const { db } = await datosProfesor();
  if (!perfilActivo()) notFound();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const matricula = decodeURIComponent(param);
  const { t } = await textos();
  const tp = t.perfil;
  const tt = tp.tablero;
  const asignatura = asignaturaDelCurso(db, grupo);
  const conTemario = asignatura && asignatura.unidades.length > 0 ? asignatura : undefined;
  // Las cuentas y el perfil de los alumnos no vienen en los datos del profesor: se toman de la base
  // completa, pero solo de este alumno de este curso.
  const completa = await leer();
  const fila = filasDiagnostico(datosPerfilGrupo(completa, grupo), grupo, conTemario?.id, new Date()).find((f) => f.matricula === matricula);
  if (!fila) notFound();
  const con = Boolean(fila.alumnoId && fila.diagnostico?.consentimiento);
  const intentos = con ? (completa.intentosPerfil ?? []).filter((x) => x.alumnoId === fila.alumnoId && x.grupoId === grupo.id) : [];
  const reporte = reporteAlumno(intentos, fila.alumnoId ?? "", grupo.id);
  const actividades = db.actividades.filter((a) => a.grupoId === grupo.id);
  const valoracion = (completa.valoraciones ?? []).find((v) => v.alumnoId === fila.alumnoId && v.grupoId === grupo.id);
  const modelo = modeloDelCurso(db.modelosCrear, grupo);
  const ruta = con ? (completa.rutasMejora ?? []).find((r) => r.alumnoId === fila.alumnoId && r.grupoId === grupo.id) : undefined;

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: tp.profesor.titulo, href: `/profesor/grupos/${grupo.id}/perfil` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={fila.nombre}
        subtitulo={`${tt.tituloProfesor} · ${fila.matricula}. ${tt.subtituloProfesor}`}
      />
      <div className="mx-auto max-w-3xl">
        {!con ? (
          <p className={`${tarjetaTablero} text-sm text-slate-700`}>{fila.alumnoId ? tp.profesor.sinConsentimiento : tp.profesor.sinCuenta}</p>
        ) : reporte.intentos === 0 ? (
          <p className={`${tarjetaTablero} text-sm text-slate-700`}>{tt.sinDatos}</p>
        ) : (
          <TableroAlumno
            vista="profesor"
            grupoId={grupo.id}
            matricula={fila.matricula}
            reporte={reporte}
            unidades={conTemario ? porUnidad(intentos, actividades, conTemario.unidades.map((u) => u.nombre), valoracion) : null}
            stroop={fila.diagnostico!.stroop}
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

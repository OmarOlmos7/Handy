import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorReflexion } from "@/components/editor-reflexion";
import { EtapasLogro } from "@/components/etapas-logro";
import { tarjetaTablero } from "@/components/tablero-perfil";
import { Encabezado, fechaLarga } from "@/components/ui";
import { grupoDe, leer } from "@/lib/almacen";
import { asignaturaDelCurso } from "@/lib/asignaturas";
import { perfilActivo } from "@/lib/banderas";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosPerfilGrupo, filasDiagnostico } from "@/lib/perfil/diagnostico-inicial";
import { LARGO_REFLEXION, claveReflexion, porUnidadGrupo, reflexionesDelCurso, reporteGrupo } from "@/lib/perfil/tablero";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.perfil.tablero.reflexiones.titulo };
}

/**
 * Reflexiones del profesor por unidad y al cierre del curso, con el logro del grupo de cada unidad
 * a un lado para escribir con los datos a la vista.
 */
export default async function ReflexionesProfesor({ params }: PageProps<"/profesor/grupos/[id]/perfil/reflexiones">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  if (!perfilActivo()) notFound();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t, locale } = await textos();
  const tp = t.perfil;
  const tr = tp.tablero.reflexiones;
  const asignatura = asignaturaDelCurso(db, grupo);
  const unidades = asignatura?.unidades.map((u) => u.nombre) ?? [];
  const completa = await leer();
  const filas = filasDiagnostico(datosPerfilGrupo(completa, grupo), grupo, asignatura?.id, new Date());
  const ids = filas.filter((f) => f.alumnoId && f.diagnostico?.consentimiento).map((f) => f.alumnoId!);
  const intentos = (completa.intentosPerfil ?? []).filter((x) => x.grupoId === grupo.id && ids.includes(x.alumnoId));
  const actividades = db.actividades.filter((a) => a.grupoId === grupo.id);
  const logro = porUnidadGrupo(intentos, ids, grupo.id, actividades, unidades);
  const general = reporteGrupo(intentos, ids, grupo.id);
  const guardadas = reflexionesDelCurso(completa.reflexionesPerfil, grupo.id);
  const tEditor = { placeholder: tr.placeholder, guardar: tr.guardar, guardando: tr.guardando, guardado: tr.guardado, error: tr.error };
  const bloques = [
    ...unidades.map((u, i) => ({ clave: claveReflexion({ alcance: "unidad", unidad: u }), alcance: "unidad" as const, unidad: u, titulo: u, logro: logro[i] })),
    { clave: "cierre", alcance: "cierre" as const, unidad: "", titulo: tr.cierre, logro: { calificacion: general.calificacion, porEtapa: general.porEtapa, alumnos: general.alumnos } },
  ];

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: tp.profesor.titulo, href: `/profesor/grupos/${grupo.id}/perfil` },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={tr.titulo}
        subtitulo={tr.subtitulo}
      />
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-sm text-slate-600">{formato(tr.escritas, { n: bloques.filter((b) => guardadas.has(b.clave)).length, t: bloques.length })}</p>
        {unidades.length === 0 && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">{tp.tablero.sinTemario}</p>}
        {bloques.map((b) => {
          const r = guardadas.get(b.clave);
          const conDatos = Object.keys(b.logro.porEtapa).length > 0;
          return (
            <section key={b.clave} className={`${tarjetaTablero} grid gap-4 lg:grid-cols-[1fr_18rem]`}>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">{b.titulo}</h2>
                <p className="mb-2 text-xs text-slate-500">{r ? formato(tr.actualizada, { f: fechaLarga(r.actualizadoEn.slice(0, 10), locale) }) : tr.sinReflexion}</p>
                <EditorReflexion grupoId={grupo.id} alcance={b.alcance} unidad={b.unidad} inicial={r?.texto ?? ""} largo={LARGO_REFLEXION} t={tEditor} />
              </div>
              <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <p className="mb-2 text-xs font-medium text-slate-600">
                  {conDatos && b.logro.calificacion !== null ? formato(tr.logroUnidad, { c: b.logro.calificacion, n: b.logro.alumnos }) : tr.sinLogro}
                </p>
                {conDatos && <EtapasLogro porEtapa={b.logro.porEtapa} nombres={tp.crear.etapas} sinDatos={tp.seguimiento.sinDatosEtapa} compacto unaColumna />}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

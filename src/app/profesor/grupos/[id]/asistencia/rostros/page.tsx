import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RegistroRostros } from "@/components/asistencia-foto";
import { BorrarTodosLosRostros, ConsentimientosRostro } from "@/components/consentimientos-rostro";
import { Encabezado, Tarjeta } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { fechaCorta } from "@/lib/asesorias-vista";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.asistencia.rostros.meta };
}

/**
 * Registro de rostros para tomar asistencia con foto: 1) consentimiento firmado de cada alumno,
 * 2) foto inicial con los rostros numerados y un alumno por número, 3) quién ya está registrado.
 */
export default async function RostrosCurso({ params }: PageProps<"/profesor/grupos/[id]/asistencia/rostros">) {
  const { id } = await params;
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo) notFound();
  const { t, locale } = await textos();
  const ta = t.asistencia;
  const tr = ta.rostros;
  const rostros = new Map((db.rostros ?? []).filter((r) => r.grupoId === grupo.id).map((r) => [r.matricula, r]));
  const alumnos = [...grupo.alumnos].sort((a, b) => a.nombre.localeCompare(b.nombre, locale));
  const filas = alumnos.map((a) => {
    const r = rostros.get(a.matricula);
    return {
      matricula: a.matricula,
      nombre: a.nombre,
      consentimiento: r?.consentimiento ? fechaCorta(r.consentimiento.slice(0, 10), locale) : undefined,
      fotos: r?.descriptores.length ?? 0,
    };
  });
  const consentidos = filas.filter((f) => f.consentimiento).map((f) => f.matricula);
  const registrados = filas.filter((f) => f.fotos > 0).length;
  const base = `/profesor/grupos/${grupo.id}/asistencia`;

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: ta.meta, href: base },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={`🙂 ${tr.meta}`}
        subtitulo={tr.subtitulo}
      />
      <p className="mb-5 max-w-3xl rounded-xl bg-tinta-50 px-4 py-3 text-sm text-tinta-900">🔒 {tr.queGuarda}</p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900">{tr.paso1}</h2>
        <p className="mt-1 mb-3 max-w-3xl text-sm text-slate-600">{tr.paso1Texto}</p>
        <Link
          href={`${base}/consentimiento`}
          className="mb-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50"
        >
          🖨️ {tr.formato}
        </Link>
        <ConsentimientosRostro grupoId={grupo.id} filas={filas} />
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900">{tr.paso2}</h2>
        <p className="mt-1 mb-3 max-w-3xl text-sm text-slate-600">{tr.paso2Texto}</p>
        <Tarjeta className="!p-4">
          {consentidos.length ? (
            <RegistroRostros grupoId={grupo.id} alumnos={alumnos.map((a) => ({ matricula: a.matricula, nombre: a.nombre }))} consentidos={consentidos} />
          ) : (
            <p className="text-sm text-slate-500">{tr.primeroConsentimiento}</p>
          )}
        </Tarjeta>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">{tr.paso3}</h2>
        <p className="mt-1 text-sm text-slate-700">{formato(tr.registrados, { n: registrados, total: alumnos.length })}</p>
        <p className="mt-1 text-xs text-slate-500">{tr.archivar}</p>
        {registrados > 0 && (
          <p className="mt-3">
            <BorrarTodosLosRostros grupoId={grupo.id} />
          </p>
        )}
      </section>
    </>
  );
}

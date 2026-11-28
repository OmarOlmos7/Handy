import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TomarAsistencia } from "@/components/asistencia";
import { Encabezado } from "@/components/ui";
import { grupoDe } from "@/lib/almacen";
import { ahoraEnMexico, asuetoDeAgenda } from "@/lib/asesorias";
import { fechaCorta } from "@/lib/asesorias-vista";
import { horaTexto, leerIdSesion, registroDe, sesionesDelCurso } from "@/lib/asistencia";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";
import type { EstadoAsistencia } from "@/lib/tipos";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.asistencia.sesion.meta };
}

/** Lista de asistencia de una sesión: a mano o con la foto del grupo. */
export default async function SesionAsistencia({ params, searchParams }: PageProps<"/profesor/grupos/[id]/asistencia/[sesion]">) {
  const { id, sesion } = await params;
  const { fin: finPedido } = await searchParams;
  const s = leerIdSesion(sesion);
  const { db } = await datosProfesor();
  const grupo = grupoDe(db, id);
  if (!grupo || !s) notFound();
  const { t, locale } = await textos();
  const ta = t.asistencia;
  const { fecha: hoy } = ahoraEnMexico();
  const registros = db.asistencias ?? [];
  const registro = registroDe(registros, grupo.id, s.fecha, s.inicio);
  const agenda = (db.agendas ?? [])[0];
  // ¿Es una sesión del horario? Si no, es una sesión extra: termina a la hora pedida (o una hora después).
  const delHorario = sesionesDelCurso({ ...grupo, inicio: s.fecha, fin: s.fecha }, hoy, [], (f) => asuetoDeAgenda(agenda, f)).find((x) => x.inicio === s.inicio);
  const pedido = Number(finPedido);
  const fin = registro?.fin ?? delHorario?.fin ?? (Number.isInteger(pedido) && pedido > s.inicio && pedido <= 1440 ? pedido : Math.min(1440, s.inicio + 60));
  const alumnos = [...grupo.alumnos].sort((a, b) => a.nombre.localeCompare(b.nombre, locale)).map((a) => ({ matricula: a.matricula, nombre: a.nombre }));
  const marcas: Record<string, EstadoAsistencia> = Object.fromEntries((registro?.marcas ?? []).map((m) => [m.matricula, m.estado]));
  const rostros = (db.rostros ?? []).filter((r) => r.grupoId === grupo.id);
  const base = `/profesor/grupos/${grupo.id}/asistencia`;
  const dia = ta.dias[(new Date(`${s.fecha}T12:00:00Z`).getUTCDay() + 6) % 7];

  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          { texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` },
          { texto: ta.meta, href: base },
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={formato(ta.sesion.titulo, { fecha: `${dia} ${fechaCorta(s.fecha, locale)}` })}
        subtitulo={
          <>
            {grupo.materia} · {grupo.nombre} · {formato(ta.sesion.horas, { inicio: horaTexto(s.inicio), fin: horaTexto(fin) })}
            {delHorario?.asueto && <span className="ml-2 text-aviso">{formato(ta.curso.asueto, { nombre: delHorario.asueto })}</span>}
          </>
        }
      />
      <TomarAsistencia
        grupoId={grupo.id}
        sesion={sesion}
        inicio={s.inicio}
        fin={fin}
        editarHoras={!delHorario && !registro}
        alumnos={alumnos}
        marcas={marcas}
        guardado={registro ? { fecha: new Date(registro.actualizadoEn).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }), metodo: registro.metodo } : undefined}
        hayRostros={rostros.some((r) => r.consentimiento && r.descriptores.length)}
        consentidos={rostros.filter((r) => r.consentimiento).map((r) => r.matricula)}
        rutaRostros={`${base}/rostros`}
        rutaVolver={base}
      />
    </>
  );
}

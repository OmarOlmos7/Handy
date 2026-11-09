import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado, Insignia, colorCalificacion, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { calificacion } from "@/lib/estadisticas";

export const metadata: Metadata = { title: "Mis actividades" };

const MATRICULA_DEMO = "A0231";

export default async function PanelAlumno({ searchParams }: PageProps<"/alumno">) {
  const { m } = await searchParams;
  const matricula = typeof m === "string" ? m : MATRICULA_DEMO;
  const db = await leer();
  const grupos = db.grupos.filter((g) => g.alumnos.some((a) => a.matricula === matricula));
  const alumno = grupos[0]?.alumnos.find((a) => a.matricula === matricula);
  const actividades = db.actividades.filter((a) => grupos.some((g) => g.id === a.grupoId));
  const q = matricula === MATRICULA_DEMO ? "" : `?m=${encodeURIComponent(matricula)}`;
  return (
    <>
      <Encabezado titulo="Mis actividades" subtitulo={`${alumno ? `${alumno.nombre} · ` : ""}Aquí aparecen tus reportes cuando tu profesor los aprueba.`} />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <ul className="divide-y divide-slate-100">
          {actividades.map((a) => {
            const e = db.entregas.find((x) => x.actividadId === a.id && x.matricula === matricula);
            const g = grupos.find((x) => x.id === a.grupoId)!;
            const publicada = e?.estado === "aprobada";
            const contenido = (
              <>
                <div className="flex-1">
                  <p className="font-medium">{a.titulo}</p>
                  <p className="text-sm text-slate-500">
                    {g.materia} · {g.nombre} · {fechaLarga(a.fechaAplicacion)}
                  </p>
                </div>
                {publicada ? (
                  <span className={`text-xl font-semibold ${colorCalificacion(calificacion(a, e!))}`}>
                    {calificacion(a, e!).toFixed(1)}
                  </span>
                ) : e && e.estado !== "sin_entregar" ? (
                  <Insignia tono="azul">En revisión del profesor</Insignia>
                ) : (
                  <Link href={`/entregar/${a.id}?m=${encodeURIComponent(matricula)}`} className="text-sm font-medium text-tinta-700 hover:underline">Entregar fotos</Link>
                )}
              </>
            );
            return (
              <li key={a.id}>
                {publicada ? (
                  <Link href={`/alumno/reporte/${a.id}${q}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                    {contenido}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-4">{contenido}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-4 text-sm text-slate-500">Para entregar una actividad, escanea el código QR de tu hoja con el celular y toma fotos de tus páginas.</p>
    </>
  );
}

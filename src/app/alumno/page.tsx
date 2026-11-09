import type { Metadata } from "next";
import Link from "next/link";
import { Encabezado, Insignia, colorCalificacion, fechaLarga } from "@/components/ui";
import { actividades, obtenerEntrega, obtenerGrupo } from "@/lib/datos-ejemplo";
import { calificacion } from "@/lib/estadisticas";

export const metadata: Metadata = { title: "Mis actividades" };

const MATRICULA_DEMO = "A0231";

export default function PanelAlumno() {
  return (
    <>
      <Encabezado titulo="Mis actividades" subtitulo="Aquí aparecen tus reportes cuando tu profesor los aprueba." />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <ul className="divide-y divide-slate-100">
          {actividades.map((a) => {
            const e = obtenerEntrega(a.id, MATRICULA_DEMO);
            const g = obtenerGrupo(a.grupoId)!;
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
                  <Insignia tono="ambar">Pendiente de escanear</Insignia>
                )}
              </>
            );
            return (
              <li key={a.id}>
                {publicada ? (
                  <Link href={`/alumno/reporte/${a.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
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
      <p className="mt-4 text-sm text-slate-500">Para entregar una actividad, escanea tus hojas con la app móvil de Retroalimenta.</p>
    </>
  );
}

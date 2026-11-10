import type { Metadata } from "next";
import Link from "next/link";
import { entrarAlumno } from "@/app/acciones-cuenta";
import { campo } from "@/components/nueva-actividad";
import { InstalarApp } from "@/components/instalar-app";
import { Boton, Encabezado, Insignia, colorCalificacion, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { calificacion } from "@/lib/estadisticas";
import { alumnoActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis actividades" };

export default async function PanelAlumno({ searchParams }: PageProps<"/alumno">) {
  const alumno = await alumnoActual();
  if (!alumno) {
    const { error } = await searchParams;
    return (
      <div className="mx-auto max-w-md">
        <Encabezado titulo="Mis actividades" subtitulo="No necesitas cuenta. Entra con el ID de curso que te dio tu profesor y tu matrícula." />
        <form action={entrarAlumno} className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <label className="block text-sm font-medium text-slate-700">
            ID de curso
            <input name="curso" required className={`${campo} font-mono uppercase`} placeholder="Ej. FIS-7K2Q" autoCapitalize="characters" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Matrícula
            <input name="matricula" required className={`${campo} font-mono uppercase`} placeholder="Ej. A0301" autoCapitalize="characters" />
          </label>
          {typeof error === "string" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{error}</p>}
          <Boton type="submit" className="w-full">
            Ver mis actividades
          </Boton>
        </form>
        <InstalarApp />
        <p className="mt-4 text-sm text-slate-500">
          Para entregar una actividad, escanea el código QR de tu hoja con el celular y toma fotos de tus páginas.
        </p>
      </div>
    );
  }

  const { grupo, matricula } = alumno;
  const db = await leer();
  const actividades = db.actividades.filter((a) => a.grupoId === grupo.id);
  return (
    <>
      <Encabezado
        titulo="Mis actividades"
        subtitulo={`${alumno.nombre} · ${grupo.materia} ${grupo.nombre}. Aquí aparecen tus reportes cuando tu profesor los aprueba.`}
      />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <ul className="divide-y divide-slate-100">
          {actividades.length === 0 && <li className="px-5 py-4 text-sm text-slate-500">Tu profesor aún no publica actividades.</li>}
          {actividades.map((a) => {
            const e = db.entregas.find((x) => x.actividadId === a.id && x.matricula === matricula);
            const publicada = e?.estado === "aprobada";
            const contenido = (
              <>
                <div className="flex-1">
                  <p className="font-medium">{a.titulo}</p>
                  <p className="text-sm text-slate-500">{fechaLarga(a.fechaAplicacion)}</p>
                </div>
                {publicada ? (
                  <span className={`text-xl font-semibold ${colorCalificacion(calificacion(a, e!))}`}>
                    {calificacion(a, e!).toFixed(1)}
                  </span>
                ) : e && e.estado !== "sin_entregar" ? (
                  <Insignia tono="azul">En revisión del profesor</Insignia>
                ) : (
                  <Link href={`/entregar/${a.id}`} className="text-sm font-medium text-tinta-700 hover:underline">
                    Entregar fotos
                  </Link>
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
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ingresarAlumno, registrarAlumno } from "@/app/acciones-cuenta";
import { InstalarApp } from "@/components/instalar-app";
import { Boton, Encabezado, Insignia, campo, colorCalificacion, fechaLarga } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { calificacion, escalaDe, formatoCal } from "@/lib/estadisticas";
import { fechaHoraLarga, resultadosDisponibles } from "@/lib/resultados";
import { alumnoActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Mis actividades" };

export default async function PanelAlumno({ searchParams }: PageProps<"/alumno">) {
  const alumno = await alumnoActual();
  if (!alumno) {
    const { error, crear } = await searchParams;
    const creando = crear === "1";
    return (
      <div className="mx-auto max-w-md">
        <Encabezado
          titulo="Mis actividades"
          subtitulo={
            creando
              ? "Crea tu cuenta con tu correo y una clave de acceso. Solo tú podrás ver tus resultados."
              : "Entra con tu correo y tu clave de acceso para ver tus resultados."
          }
        />
        {creando ? (
          <form action={registrarAlumno} className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <label className="block text-sm font-medium text-slate-700">
              Nombre completo
              <input name="nombre" required autoComplete="name" className={campo} placeholder="Ej. Ana López Ruiz" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Matrícula
              <input name="matricula" required className={`${campo} font-mono uppercase`} placeholder="Ej. A0301" autoCapitalize="characters" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Correo
              <input name="correo" type="email" required autoComplete="email" className={campo} placeholder="tu@correo.com" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Clave de acceso (mínimo 6 caracteres)
              <input name="clave" type="password" required minLength={6} autoComplete="new-password" className={campo} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Repite tu clave de acceso
              <input name="clave2" type="password" required minLength={6} autoComplete="new-password" className={campo} />
            </label>
            {typeof error === "string" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{error}</p>}
            <Boton type="submit" className="w-full">
              Crear mi cuenta
            </Boton>
            <p className="text-center text-sm text-slate-600">
              ¿Ya tienes cuenta?{" "}
              <Link href="/alumno" className="font-medium text-tinta-700 hover:underline">
                Entra aquí
              </Link>
            </p>
          </form>
        ) : (
          <form action={ingresarAlumno} className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <label className="block text-sm font-medium text-slate-700">
              Correo
              <input name="correo" type="email" required autoComplete="email" className={campo} placeholder="tu@correo.com" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Clave de acceso
              <input name="clave" type="password" required autoComplete="current-password" className={campo} />
            </label>
            {typeof error === "string" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{error}</p>}
            <Boton type="submit" className="w-full">
              Ver mis resultados
            </Boton>
            <p className="text-center text-sm text-slate-600">
              ¿Primera vez?{" "}
              <Link href="/alumno?crear=1" className="font-medium text-tinta-700 hover:underline">
                Crea tu cuenta
              </Link>
            </p>
          </form>
        )}
        <InstalarApp />
        <p className="mt-4 text-sm text-slate-500">
          Para entregar una actividad, escanea el código QR de tu hoja con el celular y toma fotos de tus páginas. Si aún no
          tienes cuenta, la creas ahí mismo al entregar.
        </p>
      </div>
    );
  }

  const db = await leer();
  const actividades = alumno.cursos.flatMap(({ grupo, alumno: enCurso }) =>
    db.actividades.filter((a) => a.grupoId === grupo.id).map((a) => ({ a, grupo, matricula: enCurso.matricula })),
  );
  return (
    <>
      <Encabezado
        titulo="Mis actividades"
        subtitulo={`${alumno.nombre} · ${alumno.correo}. Aquí aparecen tus resultados cuando tu profesor los aprueba y llega la fecha de visualización.`}
      />
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <ul className="divide-y divide-slate-100">
          {actividades.length === 0 && (
            <li className="px-5 py-4 text-sm text-slate-500">
              Aún no tienes actividades. Aparecerán aquí después de tu primera entrega.
            </li>
          )}
          {actividades.map(({ a, grupo, matricula }) => {
            const e = db.entregas.find((x) => x.actividadId === a.id && x.matricula === matricula);
            const aprobada = e?.estado === "aprobada";
            const disponible = resultadosDisponibles(a);
            const publicada = aprobada && disponible;
            const contenido = (
              <>
                <div className="flex-1">
                  <p className="font-medium">{a.titulo}</p>
                  <p className="text-sm text-slate-500">
                    {grupo.materia} · {fechaLarga(a.fechaAplicacion)}
                  </p>
                  {a.resultadosDesde && (
                    <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-tinta-50 px-2 py-0.5 text-xs font-medium text-tinta-700">
                      Fecha de visualización de resultados: {fechaHoraLarga(a.resultadosDesde)}
                    </p>
                  )}
                </div>
                {publicada ? (
                  <span className={`text-xl font-semibold ${colorCalificacion(calificacion(a, e!), escalaDe(a))}`}>
                    {formatoCal(calificacion(a, e!), escalaDe(a))}
                    <span className="text-sm font-normal text-slate-400"> / {escalaDe(a)}</span>
                  </span>
                ) : aprobada ? (
                  <Insignia tono="ambar">Resultados listos a partir de la fecha indicada</Insignia>
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

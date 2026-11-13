import type { Metadata } from "next";
import Link from "next/link";
import {
  BotonLink,
  Encabezado,
  InsigniaActividad,
  Tarjeta,
  colorCalificacion,
  fechaLarga,
} from "@/components/ui";
import { entregasDe, estadoActividad, saldo } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";
import { reporteGrupo } from "@/lib/estadisticas";

export const metadata: Metadata = { title: "Panel del profesor" };

export default async function PanelProfesor() {
  const { db, profesor } = await datosProfesor();
  const { grupos } = db;
  const saldoCreditos = saldo(db);
  const actividadesDeGrupo = (id: string) => db.actividades.filter((a) => a.grupoId === id);
  const porRevisar = db.actividades.filter((a) => estadoActividad(db, a) === "en_revision");

  return (
    <>
      <Encabezado
        titulo={`Hola, ${profesor.nombre.split(" ")[0]}`}
        subtitulo={
          porRevisar.length
            ? `Tienes ${porRevisar.length} ${porRevisar.length === 1 ? "actividad lista" : "actividades listas"} para revisar.`
            : "No tienes actividades pendientes de revisión."
        }
        acciones={
          <>
            <BotonLink href="/profesor/grupos/nuevo" variante="secundario">+ Nuevo curso</BotonLink>
            <BotonLink href="/profesor/actividades/nueva">+ Nueva actividad</BotonLink>
          </>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Tarjeta>
          <p className="text-sm text-slate-500">Cursos</p>
          <p className="mt-1 text-3xl font-semibold">{grupos.length}</p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm text-slate-500">Alumnos</p>
          <p className="mt-1 text-3xl font-semibold">{grupos.reduce((s, g) => s + g.alumnos.length, 0)}</p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm text-slate-500">Créditos disponibles</p>
          <p className="mt-1 text-3xl font-semibold">{saldoCreditos}</p>
          <Link href="/profesor/creditos" className="text-sm text-tinta-700 hover:underline">
            Comprar más
          </Link>
        </Tarjeta>
      </div>

      {grupos.length === 0 && (
        <Tarjeta className="text-sm text-slate-600">
          Aún no tienes cursos. Crea tu primer curso. La lista de alumnos es opcional: cada alumno se registra al
          entregar su primera actividad con su nombre, matrícula, correo y una clave de acceso para ver sus resultados.{" "}
          <Link href="/profesor/grupos/nuevo" className="text-tinta-700 hover:underline">
            Crear curso
          </Link>
        </Tarjeta>
      )}

      <div className="space-y-8">
        {grupos.map((g) => {
          const acts = actividadesDeGrupo(g.id);
          return (
            <section key={g.id}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">
                  {g.materia} · {g.nombre}
                </h2>
                <span className="text-sm text-slate-500">
                  {g.alumnos.length} alumnos · ciclo {g.ciclo}
                </span>
              </div>
              {acts.length === 0 ? (
                <Tarjeta className="text-sm text-slate-500">
                  Aún no hay actividades en este grupo.{" "}
                  <Link href="/profesor/actividades/nueva" className="text-tinta-700 hover:underline">
                    Crea la primera
                  </Link>
                  .
                </Tarjeta>
              ) : (
                <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <ul className="divide-y divide-slate-100">
                    {acts.map((a) => {
                      const rep = reporteGrupo(a, entregasDe(db, a.id), g.alumnos);
                      return (
                        <li key={a.id}>
                          <Link
                            href={`/profesor/actividades/${a.id}`}
                            className="flex flex-col gap-2 px-5 py-4 hover:bg-slate-50 sm:flex-row sm:items-center"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{a.titulo}</p>
                              <p className="text-sm text-slate-500">
                                Aplicada {fechaLarga(a.fechaAplicacion)} · {a.paginas} páginas
                              </p>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-slate-500">
                                {rep.entregadas}/{g.alumnos.length} entregas
                              </span>
                              {rep.entregadas > 0 && (
                                <span className={`font-semibold ${colorCalificacion(rep.promedio, rep.escala)}`}>
                                  Prom. {rep.promedio} / {rep.escala}
                                </span>
                              )}
                              <InsigniaActividad estado={estadoActividad(db, a)} />
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

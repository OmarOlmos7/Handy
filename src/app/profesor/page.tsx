import type { Metadata } from "next";
import Link from "next/link";
import { TarjetaCurso } from "@/components/tarjeta-curso";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { estadoActividad, saldo } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";

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

      {grupos.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">Mis cursos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grupos.map((g) => (
              <TarjetaCurso
                key={g.id}
                id={g.id}
                materia={g.materia}
                nombre={g.nombre}
                ciclo={g.ciclo}
                actividades={actividadesDeGrupo(g.id).length}
                alumnos={new Set(g.alumnos.map((a) => a.matricula)).size}
                porRevisar={porRevisar.filter((a) => a.grupoId === g.id).length}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

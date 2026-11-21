import type { Metadata } from "next";
import Link from "next/link";
import { TarjetaCurso } from "@/components/tarjeta-curso";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { estadoActividad, saldo } from "@/lib/almacen";
import { agruparPorColor } from "@/lib/colores";
import { datosProfesor } from "@/lib/sesion";
import { formato } from "@/lib/i18n/idiomas";
import { resumenTemario } from "@/lib/asignaturas";
import { textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.panel.meta };
}

export default async function PanelProfesor() {
  const { db, profesor } = await datosProfesor();
  const { t, locale } = await textos();
  const tp = t.profesor.panel;
  const { grupos } = db;
  const asignaturas = db.asignaturas ?? [];
  const saldoCreditos = saldo(db);
  const actividadesDeGrupo = (id: string) => db.actividades.filter((a) => a.grupoId === id);
  const porRevisar = db.actividades.filter((a) => estadoActividad(db, a) === "en_revision");

  return (
    <>
      <Encabezado
        titulo={formato(tp.hola, { nombre: profesor.nombre.split(" ")[0] })}
        subtitulo={
          porRevisar.length
            ? formato(porRevisar.length === 1 ? tp.porRevisar1 : tp.porRevisarN, { n: porRevisar.length })
            : tp.sinPendientes
        }
        acciones={
          <>
            <BotonLink href="/profesor/grupos/nuevo" variante="secundario">{tp.nuevoCurso}</BotonLink>
            <BotonLink href="/profesor/actividades/nueva">{tp.nuevaActividad}</BotonLink>
          </>
        }
      />

      {/* A la izquierda, el acceso a Asignaturas (el syllabus de cada materia). */}
      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-6">
      <aside className="mb-6 lg:sticky lg:top-4 lg:mb-0">
        <Link
          href="/profesor/asignaturas"
          className="flex items-center gap-3 rounded-xl bg-tinta-600 px-4 py-3 text-white shadow-sm transition hover:bg-tinta-700"
        >
          <span className="text-2xl" aria-hidden>
            📚
          </span>
          <span>
            <span className="block font-semibold">{tp.asignaturas}</span>
            <span className="block text-xs text-tinta-100">{tp.asignaturasTexto}</span>
          </span>
        </Link>
        {asignaturas.length > 0 && (
          <ul className="mt-2 hidden space-y-1 lg:block">
            {asignaturas.slice(0, 8).map((a) => (
              <li key={a.id}>
                <Link href={`/profesor/asignaturas/${a.id}`} className="block rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-white hover:shadow-sm">
                  <span className="block truncate font-medium">{a.nombre}</span>
                  <span className="block text-xs text-slate-500">{formato(tp.unidadesTemas, { u: resumenTemario(a.unidades).unidades, t: resumenTemario(a.unidades).temas })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <div className="min-w-0">
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Tarjeta>
          <p className="text-sm text-slate-500">{tp.cursos}</p>
          <p className="mt-1 text-3xl font-semibold">{grupos.length}</p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm text-slate-500">{t.profesor.comun.alumnos}</p>
          <p className="mt-1 text-3xl font-semibold">{grupos.reduce((s, g) => s + g.alumnos.length, 0)}</p>
        </Tarjeta>
        <Tarjeta>
          <p className="text-sm text-slate-500">{tp.creditosDisponibles}</p>
          <p className="mt-1 text-3xl font-semibold">{saldoCreditos.toLocaleString(locale)}</p>
          <Link href="/profesor/creditos" className="text-sm text-tinta-700 hover:underline">
            {tp.comprarMas}
          </Link>
        </Tarjeta>
      </div>

      {grupos.length === 0 && (
        <Tarjeta className="text-sm text-slate-600">
          {tp.sinCursos}{" "}
          <Link href="/profesor/grupos/nuevo" className="text-tinta-700 hover:underline">
            {tp.crearCurso}
          </Link>
        </Tarjeta>
      )}

      {grupos.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold">{tp.misCursos}</h2>
          <div className="space-y-6">
            {agruparPorColor(grupos).map(({ color, items }, _i, todos) => (
              <section key={color?.clave ?? "sin-color"}>
                {/* Con un solo grupo sin color no hace falta encabezado. */}
                {(todos.length > 1 || color) && (
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <span className={`h-3 w-3 rounded-full ${color ? color.punto : "border-2 border-dashed border-slate-400"}`} />
                    {color ? t.profesor.comun.nombresColores[color.clave as keyof typeof t.profesor.comun.nombresColores] : t.profesor.comun.sinColor}
                  </h3>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((g) => (
                    <TarjetaCurso
                      key={g.id}
                      id={g.id}
                      materia={g.materia}
                      nombre={g.nombre}
                      ciclo={g.ciclo}
                      color={g.color}
                      actividades={actividadesDeGrupo(g.id).length}
                      alumnos={new Set(g.alumnos.map((a) => a.matricula)).size}
                      porRevisar={porRevisar.filter((a) => a.grupoId === g.id).length}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { ActividadesHoy } from "@/components/actividades-hoy";
import { TarjetaCurso } from "@/components/tarjeta-curso";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { estadoActividad, leer, saldo } from "@/lib/almacen";
import { sinLeerProfesor } from "@/lib/avisos";
import { resumenAsesorias } from "@/lib/asesorias";
import { textoPeriodo } from "@/lib/asesorias-vista";
import { agruparPorColor } from "@/lib/colores";
import { datosProfesor } from "@/lib/sesion";
import { formato } from "@/lib/i18n/idiomas";
import { ipDeCabeceras, textos } from "@/lib/i18n/servidor";
import { hoyProfesor } from "@/lib/agenda-hoy";
import { diaLargoLocal } from "@/lib/asesorias-vista";
import { ahoraEnMexico } from "@/lib/asesorias";
import { paisDeIp } from "@/lib/clima-servidor";
import { proyectosComoEvaluador } from "@/lib/proyectos-servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.profesor.panel.meta };
}

export default async function PanelProfesor() {
  const { db, profesor } = await datosProfesor();
  const { t, locale } = await textos();
  const tp = t.profesor.panel;
  // Los cursos archivados no salen en el panel; se ven y desarchivan en Configuración.
  const grupos = db.grupos.filter((g) => !g.archivado);
  const archivados = db.grupos.length - grupos.length;
  const ta = t.archivados;
  const saldoCreditos = saldo(db);
  const actividadesDeGrupo = (id: string) => db.actividades.filter((a) => a.grupoId === id);
  const porRevisar = db.actividades.filter((a) => estadoActividad(db, a) === "en_revision");
  // Proyectos de otros profesores donde me invitaron a evaluar.
  const comoEvaluador = proyectosComoEvaluador(await leer(), profesor.id);
  const tpr = t.proyecto;
  // "Actividades de hoy": agenda, asesorías y cierres de entrega de los cursos activos.
  const agenda = (db.agendas ?? [])[0];
  const pais = agenda?.pais ?? (await paisDeIp(ipDeCabeceras(await headers())));
  const hoy = hoyProfesor({
    agenda: agenda && { ...agenda, pais },
    asesorias: db.asesorias ?? [],
    actividades: db.actividades,
    grupos,
    etiquetas: new Map((agenda?.etiquetas ?? []).map((e) => [e.id, e.nombre])),
  });

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

      {/* Los cursos al centro; a la derecha (arriba en pantallas angostas), lo que toca hoy. */}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start xl:gap-6">
      {/* A la derecha (arriba en el teléfono), lo que toca hoy. */}
      <aside className="mb-6 xl:sticky xl:top-4 xl:col-start-2 xl:row-start-1 xl:mb-0">
        <ActividadesHoy items={hoy} t={t} fecha={diaLargoLocal(ahoraEnMexico().fecha, locale)} agendaHref="/profesor/agenda" />
      </aside>
      <div className="min-w-0 xl:col-start-1 xl:row-start-1">
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

      {comoEvaluador.length > 0 && (
        <section className="mb-8" aria-labelledby="como-evaluador">
          <h2 id="como-evaluador" className="text-lg font-semibold">
            🛠️ {tpr.dondeEvaluas}
          </h2>
          <p className="mb-3 text-sm text-slate-500">{tpr.dondeEvaluasNota}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comoEvaluador.map(({ proyecto, grupo, dueno }) => (
              <Link key={proyecto.id} href={`/profesor/proyectos/${proyecto.id}`} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:ring-tinta-300">
                <span className="block font-semibold text-slate-900">{proyecto.titulo}</span>
                <span className="mt-0.5 block text-sm text-slate-600">
                  {grupo.materia} · {grupo.nombre}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {formato(tpr.deProfesor, { nombre: dueno })} · {formato(tpr.cerradasDe, { c: proyecto.etapas.filter((e) => e.cerradaEn).length, n: proyecto.etapas.length })}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {grupos.length === 0 && archivados === 0 && (
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
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4">
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
                      avisosSinLeer={sinLeerProfesor(db.avisos ?? [], g.id)}
                      inicio={g.inicio}
                      fin={g.fin}
                      periodo={textoPeriodo(t.asesorias, g.inicio, g.fin, locale)}
                      asesorias={resumenAsesorias(db.asesorias ?? [], g)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
      {archivados > 0 && (
        <p className="mt-6 text-sm">
          <Link href="/profesor/configuracion?archivados=1#archivados" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-tinta-700 hover:underline">
            🗄️ {archivados === 1 ? ta.verArchivados1 : formato(ta.verArchivadosN, { n: archivados })} →
          </Link>
        </p>
      )}
      </div>
      </div>
    </>
  );
}

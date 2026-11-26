// Encabezado de las vistas de un proyecto para el profesor: título, curso y pestañas
// (Evaluación, Modelo del proyecto y Calificaciones; las dos últimas solo para el profesor del curso).
import Link from "next/link";
import { Encabezado } from "./ui";
import { formato } from "@/lib/i18n/idiomas";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { evaluadoresDe } from "@/lib/proyectos";
import type { Grupo, Proyecto } from "@/lib/tipos";

export type PestanaProyecto = "evaluacion" | "modelo" | "concentrado";

export function EncabezadoProyecto({
  t,
  proyecto,
  grupo,
  esDueno,
  activa,
}: {
  t: Diccionario;
  proyecto: Proyecto;
  grupo: Grupo;
  esDueno: boolean;
  activa: PestanaProyecto;
}) {
  const tp = t.proyecto;
  const n = proyecto.etapas.length;
  const ev = evaluadoresDe(proyecto).length;
  const cerradas = proyecto.etapas.filter((e) => e.cerradaEn).length;
  const pestanas: { clave: PestanaProyecto; href: string }[] = [
    { clave: "evaluacion", href: `/profesor/proyectos/${proyecto.id}` },
    ...(esDueno
      ? [
          { clave: "modelo" as const, href: `/profesor/proyectos/${proyecto.id}/modelo` },
          { clave: "concentrado" as const, href: `/profesor/proyectos/${proyecto.id}/calificaciones` },
        ]
      : []),
  ];
  return (
    <>
      <Encabezado
        migas={[
          { texto: t.profesor.comun.panel, href: "/profesor" },
          ...(esDueno ? [{ texto: `${grupo.materia} · ${grupo.nombre}`, href: `/profesor/grupos/${grupo.id}` }] : []),
        ]}
        rutaEtiqueta={t.profesor.comun.ruta}
        titulo={`🛠️ ${proyecto.titulo}`}
        subtitulo={[
          esDueno ? undefined : `${grupo.materia} · ${grupo.nombre}`,
          formato(n === 1 ? tp.etapas1 : tp.etapasN, { n }),
          formato(ev === 1 ? tp.evaluadores1 : tp.evaluadoresN, { n: ev }),
          formato(tp.cerradasDe, { c: cerradas, n }),
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <nav className="no-imprimir mb-5 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label={tp.chip}>
        {pestanas.map((p) => (
          <Link
            key={p.clave}
            href={p.href}
            aria-current={p.clave === activa ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition ${
              p.clave === activa ? "border-tinta-600 text-tinta-700" : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {tp.pestanas[p.clave]}
          </Link>
        ))}
      </nav>
      {!esDueno && <p className="mb-4 rounded-lg bg-tinta-50 px-4 py-2 text-sm text-tinta-700">{tp.invitado}</p>}
    </>
  );
}

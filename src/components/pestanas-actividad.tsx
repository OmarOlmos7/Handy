import Link from "next/link";

export function PestanasActividad({
  id,
  activa,
}: {
  id: string;
  activa: "entregas" | "rubrica" | "reporte";
}) {
  const pestanas = [
    { clave: "entregas", texto: "Entregas", href: `/profesor/actividades/${id}` },
    { clave: "rubrica", texto: "Solución y rúbrica", href: `/profesor/actividades/${id}/rubrica` },
    { clave: "reporte", texto: "Reporte del grupo", href: `/profesor/actividades/${id}/reporte` },
  ] as const;
  return (
    <nav className="no-imprimir mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 text-sm" aria-label="Secciones de la actividad">
      {pestanas.map((p) => (
        <Link
          key={p.clave}
          href={p.href}
          aria-current={p.clave === activa ? "page" : undefined}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 ${
            p.clave === activa
              ? "border-tinta-600 font-medium text-tinta-700"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          {p.texto}
        </Link>
      ))}
    </nav>
  );
}

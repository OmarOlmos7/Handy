// Pestañas para elegir el tipo de usuario al entrar o al crear la cuenta: profesor (editor de
// actividades) o alumno. El administrador entra como profesor.
import Link from "next/link";
import type { Diccionario } from "@/lib/i18n/diccionario";

export function SelectorPerfil({
  actual,
  hrefProfesor,
  hrefAlumno,
  t,
}: {
  actual: "profesor" | "alumno";
  hrefProfesor: string;
  hrefAlumno: string;
  t: Diccionario;
}) {
  const c = t.cuenta;
  const opcion = (perfil: "profesor" | "alumno", href: string, texto: string, detalle: string) => (
    <Link
      href={href}
      aria-current={actual === perfil ? "page" : undefined}
      className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition ${
        actual === perfil ? "bg-white text-tinta-700 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <span className="block">{texto}</span>
      <span className="block text-xs font-normal text-slate-500">{detalle}</span>
    </Link>
  );
  return (
    <nav aria-label={c.tipoPerfil} className="mt-5">
      <p className="mb-1.5 text-xs font-medium text-slate-500">{c.tipoPerfil}</p>
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {opcion("profesor", hrefProfesor, t.barra.tipos.profesor, c.perfilProfesor)}
        {opcion("alumno", hrefAlumno, t.barra.tipos.alumno, c.perfilAlumno)}
      </div>
    </nav>
  );
}

import Link from "next/link";
import { salirProfesor } from "@/app/acciones-cuenta";
import { BarraApp } from "@/components/barra-app";
import { esAdmin } from "@/lib/admin";
import { saldo } from "@/lib/almacen";
import { datosProfesor } from "@/lib/sesion";

export default async function LayoutProfesor({ children }: LayoutProps<"/profesor">) {
  const { profesor, db } = await datosProfesor();
  return (
    <>
      <BarraApp
        enlaces={[
          { href: "/profesor", texto: "Panel", exacto: true },
          { href: "/profesor/actividades/nueva", texto: "Nueva actividad" },
          { href: "/profesor/grupos/nuevo", texto: "Nuevo curso" },
          { href: "/profesor/creditos", texto: "Créditos" },
          ...(esAdmin(profesor.correo) ? [{ href: "/admin", texto: "Administración" }] : []),
        ]}
        usuario={{ nombre: profesor.nombre, rol: profesor.correo }}
        extra={
          <>
            <Link
              href="/profesor/creditos"
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {saldo(db)} créditos
            </Link>
            <form action={salirProfesor}>
              <button type="submit" className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                Salir
              </button>
            </form>
          </>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}

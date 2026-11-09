import Link from "next/link";
import { BarraApp } from "@/components/barra-app";
import { leer, saldo } from "@/lib/almacen";

export default async function LayoutProfesor({ children }: LayoutProps<"/profesor">) {
  const saldoCreditos = saldo(await leer());
  return (
    <>
      <BarraApp
        enlaces={[
          { href: "/profesor", texto: "Panel", exacto: true },
          { href: "/profesor/actividades/nueva", texto: "Nueva actividad" },
          { href: "/profesor/grupos/nuevo", texto: "Nuevo grupo" },
          { href: "/profesor/creditos", texto: "Créditos" },
        ]}
        usuario={{ nombre: "Prof. Omar", rol: "Profesor" }}
        extra={
          <Link
            href="/profesor/creditos"
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            {saldoCreditos} créditos
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}

import { salirProfesor } from "@/app/acciones-cuenta";
import { BarraApp } from "@/components/barra-app";
import { requerirAdmin } from "@/lib/sesion";

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const admin = await requerirAdmin();
  return (
    <>
      <BarraApp
        enlaces={[
          { href: "/admin", texto: "Administración", exacto: true },
          { href: "/profesor", texto: "Mi panel de profesor" },
        ]}
        usuario={{ nombre: admin.nombre, rol: "Administrador" }}
        extra={
          <form action={salirProfesor}>
            <button type="submit" className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              Salir
            </button>
          </form>
        }
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}

import { salirProfesor } from "@/app/acciones-cuenta";
import { BarraApp } from "@/components/barra-app";
import { IdiomaDocumento } from "@/components/idioma-documento";
import { ProveedorTextos } from "@/components/proveedor-textos";
import { idiomaPublico, textos } from "@/lib/i18n/servidor";
import { requerirAdmin } from "@/lib/sesion";

export default async function LayoutAdmin({ children }: LayoutProps<"/admin">) {
  const admin = await requerirAdmin();
  const { idioma, t, locale } = await textos();
  return (
    <ProveedorTextos valor={{ idioma, t, locale }}>
      <IdiomaDocumento idioma={idioma} alSalir={await idiomaPublico()} />
      <BarraApp
        enlaces={[
          { href: "/admin", texto: "Administración", exacto: true, icono: "admin" },
          { href: "/profesor", texto: "Mi panel de profesor", icono: "profesor" },
        ]}
        usuario={{ nombre: admin.nombre, tipo: t.barra.tipos.administrador, rol: admin.correo }}
        extra={
          <form action={salirProfesor}>
            <button type="submit" className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              Salir
            </button>
          </form>
        }
      >
        {children}
      </BarraApp>
    </ProveedorTextos>
  );
}

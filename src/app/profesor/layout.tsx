import Link from "next/link";
import { after } from "next/server";
import { salirProfesor } from "@/app/acciones-cuenta";
import { BarraApp } from "@/components/barra-app";
import { IdiomaDocumento } from "@/components/idioma-documento";
import { ProveedorTextos } from "@/components/proveedor-textos";
import { esAdmin } from "@/lib/admin";
import { mantenimiento } from "@/lib/archivo";
import { srcLogo } from "@/lib/logo";
import { saldo } from "@/lib/almacen";
import { formato } from "@/lib/i18n/idiomas";
import { idiomaPublico, textos } from "@/lib/i18n/servidor";
import { datosProfesor } from "@/lib/sesion";

export default async function LayoutProfesor({ children }: LayoutProps<"/profesor">) {
  const { profesor, db } = await datosProfesor();
  const { idioma, t, locale } = await textos();
  // Archiva fotos y borra lo vencido sin frenar la página (como máximo cada 10 minutos).
  after(() => mantenimiento().catch((e) => console.error("Mantenimiento", e)));
  return (
    <ProveedorTextos valor={{ idioma, t, locale }}>
      <IdiomaDocumento idioma={idioma} alSalir={await idiomaPublico()} />
      <BarraApp
        enlaces={[
          { href: "/profesor", texto: t.barra.panel, exacto: true },
          { href: "/profesor/actividades/nueva", texto: t.barra.nuevaActividad },
          { href: "/profesor/grupos/nuevo", texto: t.barra.nuevoCurso },
          { href: "/profesor/asignaturas", texto: t.barra.asignaturas },
          { href: "/profesor/creditos", texto: t.barra.creditos },
          ...(esAdmin(profesor.correo) ? [{ href: "/admin", texto: t.barra.administracion }] : []),
        ]}
        usuario={{ nombre: profesor.nombre, tipo: t.barra.tipos[profesor.tipo], rol: profesor.correo }}
        configuracion="/profesor/configuracion"
        logo={srcLogo(profesor.config)}
        textoConfiguracion={t.comun.configuracion}
        extra={
          <>
            <Link
              href="/profesor/creditos"
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {formato(t.comun.creditos, { n: saldo(db).toLocaleString(locale) })}
            </Link>
            <form action={salirProfesor}>
              <button type="submit" className="rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                {t.comun.salir}
              </button>
            </form>
          </>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </ProveedorTextos>
  );
}

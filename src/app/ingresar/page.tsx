import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ingresarProfesor } from "@/app/acciones-cuenta";
import { TarjetaCuenta, campoCuenta } from "@/components/tarjeta-cuenta";
import { InstalarApp } from "@/components/instalar-app";
import { Boton } from "@/components/ui";
import { FormIngresoAlumno } from "@/components/formularios-alumno";
import { SelectorPerfil } from "@/components/selector-perfil";
import { textoError, textosInstalar } from "@/lib/i18n/cuenta";
import { textos } from "@/lib/i18n/servidor";
import { profesorActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.cuenta.ingresarMeta };
}

export default async function Ingresar({ searchParams }: PageProps<"/ingresar">) {
  if (await profesorActual()) redirect("/profesor");
  const { idioma, t } = await textos();
  const c = t.cuenta;
  const { error, perfil } = await searchParams;
  const comoAlumno = perfil === "alumno";
  return (
    <TarjetaCuenta titulo={c.ingresarTitulo} error={comoAlumno ? undefined : textoError(t, error)} idioma={{ actual: idioma, etiqueta: t.comun.idioma }}>
      <SelectorPerfil actual={comoAlumno ? "alumno" : "profesor"} hrefProfesor="/ingresar" hrefAlumno="/ingresar?perfil=alumno" t={t} />
      {comoAlumno ? (
        <>
          <FormIngresoAlumno t={t} clase="mt-6 space-y-4" registro="/registro?perfil=alumno" />
        </>
      ) : (
      <>
      <form action={ingresarProfesor} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{c.correo}</span>
          <input name="correo" type="email" required autoComplete="email" placeholder={c.correoEjemplo} className={campoCuenta} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{c.contrasena}</span>
          <input name="contrasena" type="password" required autoComplete="current-password" className={campoCuenta} />
          <Link href="/recuperar" className="mt-1 inline-block text-xs font-medium text-tinta-700 hover:underline">
            {t.recuperar.olvideProfesor}
          </Link>
        </label>
        <Boton type="submit" className="w-full">
          {t.comun.ingresar}
        </Boton>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        {c.sinCuenta}{" "}
        <Link href="/registro" className="font-medium text-tinta-700 hover:underline">
          {c.registrate}
        </Link>
      </p>
      </>
      )}
      <Link
        href="/precios"
        target="_blank"
        rel="noopener"
        className="mt-6 flex items-center justify-between rounded-xl bg-tinta-50 px-4 py-3 text-sm text-tinta-800 ring-1 ring-tinta-100 hover:bg-tinta-100"
      >
        <span>
          <span className="block font-medium">{c.planesPrecios}</span>
          <span className="block text-xs text-tinta-700">{c.planesDetalle}</span>
        </span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
      <InstalarApp textos={textosInstalar(t)} />
    </TarjetaCuenta>
  );
}

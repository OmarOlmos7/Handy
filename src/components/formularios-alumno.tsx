// Formularios de cuenta del alumno (crear cuenta e ingresar). Se usan en su panel y en las
// páginas de acceso cuando se elige el perfil de alumno.
import Link from "next/link";
import { ingresarAlumno, registrarAlumno } from "@/app/acciones-cuenta";
import { AceptarAvisos } from "@/components/aceptar-avisos";
import { Boton, campo } from "@/components/ui";
import type { Diccionario } from "@/lib/i18n/diccionario";
import { errorAlumno } from "@/lib/i18n/alumno";
import { datosResponsable } from "@/lib/legal/documentos";

const TARJETA = "space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200";

export function FormRegistroAlumno({
  t,
  error,
  clase = TARJETA,
  ingreso = "/alumno",
  volver,
}: {
  t: Diccionario;
  error?: string;
  clase?: string;
  /** Enlace para entrar con una cuenta existente. */
  ingreso?: string;
  /** Página de entrega a la que vuelve al crear la cuenta. */
  volver?: string;
}) {
  const tp = t.alumno.panel;
  const tc = t.alumno.campos;
  return (
    <form action={registrarAlumno} className={clase}>
      {volver && <input type="hidden" name="volver" value={volver} />}
      <label className="block text-sm font-medium text-slate-700">
        {tc.nombre}
        <input name="nombre" required autoComplete="name" className={campo} placeholder={tc.nombreEjemplo} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {tc.matricula}
        <input name="matricula" required className={`${campo} font-mono uppercase`} placeholder={tc.matriculaEjemplo} autoCapitalize="characters" />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {tc.correo}
        <input name="correo" type="email" required autoComplete="email" className={campo} placeholder={tc.correoEjemplo} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {tc.claveNueva}
        <input name="clave" type="password" required minLength={6} autoComplete="new-password" className={campo} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {tc.repiteClave}
        <input name="clave2" type="password" required minLength={6} autoComplete="new-password" className={campo} />
      </label>
      <AceptarAvisos t={t.legal} tipo="alumno" correo={datosResponsable(process.env).correo} />
      {error && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{errorAlumno(t, error)}</p>}
      <Boton type="submit" className="w-full">
        {tp.crearCuenta}
      </Boton>
      <p className="text-center text-sm text-slate-600">
        {tp.yaTienesCuenta}{" "}
        <Link href={ingreso} className="font-medium text-tinta-700 hover:underline">
          {tp.entraAqui}
        </Link>
      </p>
    </form> 
  );
}

export function FormIngresoAlumno({
  t,
  error,
  clase = TARJETA,
  registro = "/alumno?crear=1",
  volver,
}: {
  t: Diccionario;
  error?: string;
  clase?: string;
  /** Enlace para crear la cuenta. */
  registro?: string;
  /** Página de entrega a la que vuelve al entrar. */
  volver?: string;
}) {
  const tp = t.alumno.panel;
  const tc = t.alumno.campos;
  return (
    <form action={ingresarAlumno} className={clase}>
      {volver && <input type="hidden" name="volver" value={volver} />}
      <label className="block text-sm font-medium text-slate-700">
        {tc.correo}
        <input name="correo" type="email" required autoComplete="email" className={campo} placeholder={tc.correoEjemplo} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        {tc.clave}
        <input name="clave" type="password" required autoComplete="current-password" className={campo} />
        <Link href="/recuperar?tipo=alumno" className="mt-1 inline-block text-xs font-medium text-tinta-700 hover:underline">
          {t.recuperar.olvideAlumno}
        </Link>
      </label>
      {error && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{errorAlumno(t, error)}</p>}
      <Boton type="submit" className="w-full">
        {tp.verResultados}
      </Boton>
      <p className="text-center text-sm text-slate-600">
        {tp.primeraVez}{" "}
        <Link href={registro} className="font-medium text-tinta-700 hover:underline">
          {tp.creaTuCuenta}
        </Link>
      </p>
    </form>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { restablecerContrasena } from "@/app/acciones-cuenta";
import { TarjetaCuenta, campoCuenta } from "@/components/tarjeta-cuenta";
import { Boton, BotonLink } from "@/components/ui";
import { leer } from "@/lib/almacen";
import { LARGO_MINIMO_CLAVE } from "@/lib/cuentas-alumno";
import { formato } from "@/lib/i18n/idiomas";
import { textos } from "@/lib/i18n/servidor";
import { buscarRecuperacion } from "@/lib/recuperacion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.recuperar.meta };
}

/** Pantalla del enlace del correo: pide la nueva contraseña (profesor) o clave de acceso (alumno). */
export default async function Restablecer({ searchParams }: PageProps<"/restablecer">) {
  const { idioma, t } = await textos();
  const tr = t.recuperar;
  const selector = { actual: idioma, etiqueta: t.comun.idioma };
  const { t: token, volver: volverParam, listo, error } = await searchParams;
  const volver = typeof volverParam === "string" && /^\/entregar\/[\w-]+$/.test(volverParam) ? volverParam : "";

  if (listo === "profesor" || listo === "alumno") {
    return (
      <TarjetaCuenta titulo={tr[listo].nuevaTitulo} idioma={selector}>
        <p className="mt-4 rounded-lg bg-acierto-suave p-3 text-sm text-acierto">{tr[listo].listo}</p>
        <BotonLink href={volver || (listo === "alumno" ? "/alumno" : "/ingresar")} className="mt-6 w-full">
          {tr.ingresar}
        </BotonLink>
      </TarjetaCuenta>
    );
  }

  const r = typeof token === "string" ? buscarRecuperacion(await leer(), token) : undefined;
  if (!r) {
    return (
      <TarjetaCuenta titulo={tr.profesor.nuevaTitulo} error={tr.errores.enlaceInvalido} idioma={selector}>
        <p className="mt-6 text-sm">
          <Link href={`/recuperar${volver ? `?tipo=alumno&volver=${encodeURIComponent(volver)}` : ""}`} className="font-medium text-tinta-700 hover:underline">
            {tr.enviar}
          </Link>
        </p>
      </TarjetaCuenta>
    );
  }
  const minimo = r.tipo === "profesor" ? 8 : LARGO_MINIMO_CLAVE;
  const textoError = typeof error === "string" ? formato((tr.errores as Record<string, string>)[error] ?? "", { n: minimo }) || undefined : undefined;
  return (
    <TarjetaCuenta titulo={tr[r.tipo].nuevaTitulo} error={textoError} idioma={selector}>
      <form action={restablecerContrasena} className="mt-6 space-y-4">
        <input type="hidden" name="t" value={token} />
        {volver && <input type="hidden" name="volver" value={volver} />}
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{tr[r.tipo].nueva}</span>
          <input name="nueva" type="password" required minLength={minimo} autoComplete="new-password" className={campoCuenta} />
          <span className="mt-1 block text-xs text-slate-500">{formato(tr.errores.corta, { n: minimo })}</span>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{tr[r.tipo].repite}</span>
          <input name="nueva2" type="password" required minLength={minimo} autoComplete="new-password" className={campoCuenta} />
        </label>
        <Boton type="submit" className="w-full">
          {tr.guardar}
        </Boton>
      </form>
    </TarjetaCuenta>
  );
}

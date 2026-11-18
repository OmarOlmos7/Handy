import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registrarProfesor } from "@/app/acciones-cuenta";
import { TarjetaCuenta, campoCuenta } from "@/components/tarjeta-cuenta";
import { Boton } from "@/components/ui";
import { textoError } from "@/lib/i18n/cuenta";
import { textos } from "@/lib/i18n/servidor";
import { profesorActual } from "@/lib/sesion";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.cuenta.registroMeta };
}

export default async function Registro({ searchParams }: PageProps<"/registro">) {
  if (await profesorActual()) redirect("/profesor");
  const { idioma, t } = await textos();
  const c = t.cuenta;
  const { error } = await searchParams;
  const pideInvitacion = Boolean(process.env.REGISTRO_CODIGO);
  return (
    <TarjetaCuenta titulo={c.registroTitulo} error={textoError(t, error)} idioma={{ actual: idioma, etiqueta: t.comun.idioma }}>
      <p className="mt-2 text-sm text-slate-600">{c.registroTexto}</p>
      <form action={registrarProfesor} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{c.nombre}</span>
          <input name="nombre" required autoComplete="name" placeholder={c.nombreEjemplo} className={campoCuenta} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{c.correo}</span>
          <input name="correo" type="email" required autoComplete="email" placeholder={c.correoEjemplo} className={campoCuenta} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{c.contrasena}</span>
          <input name="contrasena" type="password" required minLength={8} autoComplete="new-password" className={campoCuenta} />
          <span className="mt-1 block text-xs text-slate-500">{c.minimo8}</span>
        </label>
        {pideInvitacion && (
          <label className="block text-sm">
            <span className="font-medium text-slate-700">{c.invitacion}</span>
            <input name="invitacion" required className={campoCuenta} />
            <span className="mt-1 block text-xs text-slate-500">{c.invitacionNota}</span>
          </label>
        )}
        <Boton type="submit" className="w-full">
          {c.crearCuenta}
        </Boton>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        {c.yaTienes}{" "}
        <Link href="/ingresar" className="font-medium text-tinta-700 hover:underline">
          {c.ingresa}
        </Link>
      </p>
    </TarjetaCuenta>
  );
}

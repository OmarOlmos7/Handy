import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registrarProfesor } from "@/app/acciones-cuenta";
import { TarjetaCuenta, campoCuenta } from "@/components/tarjeta-cuenta";
import { Boton } from "@/components/ui";
import { profesorActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Crear cuenta de profesor" };

export default async function Registro({ searchParams }: PageProps<"/registro">) {
  if (await profesorActual()) redirect("/profesor");
  const { error } = await searchParams;
  const pideInvitacion = Boolean(process.env.REGISTRO_CODIGO);
  return (
    <TarjetaCuenta titulo="Crea tu cuenta de profesor" error={typeof error === "string" ? error : undefined}>
      <p className="mt-2 text-sm text-slate-600">
        Tus cursos, actividades y evaluaciones quedan guardados en tu cuenta. Tus alumnos no necesitan registrarse.
      </p>
      <form action={registrarProfesor} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Nombre</span>
          <input name="nombre" required autoComplete="name" placeholder="Ej. Omar Olmos" className={campoCuenta} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Correo</span>
          <input name="correo" type="email" required autoComplete="email" placeholder="profesor@escuela.edu.mx" className={campoCuenta} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Contraseña</span>
          <input name="contrasena" type="password" required minLength={8} autoComplete="new-password" className={campoCuenta} />
          <span className="mt-1 block text-xs text-slate-500">Mínimo 8 caracteres.</span>
        </label>
        {pideInvitacion && (
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Código de invitación</span>
            <input name="invitacion" required className={campoCuenta} />
            <span className="mt-1 block text-xs text-slate-500">Durante el piloto, el registro es solo con invitación.</span>
          </label>
        )}
        <Boton type="submit" className="w-full">
          Crear cuenta
        </Boton>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/ingresar" className="font-medium text-tinta-700 hover:underline">
          Ingresa
        </Link>
      </p>
    </TarjetaCuenta>
  );
}

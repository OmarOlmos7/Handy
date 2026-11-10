import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ingresarProfesor } from "@/app/acciones-cuenta";
import { TarjetaCuenta, campoCuenta } from "@/components/tarjeta-cuenta";
import { InstalarApp } from "@/components/instalar-app";
import { Boton } from "@/components/ui";
import { profesorActual } from "@/lib/sesion";

export const metadata: Metadata = { title: "Ingresar" };

export default async function Ingresar({ searchParams }: PageProps<"/ingresar">) {
  if (await profesorActual()) redirect("/profesor");
  const { error } = await searchParams;
  return (
    <TarjetaCuenta titulo="Ingresa a tu cuenta" error={typeof error === "string" ? error : undefined}>
      <form action={ingresarProfesor} className="mt-6 space-y-4">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Correo</span>
          <input name="correo" type="email" required autoComplete="email" placeholder="profesor@escuela.edu.mx" className={campoCuenta} />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Contraseña</span>
          <input name="contrasena" type="password" required autoComplete="current-password" className={campoCuenta} />
        </label>
        <Boton type="submit" className="w-full">
          Ingresar
        </Boton>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        ¿Eres profesor y no tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-tinta-700 hover:underline">
          Regístrate
        </Link>
      </p>
      <p className="mt-2 text-sm text-slate-600">
        ¿Eres alumno? No necesitas cuenta:{" "}
        <Link href="/alumno" className="font-medium text-tinta-700 hover:underline">
          consulta tus reportes con el ID de curso
        </Link>
        .
      </p>
      <InstalarApp />
    </TarjetaCuenta>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { BotonLink, Logo } from "@/components/ui";

export const metadata: Metadata = { title: "Ingresar" };

// Iteración 1: sin autenticación real. Solo permite entrar como profesor o alumno
// de ejemplo. La sesión real (correo y Google) llega con la API.
export default function Ingresar() {
  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-tinta-50 to-[#f6f7f9] px-4 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <Link href="/">
          <Logo />
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Ingresa a tu cuenta</h1>
        <form className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Correo</span>
            <input
              type="email"
              placeholder="profesor@escuela.edu.mx"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Contraseña</span>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100"
            />
          </label>
        </form>
        <p className="mt-6 rounded-lg bg-aviso-suave p-3 text-sm text-aviso">
          Versión de demostración: el inicio de sesión aún no está conectado. Entra con una cuenta de ejemplo.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <BotonLink href="/profesor">Entrar como profesor</BotonLink>
          <BotonLink href="/alumno" variante="secundario">
            Entrar como alumno
          </BotonLink>
        </div>
      </div>
    </main>
  );
}

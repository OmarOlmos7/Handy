import type { Metadata } from "next";
import Link from "next/link";
import { solicitarRecuperacion } from "@/app/acciones-cuenta";
import { TarjetaCuenta, campoCuenta } from "@/components/tarjeta-cuenta";
import { Boton } from "@/components/ui";
import { textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.recuperar.meta };
}

/** Pide el correo registrado para enviar el enlace de recuperación (profesor o alumno). */
export default async function Recuperar({ searchParams }: PageProps<"/recuperar">) {
  const { idioma, t } = await textos();
  const tr = t.recuperar;
  const { tipo: tipoParam, volver: volverParam, enviado, error } = await searchParams;
  const tipo = tipoParam === "alumno" ? "alumno" : "profesor";
  const volver = typeof volverParam === "string" && /^\/entregar\/[\w-]+$/.test(volverParam) ? volverParam : "";
  const errores = tr.errores as Record<string, string>;
  const mensajeError = typeof error === "string" ? errores[error] : undefined;
  const regreso = volver || (tipo === "alumno" ? "/alumno" : "/ingresar");
  return (
    <TarjetaCuenta titulo={tr[tipo].titulo} error={mensajeError} idioma={{ actual: idioma, etiqueta: t.comun.idioma }}>
      {enviado === "1" ? (
        <p className="mt-4 rounded-lg bg-acierto-suave p-3 text-sm text-acierto">{tr.enviado}</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-600">{tr.texto}</p>
          <form action={solicitarRecuperacion} className="mt-6 space-y-4">
            <input type="hidden" name="tipo" value={tipo} />
            {volver && <input type="hidden" name="volver" value={volver} />}
            <label className="block text-sm">
              <span className="font-medium text-slate-700">{t.cuenta.correo}</span>
              <input name="correo" type="email" required autoComplete="email" className={campoCuenta} />
            </label>
            <Boton type="submit" className="w-full">
              {tr.enviar}
            </Boton>
          </form>
        </>
      )}
      <p className="mt-6 text-sm">
        <Link href={regreso} className="font-medium text-tinta-700 hover:underline">
          {tr.volver}
        </Link>
      </p>
    </TarjetaCuenta>
  );
}

import type { Metadata } from "next";
import { guardarCuenta, guardarPrecision, guardarRangos } from "@/app/acciones-configuracion";
import { ConfigPrecision } from "@/components/precision-ia";
import { Boton, Encabezado, Tarjeta, campo } from "@/components/ui";
import { NIVELES_REPORTE, configuracionDe, intervaloNivel } from "@/lib/configuracion";
import { datosProfesor } from "@/lib/sesion";

export const metadata: Metadata = { title: "Configuración" };

function Aviso({ seccion, actual, ok, error }: { seccion: string; actual?: string; ok?: string; error?: string }) {
  if (actual !== seccion) return null;
  if (error) return <p className="mt-4 rounded-lg bg-error-suave p-3 text-sm text-error">{error}</p>;
  if (ok)
    return (
      <p className="mt-4 rounded-lg bg-acierto-suave p-3 text-sm text-acierto" role="status">
        {ok}
      </p>
    );
  return null;
}

/** Preferencias del profesor: cuenta, rangos de calificación para reportes y precisión de la IA. */
export default async function Configuracion({ searchParams }: PageProps<"/profesor/configuracion">) {
  const { profesor } = await datosProfesor();
  const conf = configuracionDe(profesor.config);
  const q = await searchParams;
  const texto = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : undefined);
  const aviso = { actual: texto("s"), ok: texto("ok"), error: texto("error") };
  const r = conf.rangos;

  return (
    <>
      <Encabezado titulo="Configuración" subtitulo="Personaliza tu cuenta, tus reportes y la forma en que la IA trabaja en tus actividades." />
      <div className="space-y-6">
        <Tarjeta>
          <h2 id="cuenta" className="scroll-mt-6 text-lg font-semibold">
            Nombre y contraseña
          </h2>
          <p className="mt-1 text-sm text-slate-500">Tu correo de acceso es {profesor.correo}.</p>
          <form action={guardarCuenta} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2 sm:max-w-md">
              Nombre
              <input name="nombre" required maxLength={80} defaultValue={profesor.nombre} autoComplete="name" className={campo} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Contraseña actual
              <input name="actual" type="password" autoComplete="current-password" className={campo} />
            </label>
            <span className="hidden sm:block" />
            <label className="block text-sm font-medium text-slate-700">
              Nueva contraseña
              <input name="nueva" type="password" minLength={8} autoComplete="new-password" className={campo} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Confirma la nueva contraseña
              <input name="confirmar" type="password" minLength={8} autoComplete="new-password" className={campo} />
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Boton type="submit">Guardar</Boton>
              <span className="text-xs text-slate-500">Deja las contraseñas vacías si solo cambias tu nombre.</span>
            </div>
          </form>
          <Aviso seccion="cuenta" {...aviso} />
        </Tarjeta>

        <Tarjeta>
          <h2 id="rangos" className="scroll-mt-6 text-lg font-semibold">
            Rangos de calificación para reportes
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Define dónde empieza cada nivel de desempeño (sobre 100). Se usan en las gráficas de niveles de las analíticas y en el
            reporte PDF. Si una actividad se califica sobre 10, se convierte a 100 para compararla.
          </p>
          <form action={guardarRangos} className="mt-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {[...NIVELES_REPORTE].reverse().map((n) => (
                <div key={n.clave} className="rounded-lg p-3 ring-1 ring-slate-200">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: n.color }} aria-hidden />
                    {n.nombre}
                  </p>
                  {n.clave === "bajo" ? (
                    <p className="mt-2 text-sm text-slate-600">
                      Desde 0
                      <span className="mt-1 block text-xs text-slate-500">Actual: {intervaloNivel("bajo", r)}</span>
                    </p>
                  ) : (
                    <label className="mt-2 block text-xs text-slate-500">
                      Desde
                      <input
                        name={n.clave}
                        type="number"
                        min={1}
                        max={100}
                        required
                        defaultValue={r[n.clave]}
                        className={`${campo} mt-1 w-24`}
                      />
                      <span className="mt-1 block">Actual: {intervaloNivel(n.clave, r)}</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Boton type="submit">Guardar rangos</Boton>
              <span className="text-xs text-slate-500">Predeterminados: Bajo 0 a 69, Medio 70 a 84, Alto 85 a 95, Superior 96 a 100.</span>
            </div>
          </form>
          <Aviso seccion="rangos" {...aviso} />
        </Tarjeta>

        <Tarjeta>
          <h2 id="precision" className="scroll-mt-6 text-lg font-semibold">
            Precisión y consumo de la IA
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Es el nivel predeterminado para tus actividades nuevas; en cada actividad puedes cambiarlo con el deslizador. Cada
            nivel usa un motor distinto y tiene una eficiencia diferente: más precisión lee mejor los procedimientos largos, las
            gráficas y la letra difícil, pero tarda más y consume más tokens. El esfuerzo indica cuánto razona el motor antes de
            responder: con más esfuerzo revisa con más cuidado y consume más.
          </p>
          <form action={guardarPrecision} className="mt-4">
            <ConfigPrecision motor={conf.motor} esfuerzos={conf.esfuerzos} />
            <p className="mt-3 text-xs text-slate-500">
              El consumo es relativo: 1× es el nivel Rápido con esfuerzo medio. Los créditos se cobran igual (1 crédito por página);
              el consumo de tokens es el costo de la IA detrás de cada evaluación.
            </p>
            <Boton type="submit" className="mt-4">
              Guardar precisión
            </Boton>
          </form>
          <Aviso seccion="precision" {...aviso} />
        </Tarjeta>
      </div>
    </>
  );
}

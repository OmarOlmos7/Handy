import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BotonLink, Logo } from "@/components/ui";
import { INFO_MOTOR, MOTORES, PRECISION_PREDETERMINADA, nivelConsumo } from "@/lib/configuracion";
import { PLANES, ahorroContra, pesos, planDe, precioPorPagina, type Plan } from "@/lib/planes";

export const metadata: Metadata = {
  title: "Planes y precios",
  description: "Planes de iEureka-Grader: paga solo las páginas que calificas. Precios en pesos mexicanos, IVA incluido.",
};

const preguntas: [string, string][] = [
  ["¿Qué es un crédito?", "1 crédito = 1 página de alumno evaluada. Si una entrega trae 3 páginas, usa 3 créditos."],
  [
    "¿Qué no consume créditos?",
    "Crear tus cursos, generar la actividad con IA, imprimir la hoja con QR, subir tu solución y armar la rúbrica.",
  ],
  [
    "¿Cómo pago?",
    "Con tarjeta de crédito o débito, en efectivo en OXXO o por transferencia SPEI. Si necesitas factura (CFDI), la pides al pagar.",
  ],
  [
    "¿Qué pasa si se me acaban los créditos?",
    "Tus actividades y reportes siguen disponibles y las entregas se siguen recibiendo. Las evalúas en cuanto compres más créditos.",
  ],
];

function Paloma({ claro }: { claro?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={`mt-0.5 h-4 w-4 shrink-0 ${claro ? "text-tinta-200" : "text-tinta-600"}`} fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden>
      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Botón de contacto del plan Escuela: el correo se configura en el servidor (CONTACTO_CORREO). */
async function BotonContacto({ texto, clase }: { texto: string; clase: string }) {
  await connection();
  const correo = process.env.CONTACTO_CORREO;
  if (!correo) {
    return (
      <Link href="/registro" className={clase}>
        Crea tu cuenta y escríbenos
      </Link>
    );
  }
  return (
    <a href={`mailto:${correo}?subject=${encodeURIComponent("Plan Escuela de iEureka-Grader")}`} className={clase}>
      {texto}
    </a>
  );
}

function TarjetaPlan({ plan }: { plan: Plan }) {
  const porPagina = precioPorPagina(plan);
  const ahorro = ahorroContra(plan, planDe("basico"));
  const d = plan.destacado;
  const claseBoton = `mt-6 flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition ${
    d ? "bg-white text-tinta-700 hover:bg-tinta-50" : "bg-slate-900 text-white hover:bg-slate-700"
  }`;
  return (
    <section
      className={`relative flex flex-col rounded-2xl p-6 ring-1 ${d ? "bg-tinta-600 text-white shadow-xl ring-tinta-600" : "bg-white shadow-sm ring-slate-200"}`}
      aria-labelledby={`plan-${plan.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={`plan-${plan.id}`} className="text-xl font-semibold">
          {plan.nombre}
        </h2>
        {d && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">Más popular</span>}
      </div>
      <p className={`mt-1 text-sm ${d ? "text-tinta-100" : "text-slate-500"}`}>{plan.lema}</p>

      <div className="mt-6 flex items-end gap-1.5">
        {plan.precio === undefined ? (
          <span className="text-3xl font-semibold tracking-tight">A la medida</span>
        ) : (
          <>
            <span className="text-4xl font-semibold tracking-tight">{pesos(plan.precio)}</span>
            <span className={`pb-1 text-sm ${d ? "text-tinta-100" : "text-slate-500"}`}>MXN</span>
          </>
        )}
      </div>
      <p className={`mt-1 text-sm ${d ? "text-tinta-100" : "text-slate-500"}`}>{plan.periodo}</p>
      <p className={`mt-1 h-5 text-xs font-medium ${d ? "text-white" : "text-tinta-700"}`}>
        {porPagina !== undefined && `$${porPagina.toFixed(2)} por página`}
        {ahorro !== undefined && ` · ahorra ${ahorro} %`}
      </p>

      {plan.boton.href ? (
        <Link href={plan.boton.href} className={claseBoton}>
          {plan.boton.texto}
        </Link>
      ) : (
        <Suspense fallback={<span className={claseBoton}>{plan.boton.texto}</span>}>
          <BotonContacto texto={plan.boton.texto} clase={claseBoton} />
        </Suspense>
      )}

      <div className={`mt-6 border-t pt-5 ${d ? "border-white/20" : "border-slate-100"}`}>
        <p className={`text-sm font-medium ${d ? "text-white" : "text-slate-800"}`}>{plan.incluye}</p>
        <ul className="mt-3 space-y-2.5 text-sm">
          {plan.ventajas.map((v) => (
            <li key={v} className={`flex gap-2.5 ${d ? "text-white" : "text-slate-600"}`}>
              <Paloma claro={d} />
              {v}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Página pública de planes y precios (se abre en otra pestaña desde la de ingreso). */
export default function Precios() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f6f7f9]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/">
            <Logo grande />
          </Link>
          <div className="flex gap-2">
            <BotonLink href="/ingresar" variante="fantasma">
              Ingresar
            </BotonLink>
            <BotonLink href="/registro" className="hidden sm:inline-flex">
              Probar gratis
            </BotonLink>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Planes que se ajustan a tu salón</h1>
          <p className="mt-3 text-slate-600">
            Paga solo las páginas que calificas. 1 crédito = 1 página de alumno evaluada. Precios en pesos mexicanos, IVA
            incluido, sin suscripción.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANES.map((p) => (
            <TarjetaPlan key={p.id} plan={p} />
          ))}
        </div>

        <section className="mt-16" aria-labelledby="precision">
          <h2 id="precision" className="text-2xl font-semibold tracking-tight">
            Elige la precisión de la IA en cada actividad
          </h2>
          <p className="mt-2 max-w-3xl text-slate-600">
            Todos los planes incluyen los tres niveles. Cada nivel usa un motor distinto: más precisión lee mejor los
            procedimientos largos y la letra difícil, pero consume más tokens de IA. Lo eliges en tu configuración y en cada
            actividad nueva.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {MOTORES.map((m) => {
              const info = INFO_MOTOR[m];
              const consumo = nivelConsumo({ motor: m, esfuerzo: "medio" });
              return (
                <div key={m} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{info.nombre}</h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{info.descripcion}</p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    Consumo
                    <span className="flex gap-1" aria-label={`Consumo ${consumo} de 5`}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={`h-1.5 w-5 rounded-full ${i <= consumo ? "bg-tinta-500" : "bg-slate-200"}`} />
                      ))}
                    </span>
                    {m === PRECISION_PREDETERMINADA.motor && <span className="ml-auto font-medium text-tinta-700">Predeterminado</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16" aria-labelledby="preguntas">
          <h2 id="preguntas" className="text-2xl font-semibold tracking-tight">
            Preguntas frecuentes
          </h2>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            {preguntas.map(([p, r]) => (
              <div key={p} className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
                <dt className="font-medium">{p}</dt>
                <dd className="mt-1 text-sm text-slate-600">{r}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}

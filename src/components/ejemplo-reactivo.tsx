// Ejemplos ilustrativos (datos inventados) de cada tipo de reactivo, para la página principal.
// Simulan un recorte de la hoja del alumno con su respuesta escrita a mano.
import type { ReactNode } from "react";

export type TipoEjemplo =
  | "vf"
  | "opcion"
  | "columnas"
  | "parentesis"
  | "desarrollo"
  | "algoritmo"
  | "ensayo"
  | "dibujo"
  | "audio";

function Papel({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[260px] rounded-md bg-papel p-3 text-[13px] leading-snug text-slate-700 shadow-sm ring-1 ring-slate-200">
      {children}
    </div>
  );
}

const mano = "font-mano text-lg leading-tight text-[#1d43c9]";

export function EjemploReactivo({ tipo }: { tipo: TipoEjemplo }) {
  switch (tipo) {
    case "vf":
      return (
        <Papel>
          <p>
            ( <span className={mano}>F</span> ) La Luna tiene luz propia.
          </p>
          <p className="mt-1">
            ( <span className={mano}>V</span> ) El agua hierve a 100 °C a nivel del mar.
          </p>
        </Papel>
      );
    case "opcion":
      return (
        <Papel>
          <p>¿Capital de Nuevo León?</p>
          <p className="mt-1">
            a) Saltillo{" "}
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#1d43c9]">b</span>
            ) Monterrey c) Durango
          </p>
        </Papel>
      );
    case "columnas":
      return (
        <Papel>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-1">
            <span>1. Fotosíntesis</span>
            <span className={mano}>c</span>
            <span>a) Mitocondria</span>
            <span>2. Respiración</span>
            <span className={mano}>a</span>
            <span>b) Núcleo</span>
            <span>3. ADN</span>
            <span className={mano}>b</span>
            <span>c) Cloroplasto</span>
          </div>
        </Papel>
      );
    case "parentesis":
      return (
        <Papel>
          <p>
            ( <span className={mano}>b</span> ) Independencia de México
          </p>
          <p>
            ( <span className={mano}>a</span> ) Llegada de Cortés
          </p>
          <p>
            ( <span className={mano}>c</span> ) Revolución Mexicana
          </p>
        </Papel>
      );
    case "desarrollo":
      return (
        <Papel>
          <p>Resuelve: 3x + 5 = 20</p>
          <p className={mano}>3x = 20 − 5</p>
          <p className={mano}>3x = 15</p>
          <p className={mano}>x = 5</p>
        </Papel>
      );
    case "algoritmo":
      return (
        <Papel>
          <p>Pasos para sacar el promedio:</p>
          <p className={mano}>1. Suma todas las calificaciones</p>
          <p className={mano}>2. Cuenta cuántas son</p>
          <p className={mano}>3. Divide la suma entre el total</p>
        </Papel>
      );
    case "ensayo":
      return (
        <Papel>
          <p>¿Por qué es importante reciclar?</p>
          <p className={`${mano} mt-1 text-base`}>
            Reciclar reduce la basura y ahorra recursos naturales, como el agua y los árboles que se usan para…
          </p>
        </Papel>
      );
    case "dibujo":
      return (
        <Papel>
          <p>Dibuja y señala las partes de la célula</p>
          <svg viewBox="0 0 220 90" className="mt-1 h-20 w-full" aria-hidden>
            <ellipse cx="80" cy="45" rx="70" ry="38" fill="none" stroke="#1d43c9" strokeWidth="2" />
            <circle cx="85" cy="45" r="14" fill="#c7d2fe" stroke="#1d43c9" strokeWidth="2" />
            <path d="M40 30 q8 -6 16 0 q8 6 16 0" fill="none" stroke="#1d43c9" strokeWidth="1.5" />
            <line x1="99" y1="45" x2="160" y2="30" stroke="#1d43c9" />
            <text x="163" y="33" fontSize="13" fill="#1d43c9" fontFamily="var(--font-caveat), cursive">núcleo</text>
            <line x1="148" y1="55" x2="165" y2="65" stroke="#1d43c9" />
            <text x="163" y="76" fontSize="13" fill="#1d43c9" fontFamily="var(--font-caveat), cursive">membrana</text>
          </svg>
        </Papel>
      );
    case "audio":
      return (
        <div className="flex w-full max-w-[260px] items-center gap-3 rounded-md bg-white p-3 shadow-sm ring-1 ring-slate-200">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tinta-600 text-white" aria-hidden>
            ▶
          </span>
          <svg viewBox="0 0 140 32" className="h-8 flex-1" aria-hidden>
            {[6, 14, 22, 10, 26, 18, 8, 20, 28, 12, 24, 16, 6, 18, 26, 10, 14, 22, 8, 12].map((h, i) => (
              <rect key={i} x={i * 7} y={16 - h / 2} width="4" height={h} rx="2" fill="#2554e8" opacity={i < 8 ? 1 : 0.35} />
            ))}
          </svg>
          <span className="text-xs text-slate-500">0:42</span>
        </div>
      );
  }
}

"use client";

// Ojitos del compañero de estudio (trazo de caricatura, según la plantilla de expresiones): sonríen, se ponen serios, tristes, se enojan o lloran según lo
// que el alumno estudia por su cuenta. Parpadean y miran hacia el puntero; mientras se arma una
// actividad, miran hacia arriba "pensando". Con movimiento reducido, no se animan.
import { useEffect, useId, useRef, useState } from "react";
import type { Animo } from "@/lib/autoestudio";

interface Pose {
  /** Qué tanto baja el párpado superior (0 abierto, 1 cerrado). */
  arriba: number;
  /** Inclinación del párpado superior en grados (positivo: baja hacia la nariz, enojo). */
  giro: number;
  /** Qué tanto sube el párpado inferior (ojos sonrientes). */
  abajo: number;
  /** Inclinación de las cejas (positivo: bajan hacia la nariz), su altura y su arco. */
  ceja: number;
  alturaCeja: number;
  arcoCeja: number;
  /** Hacia dónde miran las pupilas por omisión. */
  mirada: { x: number; y: number };
  mejillas: boolean;
  lagrimas: boolean;
}

// Trazo de caricatura en tinta sobre blanco, como en la plantilla de expresiones.
const POSES: Record<Animo, Pose> = {
  feliz: { arriba: 0, giro: 0, abajo: 0.1, ceja: -6, alturaCeja: -44, arcoCeja: 12, mirada: { x: 0, y: -2 }, mejillas: true, lagrimas: false },
  serio: { arriba: 0.46, giro: 0, abajo: 0.04, ceja: 0, alturaCeja: -33, arcoCeja: 1, mirada: { x: 0, y: 2 }, mejillas: false, lagrimas: false },
  triste: { arriba: 0.4, giro: -15, abajo: 0, ceja: -20, alturaCeja: -40, arcoCeja: 5, mirada: { x: 0, y: 8 }, mejillas: false, lagrimas: false },
  enojado: { arriba: 0.4, giro: 20, abajo: 0.1, ceja: 26, alturaCeja: -31, arcoCeja: -3, mirada: { x: 0, y: 3 }, mejillas: false, lagrimas: false },
  llorando: { arriba: 0.32, giro: -20, abajo: 0.14, ceja: -24, alturaCeja: -40, arcoCeja: 7, mirada: { x: 0, y: 8 }, mejillas: false, lagrimas: true },
};

const TINTA = "#111827";
const FONDO = "#ffffff";
const RX = 25;
const RY = 29;

function Ojo({ cx, lado, pose, mirada, id }: { cx: number; lado: 1 | -1; pose: Pose; mirada: { x: number; y: number }; id: string }) {
  // lado: -1 ojo izquierdo, 1 derecho. Los giros se reflejan para que ambos bajen hacia la nariz.
  const giro = pose.giro * -lado;
  const bordeArriba = -RY + pose.arriba * 2 * RY;
  const bordeAbajo = RY - pose.abajo * 2 * RY;
  const transicion = { transition: "transform 450ms cubic-bezier(.4,1.4,.6,1)" };
  return (
    <g transform={`translate(${cx} 64)`}>
      <clipPath id={id}>
        <ellipse rx={RX} ry={RY} />
      </clipPath>
      <g className="ojito-parpadeo">
        <ellipse rx={RX} ry={RY} fill={FONDO} />
        <g clipPath={`url(#${id})`}>
          <g style={{ transform: `translate(${mirada.x}px, ${mirada.y}px)`, transition: "transform 160ms ease-out" }}>
            <circle r={9.5} fill={TINTA} />
            <circle r={3} cx={-3} cy={-3.5} fill={FONDO} />
          </g>
          {/* Párpado superior: baja y se inclina; su orilla es una línea de tinta. */}
          <g style={{ ...transicion, transform: `translate(0px, ${bordeArriba}px) rotate(${giro}deg)` }}>
            <rect x={-60} y={-120} width={120} height={120} fill={FONDO} />
            <line x1={-60} y1={0} x2={60} y2={0} stroke={TINTA} strokeWidth={3.5} strokeLinecap="round" />
          </g>
          {/* Párpado inferior: una curva que sube cuando los ojos sonríen. */}
          <ellipse
            cx={0}
            cy={RY + 26}
            rx={30}
            ry={26}
            fill={FONDO}
            stroke={TINTA}
            strokeWidth={3.5}
            style={{ ...transicion, transform: `translate(0px, ${bordeAbajo - RY}px)` }}
          />
        </g>
        <ellipse rx={RX} ry={RY} fill="none" stroke={TINTA} strokeWidth={3.5} />
      </g>
      {/* Ceja: un trazo grueso con arco. */}
      <path
        d={`M -21 0 Q 0 ${-pose.arcoCeja * 2} 21 0`}
        fill="none"
        stroke={TINTA}
        strokeWidth={6}
        strokeLinecap="round"
        style={{ ...transicion, transform: `translate(0px, ${pose.alturaCeja}px) rotate(${pose.ceja * -lado}deg)` }}
      />
      {pose.mejillas && <ellipse cx={lado * 8} cy={RY + 8} rx={12} ry={5} fill="#fda4af" opacity={0.7} />}
      {pose.lagrimas && (
        <g fill="#60a5fa">
          <path className="ojito-lagrima" d={`M ${lado * 12} ${RY - 4} q -6 10 0 15 q 6 -5 0 -15 z`} />
          <path className="ojito-lagrima ojito-lagrima-2" d={`M ${lado * 19} ${RY - 8} q -5 8 0 12 q 5 -4 0 -12 z`} />
        </g>
      )}
    </g>
  );
}

export function Ojitos({ animo, pensando = false, etiqueta, className = "" }: { animo: Animo; pensando?: boolean; etiqueta: string; className?: string }) {
  const pose = POSES[animo];
  const caja = useRef<SVGSVGElement>(null);
  const [mira, setMira] = useState<{ x: number; y: number } | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const base = useId().replace(/[^a-zA-Z0-9]/g, "");

  // Las pupilas siguen al puntero (sin salirse del ojo).
  useEffect(() => {
    const mover = (e: PointerEvent) => {
      const r = caja.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const f = Math.min(1, d / 300);
      setMira({ x: (dx / d) * 9 * f, y: (dy / d) * 10 * f });
    };
    window.addEventListener("pointermove", mover);
    return () => window.removeEventListener("pointermove", mover);
  }, []);

  // Pensando: las pupilas dan vueltas arriba.
  useEffect(() => {
    if (!pensando) return;
    const t = setInterval(() => setVuelta((v) => v + 1), 260);
    return () => clearInterval(t);
  }, [pensando]);

  const mirada = pensando
    ? { x: Math.cos(vuelta * 0.9) * 8, y: -9 + Math.sin(vuelta * 0.9) * 3 }
    : mira && animo !== "triste" && animo !== "llorando"
      ? mira
      : mira
        ? { x: mira.x * 0.5, y: Math.max(pose.mirada.y, mira.y) }
        : pose.mirada;

  return (
    <svg ref={caja} viewBox="0 0 200 120" role="img" aria-label={etiqueta} className={`ojitos ${className}`}>
      <Ojo cx={64} lado={-1} pose={pose} mirada={mirada} id={`${base}-izq`} />
      <Ojo cx={136} lado={1} pose={pose} mirada={mirada} id={`${base}-der`} />
    </svg>
  );
}

"use client";

// Ojitos del compañero de estudio: sonríen, se ponen serios, tristes, se enojan o lloran según lo
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
  /** Inclinación de las cejas y su altura. */
  ceja: number;
  alturaCeja: number;
  /** Hacia dónde miran las pupilas por omisión. */
  mirada: { x: number; y: number };
  mejillas: boolean;
  lagrimas: boolean;
  cara: string;
}

const POSES: Record<Animo, Pose> = {
  feliz: { arriba: 0, giro: 0, abajo: 0.42, ceja: -8, alturaCeja: -52, mirada: { x: 0, y: -2 }, mejillas: true, lagrimas: false, cara: "#2554e8" },
  serio: { arriba: 0.34, giro: 0, abajo: 0.08, ceja: 0, alturaCeja: -44, mirada: { x: 0, y: 0 }, mejillas: false, lagrimas: false, cara: "#3b4f8f" },
  triste: { arriba: 0.36, giro: -16, abajo: 0, ceja: -18, alturaCeja: -46, mirada: { x: 0, y: 9 }, mejillas: false, lagrimas: false, cara: "#4f5f8a" },
  enojado: { arriba: 0.4, giro: 20, abajo: 0.1, ceja: 24, alturaCeja: -38, mirada: { x: 0, y: 2 }, mejillas: false, lagrimas: false, cara: "#b4233b" },
  llorando: { arriba: 0.3, giro: -20, abajo: 0.14, ceja: -22, alturaCeja: -46, mirada: { x: 0, y: 8 }, mejillas: false, lagrimas: true, cara: "#4f5f8a" },
};

const RX = 30;
const RY = 34;

function Ojo({ cx, lado, pose, mirada, id }: { cx: number; lado: 1 | -1; pose: Pose; mirada: { x: number; y: number }; id: string }) {
  // lado: -1 ojo izquierdo, 1 derecho. El giro se refleja para que ambos bajen hacia la nariz.
  const giro = pose.giro * -lado;
  const bordeArriba = -RY + pose.arriba * 2 * RY;
  const bordeAbajo = RY - pose.abajo * 2 * RY;
  const transicion = { transition: "transform 450ms cubic-bezier(.4,1.4,.6,1)" };
  return (
    <g transform={`translate(${cx} 58)`}>
      <clipPath id={id}>
        <ellipse rx={RX} ry={RY} />
      </clipPath>
      <g className="ojito-parpadeo">
        <ellipse rx={RX} ry={RY} fill="#fff" />
        <g clipPath={`url(#${id})`}>
          <g style={{ transform: `translate(${mirada.x}px, ${mirada.y}px)`, transition: "transform 160ms ease-out" }}>
            <circle r={13} fill="#0f172a" />
            <circle r={4.5} cx={-4.5} cy={-5} fill="#fff" />
            <circle r={2} cx={5} cy={4} fill="#fff" opacity={0.8} />
          </g>
          {/* Párpado superior: un rectángulo del color de la cara que baja y se inclina. */}
          <rect x={-60} y={-120} width={120} height={120} fill={pose.cara} style={{ ...transicion, transform: `translate(0px, ${bordeArriba}px) rotate(${giro}deg)` }} />
          {/* Párpado inferior: una curva que sube cuando los ojos sonríen. */}
          <ellipse cx={0} cy={RY + 40} rx={56} ry={40} fill={pose.cara} style={{ ...transicion, transform: `translate(0px, ${bordeAbajo - RY}px)` }} />
        </g>
        {/* Borde del color de la cara: tapa el filo blanco que deja el recorte. */}
        <ellipse rx={RX} ry={RY} fill="none" stroke={pose.cara} strokeWidth={2.5} style={{ transition: "stroke 450ms" }} />
      </g>
      {/* Ceja */}
      <rect
        x={-20}
        y={-3.5}
        width={40}
        height={7}
        rx={3.5}
        fill="#0f172a"
        opacity={0.85}
        style={{ ...transicion, transform: `translate(0px, ${pose.alturaCeja}px) rotate(${pose.ceja * -lado}deg)` }}
      />
      {pose.mejillas && <ellipse cx={lado * 10} cy={RY + 6} rx={13} ry={6} fill="#fda4af" opacity={0.75} />}
      {pose.lagrimas && (
        <g fill="#7dd3fc">
          <path className="ojito-lagrima" d={`M ${lado * 12} ${RY - 6} q -6 10 0 15 q 6 -5 0 -15 z`} />
          <path className="ojito-lagrima ojito-lagrima-2" d={`M ${lado * 20} ${RY - 10} q -5 8 0 12 q 5 -4 0 -12 z`} />
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
      setMira({ x: (dx / d) * 11 * f, y: (dy / d) * 12 * f });
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
    ? { x: Math.cos(vuelta * 0.9) * 9, y: -10 + Math.sin(vuelta * 0.9) * 3 }
    : mira && animo !== "triste" && animo !== "llorando"
      ? mira
      : mira
        ? { x: mira.x * 0.5, y: Math.max(pose.mirada.y, mira.y) }
        : pose.mirada;

  return (
    <svg ref={caja} viewBox="0 0 200 120" role="img" aria-label={etiqueta} className={`ojitos ${className}`}>
      <rect x={4} y={6} width={192} height={108} rx={46} fill={pose.cara} style={{ transition: "fill 450ms" }} />
      <Ojo cx={62} lado={-1} pose={pose} mirada={mirada} id={`${base}-izq`} />
      <Ojo cx={138} lado={1} pose={pose} mirada={mirada} id={`${base}-der`} />
    </svg>
  );
}

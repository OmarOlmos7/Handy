// Íconos de línea para acciones (editar, borrar). SVG en línea, sin dependencias.
const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function IconoLapiz() {
  return (
    <svg {...base}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export function IconoGrafica() {
  return (
    <svg {...base}>
      <path d="M3 3v18h18" />
      <path d="M8 16v-4M13 16V8M18 16v-7" />
    </svg>
  );
}

export function IconoCuaderno() {
  return (
    <svg {...base}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 9h16M4 15h16M10 3v18" />
    </svg>
  );
}

export function IconoBasura() {
  return (
    <svg {...base}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

/** Botón redondo con ícono para editar o borrar. */
export function BotonIcono({
  etiqueta,
  peligro = false,
  ...props
}: React.ComponentProps<"button"> & { etiqueta: string; peligro?: boolean }) {
  return (
    <button
      type="button"
      title={etiqueta}
      aria-label={etiqueta}
      className={`relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition disabled:opacity-40 ${
        peligro ? "hover:bg-error-suave hover:text-error" : "hover:bg-tinta-50 hover:text-tinta-700"
      }`}
      {...props}
    />
  );
}

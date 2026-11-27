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

/** Dos personas (lista de alumnos). */
export function IconoAlumnos() {
  return (
    <svg {...base}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14.2c2.9 0 5 2.4 5 5.3" />
    </svg>
  );
}

/** Espina con ramas (ruta de aprendizaje). */
export function IconoRuta() {
  return (
    <svg {...base}>
      <path d="M3 12h18M7 12l3-5M7 12l3 5M13 12l3-5M13 12l3 5" />
      <circle cx="3.5" cy="12" r="1.5" />
      <circle cx="20.5" cy="12" r="1.5" />
    </svg>
  );
}

/** Mapa de nodos unidos (mapa del temario). */
export function IconoMapa() {
  return (
    <svg {...base}>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="18" cy="8" r="2.5" />
      <circle cx="10" cy="18" r="2.5" />
      <path d="M8.3 7.1 15.6 7.6M7.2 8.2l1.9 7.5M16.6 10.1l-5 6" />
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

/** Caja de archivo (archivar un curso). */
export function IconoArchivar() {
  return (
    <svg {...base}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

/** Caja con flecha hacia arriba (desarchivar o restaurar). */
export function IconoDesarchivar() {
  return (
    <svg {...base}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M12 18v-6M9.5 14.5 12 12l2.5 2.5" />
    </svg>
  );
}

/** Sobre (avisos del curso). */
export function IconoSobre() {
  return (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
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

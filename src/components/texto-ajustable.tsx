"use client";

import { useLayoutEffect, useRef, type ComponentProps } from "react";

/**
 * Cuadro de texto que crece con su contenido para leerlo completo (en lugar de una sola línea
 * que corta el texto). Con `unaLinea`, Enter no agrega saltos: el texto solo se acomoda en
 * varios renglones a la vista (útil para nombres y respuestas cortas).
 */
export function TextoAjustable({
  unaLinea = false,
  minFilas = 1,
  onKeyDown,
  onChange,
  className = "",
  ...props
}: Omit<ComponentProps<"textarea">, "rows"> & { unaLinea?: boolean; minFilas?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function ajustar() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`;
  }

  // Al cambiar el valor (también desde fuera, como al cancelar) y al cambiar el ancho de la pantalla.
  useLayoutEffect(ajustar, [props.value]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let ancho = el.clientWidth;
    const o = new ResizeObserver(() => {
      if (el.clientWidth !== ancho) {
        ancho = el.clientWidth;
        ajustar();
      }
    });
    o.observe(el);
    return () => o.disconnect();
  }, []);

  return (
    <textarea
      ref={ref}
      rows={minFilas}
      className={`resize-none overflow-hidden ${className}`}
      onKeyDown={(e) => {
        if (unaLinea && e.key === "Enter") e.preventDefault();
        onKeyDown?.(e);
      }}
      onChange={(e) => {
        if (unaLinea && /[\r\n]/.test(e.target.value)) e.target.value = e.target.value.replace(/\s*[\r\n]+\s*/g, " ");
        onChange?.(e);
        ajustar();
      }}
      {...props}
    />
  );
}

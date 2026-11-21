"use client";

// Mide el tiempo que el alumno tiene abierta la actividad: cuenta solo mientras la pestaña está
// visible y hubo uso (teclado, ratón, toque o desplazamiento) en los últimos 2 minutos, y lo manda
// cada 30 s. No muestra nada.
import { useEffect } from "react";

const CADA = 30_000;
const INACTIVO = 120_000;

export function CronometroActividad({ actividadId }: { actividadId: string }) {
  useEffect(() => {
    let acumulado = 0;
    let ultimoUso = Date.now();
    let ultimoTic = Date.now();
    const uso = () => (ultimoUso = Date.now());
    const tic = () => {
      const ahora = Date.now();
      if (document.visibilityState === "visible" && ahora - ultimoUso < INACTIVO) acumulado += (ahora - ultimoTic) / 1000;
      ultimoTic = ahora;
    };
    const enviar = (alSalir = false) => {
      tic();
      const segundos = Math.round(acumulado);
      if (segundos < 1) return;
      acumulado = 0;
      const cuerpo = JSON.stringify({ actividadId, segundos });
      if (alSalir && navigator.sendBeacon) navigator.sendBeacon("/api/tiempo", new Blob([cuerpo], { type: "application/json" }));
      else fetch("/api/tiempo", { method: "POST", headers: { "Content-Type": "application/json" }, body: cuerpo, keepalive: true }).catch(() => {});
    };
    const visibilidad = () => {
      if (document.visibilityState === "hidden") enviar(true);
      else ultimoTic = Date.now();
    };
    const eventos = ["keydown", "pointerdown", "pointermove", "scroll", "touchstart"] as const;
    eventos.forEach((e) => window.addEventListener(e, uso, { passive: true }));
    document.addEventListener("visibilitychange", visibilidad);
    const salir = () => enviar(true);
    window.addEventListener("pagehide", salir);
    const intervalo = window.setInterval(() => enviar(), CADA);
    return () => {
      window.clearInterval(intervalo);
      eventos.forEach((e) => window.removeEventListener(e, uso));
      document.removeEventListener("visibilitychange", visibilidad);
      window.removeEventListener("pagehide", salir);
      enviar(true);
    };
  }, [actividadId]);
  return null;
}

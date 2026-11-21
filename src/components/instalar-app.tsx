"use client";

import { useEffect, useState } from "react";

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
}

/** Ofrece instalar la web como app: botón en Android y computadoras, instrucciones en iPhone/iPad. */
export function InstalarApp({
  textos = {
    instalar: "Instalar iEureka-Grader como app",
    antes: "Para usarla como app en tu iPhone o iPad: toca ",
    compartir: "Compartir",
    medio: " y luego ",
    agregar: "Agregar a inicio",
    despues: ".",
  },
}: {
  textos?: { instalar: string; antes: string; compartir: string; medio: string; agregar: string; despues: string };
}) {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [ios, setIos] = useState(false);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- se lee del navegador solo después de montar
    setInstalada(standalone);
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    const guardar = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    window.addEventListener("beforeinstallprompt", guardar);
    return () => window.removeEventListener("beforeinstallprompt", guardar);
  }, []);

  if (instalada) return null;
  if (evento) {
    return (
      <button
        type="button"
        onClick={async () => {
          await evento.prompt();
          setEvento(null);
        }}
        className="mt-4 w-full rounded-lg bg-tinta-50 px-4 py-2 text-sm font-medium text-tinta-700 ring-1 ring-tinta-200 hover:bg-tinta-100"
      >
        {textos.instalar}
      </button>
    );
  }
  if (ios) {
    return (
      <p className="mt-4 rounded-lg bg-tinta-50 p-3 text-xs text-tinta-700">
        {textos.antes}
        <strong>{textos.compartir}</strong>
        {textos.medio}
        <strong>{textos.agregar}</strong>
        {textos.despues}
      </p>
    );
  }
  return null;
}

"use client";

// Fecha, hora y clima del encabezado (encima del nombre del usuario).
// La fecha y la hora son las del dispositivo del usuario; el clima y la ciudad los da /api/clima
// según su IP. Si el clima no está disponible, solo se ve la fecha y la hora.
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Clima, EstadoClima } from "@/lib/clima";
import { useTextos } from "./proveedor-textos";

/** Se vuelve a pedir el clima cada 30 minutos mientras la página sigue abierta. */
const REFRESCO_CLIMA_MS = 30 * 60_000;

// Reloj compartido: avisa cada 15 segundos (la hora cambia a tiempo sin redibujar cada segundo).
const PASO_RELOJ_MS = 15_000;
function suscribirReloj(aviso: () => void) {
  const id = setInterval(aviso, PASO_RELOJ_MS);
  return () => clearInterval(id);
}
const instante = () => Math.floor(Date.now() / PASO_RELOJ_MS);
// En el servidor no se sabe la zona horaria del usuario: no se dibuja la hora hasta el navegador.
const instanteServidor = () => 0;

function mayuscula(s: string) {
  return s.charAt(0).toLocaleUpperCase() + s.slice(1);
}

export function FechaClima() {
  const { t, locale } = useTextos();
  const tick = useSyncExternalStore(suscribirReloj, instante, instanteServidor);
  const [clima, setClima] = useState<Clima | null>(null);

  useEffect(() => {
    let vivo = true;
    const pedir = () =>
      fetch("/api/clima")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { clima?: Clima | null } | null) => {
          if (vivo && d?.clima) setClima(d.clima);
        })
        .catch(() => {
          // Sin red o sin servicio: se queda lo último que se mostró.
        });
    pedir();
    const id = setInterval(pedir, REFRESCO_CLIMA_MS);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  const ahora = tick ? new Date(tick * PASO_RELOJ_MS) : null;
  const fechaLarga = ahora && mayuscula(ahora.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  const fechaCorta = ahora && mayuscula(ahora.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }));
  const hora = ahora?.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const nombreEstado = clima && textoEstado(clima.estado, clima.noche, t.barra.clima);

  return (
    <div className="flex min-h-6 items-center justify-end gap-x-2 text-xs text-slate-600" aria-live="off">
      {ahora && (
        <time dateTime={ahora.toISOString()} className="flex items-center gap-x-2 whitespace-nowrap">
          <span className="hidden lg:inline">{fechaLarga}</span>
          <span className="lg:hidden">{fechaCorta}</span>
          <span className="font-semibold tabular-nums text-slate-800">{hora}</span>
        </time>
      )}
      {clima && (
        <span
          className="flex min-w-0 items-center gap-1 whitespace-nowrap rounded-full bg-slate-50 py-0.5 pl-1 pr-2 ring-1 ring-slate-200"
          title={`${nombreEstado} · ${t.barra.clima.fuente}`}
        >
          <IconoClima estado={clima.estado} noche={clima.noche} etiqueta={nombreEstado!} />
          <span className="font-semibold tabular-nums text-slate-800">{clima.temperatura} °C</span>
          <span className="max-w-[9rem] truncate text-slate-600 sm:max-w-[14rem]">{clima.ciudad}</span>
        </span>
      )}
    </div>
  );
}

function textoEstado(
  estado: EstadoClima,
  noche: boolean,
  t: { soleado: string; despejado: string; medioNublado: string; nublado: string; lluvia: string; tormenta: string },
) {
  switch (estado) {
    case "soleado":
      return noche ? t.despejado : t.soleado;
    case "medio-nublado":
      return t.medioNublado;
    case "nublado":
      return t.nublado;
    case "lluvia":
      return t.lluvia;
    case "tormenta":
      return t.tormenta;
  }
}

// Íconos a color en un cuadro de 24×24: sol (o luna de noche), sol con nube, nube, nube con
// gotas y nube oscura con rayo.
const NUBE = "M7 19h10.5a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.4 9.6 4.75 4.75 0 0 0 7 19Z";
const NUBE_CHICA = "M8.5 18h8a3.25 3.25 0 0 0 .45-6.47 4.5 4.5 0 0 0-8.6-1.08A3.8 3.8 0 0 0 8.5 18Z";

function Sol({ cx = 12, cy = 12, r = 4.2, rayos = true }: { cx?: number; cy?: number; r?: number; rayos?: boolean }) {
  return (
    <g>
      {rayos &&
        Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          const r1 = r + 1.8;
          const r2 = r + 3.6;
          return (
            <line
              key={i}
              x1={cx + r1 * Math.cos(a)}
              y1={cy + r1 * Math.sin(a)}
              x2={cx + r2 * Math.cos(a)}
              y2={cy + r2 * Math.sin(a)}
              stroke="#f59e0b"
              strokeWidth={1.7}
              strokeLinecap="round"
            />
          );
        })}
      <circle cx={cx} cy={cy} r={r} fill="#fbbf24" stroke="#f59e0b" strokeWidth={1} />
    </g>
  );
}

function Luna({ cx = 12, cy = 12, r = 6 }: { cx?: number; cy?: number; r?: number }) {
  // Media luna: círculo con un mordisco hacia la derecha arriba.
  const d = `M${cx + r * 0.35} ${cy - r} A${r} ${r} 0 1 0 ${cx + r} ${cy + r * 0.35} A${r * 0.8} ${r * 0.8} 0 0 1 ${cx + r * 0.35} ${cy - r} Z`;
  return <path d={d} fill="#c7d2fe" stroke="#6366f1" strokeWidth={1} strokeLinejoin="round" />;
}

export function IconoClima({ estado, noche, etiqueta }: { estado: EstadoClima; noche: boolean; etiqueta: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" role="img" aria-label={etiqueta}>
      <title>{etiqueta}</title>
      {estado === "soleado" && (noche ? <Luna /> : <Sol />)}
      {estado === "medio-nublado" && (
        <>
          {noche ? <Luna cx={9} cy={8.5} r={5} /> : <Sol cx={9} cy={8.5} r={3.4} />}
          <path d={NUBE_CHICA} transform="translate(1.5 2)" fill="#f1f5f9" stroke="#94a3b8" strokeWidth={1.2} strokeLinejoin="round" />
        </>
      )}
      {estado === "nublado" && (
        <>
          <path d={NUBE_CHICA} transform="translate(-3.5 -4.5) scale(1.05)" fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1.1} strokeLinejoin="round" />
          <path d={NUBE} fill="#f1f5f9" stroke="#64748b" strokeWidth={1.3} strokeLinejoin="round" />
        </>
      )}
      {estado === "lluvia" && (
        <>
          <path d={NUBE} transform="translate(0 -4)" fill="#e2e8f0" stroke="#64748b" strokeWidth={1.3} strokeLinejoin="round" />
          {[7.5, 12, 16.5].map((x, i) => (
            <line key={x} x1={x} y1={17.2 + (i % 2)} x2={x - 1.3} y2={20.8 + (i % 2)} stroke="#3b82f6" strokeWidth={1.8} strokeLinecap="round" />
          ))}
        </>
      )}
      {estado === "tormenta" && (
        <>
          <path d={NUBE} transform="translate(0 -4)" fill="#94a3b8" stroke="#475569" strokeWidth={1.3} strokeLinejoin="round" />
          <path d="M12.8 13.5 9.8 18.3h2.6l-1.4 4.2 4.3-5.6h-2.7l1.5-3.4Z" fill="#facc15" stroke="#ca8a04" strokeWidth={0.8} strokeLinejoin="round" />
          <line x1={7} y1={17} x2={6.2} y2={19.4} stroke="#3b82f6" strokeWidth={1.6} strokeLinecap="round" />
          <line x1={17.5} y1={17} x2={16.7} y2={19.4} stroke="#3b82f6" strokeWidth={1.6} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  agendarAsesoria,
  cancelarAsesoriaAlumno,
  cancelarAsesoriaProfesor,
  fechasCurso,
  registrarAsesoria,
} from "@/app/acciones-asesorias";
import { DURACIONES, FRANJAS, MAX_COMENTARIOS, MAX_NOTAS, MAX_TEMA, MINUTOS_FRANJA, MOTIVOS, duracionTexto, hora, type FranjaAlumno } from "@/lib/asesorias";
import type { AsesoriaVista, EstadoVista } from "@/lib/asesorias-vista";
import type { EntregaCalendario } from "@/lib/agenda-hoy";
import { formato } from "@/lib/i18n/idiomas";
import { BotonIcono, IconoCalendario, IconoEngrane } from "./iconos";
import { useTextos } from "./proveedor-textos";
import { Boton, Insignia, campo, type Tono } from "./ui";

const TONO_ESTADO: Record<EstadoVista, Tono> = {
  agendada: "azul",
  realizada: "verde",
  no_asistio: "rojo",
  cancelada: "gris",
  porRegistrar: "ambar",
};

export function InsigniaAsesoria({ estado }: { estado: EstadoVista }) {
  const te = useTextos().t.asesorias.estado;
  return <Insignia tono={TONO_ESTADO[estado]}>{te[estado]}</Insignia>;
}

/** Ícono de calendario de la tarjeta del curso (agenda de asesorías). */
export function BotonCalendario({ href, etiqueta, pendientes = 0 }: { href: string; etiqueta: string; pendientes?: number }) {
  return (
    <Link
      href={href}
      title={etiqueta}
      aria-label={pendientes ? `${etiqueta} (${pendientes})` : etiqueta}
      className={`relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-tinta-50 hover:text-tinta-700 ${pendientes ? "text-tinta-700" : "text-slate-500"}`}
    >
      <IconoCalendario />
      {pendientes > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[1.15rem] rounded-full bg-tinta-600 px-1 text-center text-[11px] leading-[1.15rem] font-semibold text-white ring-2 ring-white">
          {pendientes > 99 ? "99+" : pendientes}
        </span>
      )}
    </Link>
  );
}

/** Renglón de la tarjeta con el resumen de asesorías del curso (cantidad y tiempo). */
export function ResumenTarjeta({ href, realizadas, minutos, periodo }: { href: string; realizadas: number; minutos: number; periodo?: string }) {
  const ta = useTextos().t.asesorias;
  return (
    <Link
      href={href}
      className="relative z-10 mt-2 block w-fit rounded-md text-xs text-slate-600 hover:text-tinta-700 hover:underline"
    >
      <span className="font-medium">
        <span aria-hidden>🙋</span> {realizadas ? formato(ta.tarjetaResumen, { n: realizadas, t: duracionTexto(minutos) }) : ta.tarjetaResumenVacio}
      </span>
      {periodo && <span className="block pl-5 text-slate-400">{periodo}</span>}
    </Link>
  );
}

/**
 * Engrane de la tarjeta del curso: fechas de inicio y fin del curso. Abre un panelito sobre la
 * tarjeta para no cambiar su tamaño.
 */
export function AjustesCurso({ grupoId, inicio, fin }: { grupoId: string; inicio?: string; fin?: string }) {
  const router = useRouter();
  const ta = useTextos().t.asesorias.ajustes;
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setError("");
    iniciar(async () => {
      const r = await fechasCurso(grupoId, String(d.get("inicio") ?? ""), String(d.get("fin") ?? ""));
      if ("error" in r) setError(r.error);
      else {
        setAbierto(false);
        router.refresh();
      }
    });
  }

  return (
    <span className="relative inline-flex">
      <BotonIcono etiqueta={ta.titulo} onClick={() => setAbierto((x) => !x)} aria-expanded={abierto}>
        <IconoEngrane />
      </BotonIcono>
      {abierto && (
        <form
          onSubmit={guardar}
          className="absolute top-10 right-0 z-30 w-[min(18rem,calc(100vw-3rem))] space-y-2 rounded-xl bg-white p-4 text-left shadow-lg ring-1 ring-slate-200"
          onKeyDown={(e) => e.key === "Escape" && setAbierto(false)}
        >
          <p className="font-semibold text-slate-900">⚙️ {ta.titulo}</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-medium text-slate-500">
              {ta.inicio}
              <input type="date" name="inicio" defaultValue={inicio} className={`${campo} !px-2 !py-1.5`} autoFocus />
            </label>
            <label className="block text-xs font-medium text-slate-500">
              {ta.fin}
              <input type="date" name="fin" defaultValue={fin} className={`${campo} !px-2 !py-1.5`} />
            </label>
          </div>
          <p className="text-xs text-slate-500">{ta.ayuda}</p>
          {error && <p className="text-xs text-error">{error}</p>}
          <div className="flex gap-2">
            <Boton type="submit" disabled={pendiente} className="!px-3 !py-1.5">
              {ta.guardar}
            </Boton>
            <Boton type="button" variante="secundario" className="!px-3 !py-1.5" onClick={() => setAbierto(false)}>
              {ta.cancelar}
            </Boton>
          </div>
        </form>
      )}
    </span>
  );
}

/** Datos de una asesoría (lo que pidió el alumno y lo que anotó el profesor). */
function Detalle({ a }: { a: AsesoriaVista }) {
  const ta = useTextos().t.asesorias;
  const tf = ta.ficha;
  return (
    <dl className="mt-2 space-y-2 text-sm">
      {a.motivo && (
        <div>
          <dt className="text-xs font-medium text-slate-500">{ta.motivos.titulo}</dt>
          <dd className="text-slate-800">{ta.motivos[a.motivo as keyof typeof ta.motivos]}</dd>
        </div>
      )}
      <div>
        <dt className="text-xs font-medium text-slate-500">{tf.comentarios}</dt>
        <dd className="whitespace-pre-line text-slate-800">{a.comentarios || <span className="text-slate-400">{tf.sinComentarios}</span>}</dd>
      </div>
      {a.revisado && (
        <div className="rounded-lg bg-acierto-suave/50 px-3 py-2">
          <dt className="text-xs font-medium text-acierto">{tf.revisado}</dt>
          <dd className="whitespace-pre-line text-slate-800">{a.revisado}</dd>
        </div>
      )}
      {a.acuerdos && (
        <div className="rounded-lg bg-tinta-50 px-3 py-2">
          <dt className="text-xs font-medium text-tinta-700">{tf.acuerdos}</dt>
          <dd className="whitespace-pre-line text-slate-800">{a.acuerdos}</dd>
        </div>
      )}
    </dl>
  );
}

function Encabezado({ a, mostrarCurso }: { a: AsesoriaVista; mostrarCurso?: boolean }) {
  const ta = useTextos().t.asesorias;
  const tf = ta.ficha;
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900 first-letter:uppercase">
          {formato(tf.cuando, { dia: a.dia, hora: a.horario, dur: a.duracionTexto })}
        </p>
        <p className="mt-0.5 text-sm text-slate-700">
          {a.alumno && <span className="font-medium">{a.alumno} · </span>}
          <span className="text-slate-500">{tf.tema}:</span> {a.tema}
        </p>
        {mostrarCurso && a.curso && <p className="text-xs text-slate-500">{a.curso}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {a.recordatorio && a.estado === "agendada" && <span className="text-xs text-slate-500">🔔 {tf.recordatorio}</span>}
        {a.duracionReal && <span className="text-xs text-slate-500">{formato(tf.duracionReal, { dur: duracionTexto(a.duracionReal) })}</span>}
        <InsigniaAsesoria estado={a.estadoVista} />
      </div>
    </div>
  );
}

/** Ficha de una asesoría para el profesor: detalle, registro de lo revisado y cancelar. */
export function FichaAsesoriaProfesor({ a, mostrarCurso, abierta = false }: { a: AsesoriaVista; mostrarCurso?: boolean; abierta?: boolean }) {
  const router = useRouter();
  const ta = useTextos().t.asesorias;
  const tr = ta.registrar;
  const [editando, setEditando] = useState(abierta && a.estado === "agendada" && a.pasada);
  const [asistio, setAsistio] = useState(a.estado !== "no_asistio");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await registrarAsesoria(a.id, {
        estado: asistio ? "realizada" : "no_asistio",
        revisado: String(d.get("revisado") ?? ""),
        acuerdos: String(d.get("acuerdos") ?? ""),
        minutos: Number(d.get("minutos")) || undefined,
      });
      if ("error" in r) setMensaje({ ok: false, texto: r.error });
      else {
        setMensaje({ ok: true, texto: tr.guardado });
        setEditando(false);
        router.refresh();
      }
    });
  }

  function cancelar() {
    if (!window.confirm(tr.confirmarCancelar)) return;
    iniciar(async () => {
      const r = await cancelarAsesoriaProfesor(a.id);
      if ("error" in r) setMensaje({ ok: false, texto: r.error });
      else router.refresh();
    });
  }

  return (
    <li id={`asesoria-${a.id}`} className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${a.estadoVista === "porRegistrar" ? "ring-aviso/40" : "ring-slate-200"} ${pendiente ? "opacity-60" : ""}`}>
      <Encabezado a={a} mostrarCurso={mostrarCurso} />
      {a.conflicto && <p className="mt-2 rounded-md bg-aviso-suave px-2 py-1 text-xs text-aviso">⚠️ {ta.profesor.conflicto}</p>}
      {a.canceladaPor && <p className="mt-1 text-xs text-slate-500">{a.canceladaPor === "alumno" ? ta.ficha.canceladaAlumno : ta.ficha.canceladaProfesor}</p>}
      <Detalle a={a} />
      {a.estado !== "cancelada" &&
        (editando ? (
          <form onSubmit={guardar} className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-800">{tr.titulo}</p>
            <div className="inline-flex rounded-lg bg-white p-1 text-sm ring-1 ring-slate-200" role="radiogroup">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={asistio === v}
                  onClick={() => setAsistio(v)}
                  className={`rounded-md px-3 py-1 font-medium ${asistio === v ? (v ? "bg-acierto text-white" : "bg-error text-white") : "text-slate-600"}`}
                >
                  {v ? tr.asistio : tr.noAsistio}
                </button>
              ))}
            </div>
            {asistio && (
              <>
                <label className="block text-xs font-medium text-slate-500">
                  {tr.revisado}
                  <textarea name="revisado" defaultValue={a.revisado} rows={3} maxLength={MAX_NOTAS} placeholder={tr.revisadoAyuda} className={campo} />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  {tr.acuerdos}
                  <textarea name="acuerdos" defaultValue={a.acuerdos} rows={2} maxLength={MAX_NOTAS} placeholder={tr.acuerdosAyuda} className={campo} />
                </label>
                <label className="block w-40 text-xs font-medium text-slate-500">
                  {tr.minutos}
                  <input type="number" name="minutos" min={5} max={240} step={5} defaultValue={a.duracionReal ?? a.duracion} className={campo} />
                </label>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Boton type="submit" disabled={pendiente} className="!px-3 !py-1.5">
                {tr.guardar}
              </Boton>
              <Boton type="button" variante="secundario" className="!px-3 !py-1.5" onClick={() => setEditando(false)}>
                {ta.ajustes.cancelar}
              </Boton>
            </div>
          </form>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <Boton type="button" variante={a.estadoVista === "porRegistrar" ? "primario" : "secundario"} className="!px-3 !py-1.5" onClick={() => setEditando(true)}>
              📝 {a.estado === "agendada" ? tr.titulo : tr.editar}
            </Boton>
            {a.estado === "agendada" && !a.pasada && (
              <Boton type="button" variante="fantasma" className="!px-3 !py-1.5 !text-error" onClick={cancelar} disabled={pendiente}>
                {tr.cancelar}
              </Boton>
            )}
          </div>
        ))}
      {mensaje && <p className={`mt-2 text-xs ${mensaje.ok ? "text-acierto" : "text-error"}`}>{mensaje.texto}</p>}
    </li>
  );
}

type Filtro = "todas" | "proximas" | "porRegistrar" | "realizadas" | "otras";

/** Bitácora de asesorías del curso para el profesor, con filtros. */
export function BitacoraAsesorias({ asesorias, abrir }: { asesorias: AsesoriaVista[]; abrir?: string }) {
  const tc = useTextos().t.asesorias.curso;
  const [filtro, setFiltro] = useState<Filtro>(asesorias.some((a) => a.estadoVista === "porRegistrar") ? "porRegistrar" : "todas");
  const pasa: Record<Filtro, (a: AsesoriaVista) => boolean> = {
    todas: () => true,
    proximas: (a) => a.estadoVista === "agendada",
    porRegistrar: (a) => a.estadoVista === "porRegistrar",
    realizadas: (a) => a.estado === "realizada",
    otras: (a) => a.estado === "cancelada" || a.estado === "no_asistio",
  };
  // Las próximas de la más cercana a la más lejana; el resto, la más reciente primero.
  const lista = asesorias.filter(pasa[filtro]).sort((a, b) => (filtro === "proximas" ? 1 : -1) * (a.fecha.localeCompare(b.fecha) || a.inicio - b.inicio));
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(Object.keys(pasa) as Filtro[]).map((f) => {
          const n = asesorias.filter(pasa[f]).length;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${filtro === f ? "bg-tinta-600 text-white ring-tinta-600" : "bg-white text-slate-600 ring-slate-300 hover:ring-tinta-300"}`}
            >
              {tc.filtros[f]} ({n})
            </button>
          );
        })}
      </div>
      {lista.length === 0 ? (
        <p className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{asesorias.length ? tc.vacioFiltro : tc.sinAsesorias}</p>
      ) : (
        <ul className="space-y-3">
          {lista.map((a) => (
            <FichaAsesoriaProfesor key={a.id} a={a} abierta={a.id === abrir} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Lista de asesorías del alumno en el curso, con cancelar las que no han empezado. */
export function MisAsesorias({ asesorias }: { asesorias: AsesoriaVista[] }) {
  const router = useRouter();
  const ta = useTextos().t.asesorias;
  const tal = ta.alumno;
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const proximas = asesorias.filter((a) => !a.pasada && a.estado === "agendada");
  const anteriores = asesorias.filter((a) => !proximas.includes(a)).reverse();

  function cancelar(id: string) {
    if (!window.confirm(tal.confirmarCancelar)) return;
    iniciar(async () => {
      const r = await cancelarAsesoriaAlumno(id);
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }

  if (!asesorias.length) return <p className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{tal.ninguna}</p>;
  const bloque = (titulo: string, lista: AsesoriaVista[]) =>
    lista.length > 0 && (
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-600">
          {titulo} ({lista.length})
        </h3>
        <ul className="space-y-3">
          {lista.map((a) => (
            <li key={a.id} id={`asesoria-${a.id}`} className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${pendiente ? "opacity-60" : ""}`}>
              <Encabezado a={{ ...a, estadoVista: a.estadoVista === "porRegistrar" ? "agendada" : a.estadoVista }} />
              {a.canceladaPor && <p className="mt-1 text-xs text-slate-500">{a.canceladaPor === "alumno" ? ta.ficha.canceladaAlumno : ta.ficha.canceladaProfesor}</p>}
              <Detalle a={a} />
              {a.puedeCancelar && (
                <Boton type="button" variante="fantasma" className="mt-2 !px-3 !py-1.5 !text-error" onClick={() => cancelar(a.id)} disabled={pendiente}>
                  {tal.cancelar}
                </Boton>
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  return (
    <div className="space-y-5">
      {error && <p className="text-sm text-error">{error}</p>}
      {bloque(tal.proximas, proximas)}
      {bloque(tal.anteriores, anteriores)}
    </div>
  );
}

const COLOR_FRANJA: Record<FranjaAlumno, string> = {
  libre: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer",
  mia: "bg-tinta-600 text-white",
  ocupada: "bg-slate-300 text-slate-600",
  no: "bg-[repeating-linear-gradient(135deg,#f1f5f9_0_6px,#e2e8f0_6px_8px)] text-slate-400",
  pasada: "bg-slate-50 text-slate-300",
  fuera: "bg-slate-50 text-slate-300",
};

/**
 * Agenda de la semana del profesor vista por el alumno: toca una franja verde, escribe el tema y
 * los avances o el contexto, y agenda su asesoría.
 */
export function AgendaAlumno({
  grupoId,
  fechas,
  hoy,
  franjas,
  rutaBase,
  anterior,
  siguiente,
  actual,
  semana,
  sinAgenda,
  asuetos = {},
  entregas = [],
}: {
  /** Asuetos oficiales de la semana (fecha → nombre). */
  asuetos?: Record<string, string>;
  /** Cierres de entrega del curso en la semana. */
  entregas?: EntregaCalendario[];
  grupoId: string;
  fechas: string[];
  hoy: string;
  franjas: Record<string, FranjaAlumno[]>;
  rutaBase: string;
  anterior: string;
  siguiente: string;
  actual: string;
  semana: string;
  sinAgenda: boolean;
}) {
  const router = useRouter();
  const { t, locale } = useTextos();
  const ta = t.asesorias;
  const tal = ta.alumno;
  const [elegida, setElegida] = useState<{ fecha: string; inicio: number; dia: number } | null>(null);
  const [duracion, setDuracion] = useState<number>(30);
  const [motivo, setMotivo] = useState("");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [diaMovil, setDiaMovil] = useState(() => Math.max(0, fechas.indexOf(hoy)));
  const [pendiente, iniciar] = useTransition();
  const fechaCorta = (f: string) => new Date(`${f}T12:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
  const hayLibres = Object.values(franjas).some((l) => l.includes("libre"));
  const entregasEn = new Map<string, EntregaCalendario[]>();
  for (const x of entregas) entregasEn.set(`${x.fecha}|${x.inicio}`, [...(entregasEn.get(`${x.fecha}|${x.inicio}`) ?? []), x]);
  const pildora = (lista: EntregaCalendario[] | undefined) =>
    lista?.length ? (
      <span className="pointer-events-none absolute top-0.5 right-0.5 bottom-0.5 flex max-w-[75%] items-center gap-0.5 rounded bg-orange-500 px-1 text-[10px] font-semibold text-white shadow-sm">
        <span className="truncate">
          📥 {lista[0].titulo} · {hora(lista[0].cierre)}
        </span>
        {lista.length > 1 && <span className="shrink-0">+{lista.length - 1}</span>}
      </span>
    ) : null;

  /** ¿Se puede pedir una hora completa desde esta franja? */
  const cabeHora = (fecha: string, inicio: number) => {
    const j = FRANJAS.indexOf(inicio);
    return franjas[fecha]?.[j + 1] === "libre";
  };

  function elegir(fecha: string, inicio: number, dia: number) {
    setElegida({ fecha, inicio, dia });
    setMensaje(null);
    if (!cabeHora(fecha, inicio)) setDuracion(30);
    setTimeout(() => document.getElementById("solicitud-asesoria")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!elegida) return;
    const d = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await agendarAsesoria({
        grupoId,
        fecha: elegida.fecha,
        inicio: elegida.inicio,
        duracion,
        tema: String(d.get("tema") ?? ""),
        motivo,
        comentarios: String(d.get("comentarios") ?? ""),
      });
      if ("error" in r) setMensaje({ ok: false, texto: r.error });
      else {
        setMensaje({ ok: true, texto: tal.agendada });
        setElegida(null);
        setMotivo("");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`${rutaBase}semana=${anterior}`} className="rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300 hover:bg-slate-50" aria-label={ta.semana.anterior} title={ta.semana.anterior}>
          ←
        </Link>
        {semana !== actual && (
          <Link href={`${rutaBase}semana=${actual}`} className="rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300 hover:bg-slate-50">
            {ta.semana.hoy}
          </Link>
        )}
        <Link href={`${rutaBase}semana=${siguiente}`} className="rounded-lg bg-white px-3 py-1.5 text-sm ring-1 ring-slate-300 hover:bg-slate-50" aria-label={ta.semana.siguiente} title={ta.semana.siguiente}>
          →
        </Link>
        <span className="text-sm font-medium text-slate-700">{formato(ta.semana.rango, { i: fechaCorta(fechas[0]), f: fechaCorta(fechas[4]) })}</span>
      </div>
      <p className="text-sm text-slate-600">{sinAgenda ? tal.sinAgenda : hayLibres ? tal.elegir : tal.sinLibres}</p>
      {mensaje && (
        <p role="status" className={`rounded-lg px-3 py-2 text-sm ${mensaje.ok ? "bg-acierto-suave text-acierto" : "bg-error-suave text-error"}`}>
          {mensaje.texto}
        </p>
      )}

      <div className="flex gap-1 sm:hidden" role="tablist">
        {fechas.map((f, i) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={diaMovil === i}
            onClick={() => setDiaMovil(i)}
            className={`flex-1 rounded-lg px-1 py-1.5 text-xs font-medium ${diaMovil === i ? "bg-tinta-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {ta.diasCortos[i]}
            <span className="block text-[11px] opacity-80">{fechaCorta(f)}</span>
            {(franjas[f] ?? []).includes("libre") && <span className="mx-auto mt-0.5 block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex">
          <div className="w-14 shrink-0 border-r border-slate-200 bg-slate-50">
            <div className="h-14 border-b border-slate-200" />
            {FRANJAS.map((m) => (
              <div key={m} className={`flex h-8 items-start justify-end pr-1.5 text-[11px] text-slate-500 ${m % 60 === 0 ? "border-t border-slate-200" : "border-t border-dashed border-slate-100"}`}>
                {hora(m)}
              </div>
            ))}
          </div>
          {fechas.map((fecha, i) => (
            <div key={fecha} className={`min-w-0 flex-1 border-r border-slate-100 last:border-r-0 ${diaMovil === i ? "" : "hidden sm:block"}`}>
              <div className={`flex h-14 flex-col items-center justify-center border-b border-slate-200 px-1 text-center ${fecha === hoy ? "bg-tinta-50" : ""}`}>
                <span className="text-xs font-semibold text-slate-700">
                  <span className="hidden lg:inline">{ta.dias[i]}</span>
                  <span className="lg:hidden">{ta.diasCortos[i]}</span>
                </span>
                <span className={`text-[11px] ${fecha === hoy ? "font-semibold text-tinta-700" : "text-slate-500"}`}>{fechaCorta(fecha)}</span>
                {asuetos[fecha] && (
                  <span className="w-full truncate text-[10px] font-medium text-red-700" title={formato(tal.asueto, { n: asuetos[fecha] })}>
                    🎉 {asuetos[fecha]}
                  </span>
                )}
              </div>
              {FRANJAS.map((m, j) => {
                const e = franjas[fecha]?.[j] ?? "no";
                const ents = entregasEn.get(`${fecha}|${m}`);
                const elegidaAqui = elegida && elegida.fecha === fecha && m >= elegida.inicio && m < elegida.inicio + duracion;
                const etiqueta = [`${ta.dias[i]} ${hora(m)}: ${tal.leyenda[e]}`, ...(ents ?? []).map((x) => `📥 ${x.titulo} (${formato(ta.profesor.cierra, { h: hora(x.cierre) })})`)].join(" · ");
                const borde = m % 60 === 0 ? "border-t border-slate-200" : "border-t border-dashed border-slate-100";
                return e === "libre" ? (
                  <button
                    key={m}
                    type="button"
                    aria-label={etiqueta}
                    title={etiqueta}
                    onClick={() => elegir(fecha, m, i)}
                    className={`relative block h-8 w-full px-1.5 text-left text-[11px] font-medium ${borde} ${elegidaAqui ? "bg-tinta-500 text-white" : COLOR_FRANJA.libre}`}
                  >
                    {hora(m)}
                    {pildora(ents)}
                  </button>
                ) : (
                  <div key={m} title={etiqueta} className={`relative h-8 px-1.5 pt-0.5 text-[11px] ${borde} ${COLOR_FRANJA[e]}`}>
                    {e === "mia" && (j === 0 || franjas[fecha]?.[j - 1] !== "mia") && <span className="font-medium">🙋 {tal.leyenda.mia}</span>}
                    {pildora(ents)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {(["libre", "mia", "ocupada", "no", "pasada"] as FranjaAlumno[]).map((e) => (
          <li key={e} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded ring-1 ring-black/5 ${COLOR_FRANJA[e]}`} /> {tal.leyenda[e]}
          </li>
        ))}
        {entregas.length > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-orange-500" /> {tal.entregaLeyenda}
          </li>
        )}
      </ul>

      {elegida && (
        <form id="solicitud-asesoria" onSubmit={enviar} className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-2 ring-tinta-300">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900">🙋 {tal.solicitar}</h3>
              <p className="text-sm text-slate-600 first-letter:uppercase">
                {formato(tal.franjaElegida, {
                  dia: new Date(`${elegida.fecha}T12:00:00Z`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
                  hora: `${hora(elegida.inicio)} – ${hora(elegida.inicio + duracion)}`,
                })}
              </p>
            </div>
            <button type="button" onClick={() => setElegida(null)} className="text-sm text-slate-500 hover:text-slate-800">
              ✕ {tal.cerrar}
            </button>
          </div>
          <fieldset>
            <legend className="text-xs font-medium text-slate-500">{tal.duracion}</legend>
            <div className="mt-1 flex gap-2">
              {DURACIONES.map((d) => {
                const puede = d === MINUTOS_FRANJA || cabeHora(elegida.fecha, elegida.inicio);
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={!puede}
                    onClick={() => setDuracion(d)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 disabled:opacity-40 ${duracion === d ? "bg-tinta-600 text-white ring-tinta-600" : "bg-white text-slate-700 ring-slate-300"}`}
                  >
                    {duracionTexto(d)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className="block text-xs font-medium text-slate-500">
            {tal.tema} *
            <input name="tema" required maxLength={MAX_TEMA} placeholder={tal.temaAyuda} className={campo} autoFocus />
          </label>
          <fieldset>
            <legend className="text-xs font-medium text-slate-500">{ta.motivos.titulo}</legend>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {MOTIVOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={motivo === m}
                  onClick={() => setMotivo(motivo === m ? "" : m)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${motivo === m ? "bg-tinta-600 text-white ring-tinta-600" : "bg-white text-slate-600 ring-slate-300 hover:ring-tinta-300"}`}
                >
                  {ta.motivos[m]}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block text-xs font-medium text-slate-500">
            {tal.comentarios}
            <textarea name="comentarios" rows={3} maxLength={MAX_COMENTARIOS} placeholder={tal.comentariosAyuda} className={campo} />
          </label>
          <Boton type="submit" disabled={pendiente}>
            {pendiente ? tal.enviando : tal.enviar}
          </Boton>
        </form>
      )}
    </div>
  );
}

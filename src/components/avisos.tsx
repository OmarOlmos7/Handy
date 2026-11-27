"use client";

// Avisos del curso: el sobre de la tarjeta (con los no leídos), el formulario para escribir un aviso
// con anexos y la lista de avisos. Al abrir un aviso se marca como leído para quien lo abre.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { borrarAviso, marcarAvisoLeido } from "@/app/acciones-avisos";
import { MAX_ANEXOS_AVISO, MAX_ASUNTO, MAX_TEXTO } from "@/lib/avisos";
import type { AvisoVista } from "@/lib/avisos-vista";
import { ACEPTA_ARCHIVOS, MAX_BYTES_ARCHIVO, claseDeArchivo } from "@/lib/contenido";
import { formato } from "@/lib/i18n/idiomas";
import { useErrorArchivos } from "./alta-contenido";
import { IconoSobre } from "./iconos";
import { useTextos } from "./proveedor-textos";
import { Boton, campo } from "./ui";
import { VisorArchivos, type ArchivoVisor } from "./visor-archivos";

/** Sobre de la tarjeta del curso: abre sus avisos y muestra cuántos hay sin leer. */
export function SobreAvisos({ href, sinLeer }: { href: string; sinLeer: number }) {
  const ta = useTextos().t.avisos;
  const etiqueta = sinLeer ? formato(ta.sobreSinLeer, { n: sinLeer }) : ta.sobre;
  return (
    <Link
      href={href}
      title={etiqueta}
      aria-label={etiqueta}
      className={`relative z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg transition hover:bg-tinta-50 hover:text-tinta-700 ${
        sinLeer ? "text-tinta-700" : "text-slate-500"
      }`}
    >
      <IconoSobre />
      {sinLeer > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[1.15rem] rounded-full bg-error px-1 text-center text-[11px] leading-[1.15rem] font-semibold text-white ring-2 ring-white">
          {sinLeer > 99 ? "99+" : sinLeer}
        </span>
      )}
    </Link>
  );
}

export interface OpcionesDestino {
  alumnos: { matricula: string; nombre: string }[];
  equipos: { valor: string; nombre: string; proyecto: string; n: number }[];
}

type Modo = "grupo" | "equipo" | "alumnos";

/**
 * Formulario de un aviso. El profesor elige a quién va (con `opciones`); el alumno siempre le escribe a
 * su profesor. Con `fijo`, es una respuesta y el destino ya está dado.
 */
export function NuevoAviso({
  grupoId,
  opciones,
  fijo,
  onListo,
  abierto: abiertoInicial = false,
  textoBoton,
}: {
  grupoId: string;
  opciones?: OpcionesDestino;
  fijo?: { destino: string; asunto: string; respondeA: string; etiqueta: string };
  onListo?: () => void;
  abierto?: boolean;
  textoBoton?: string;
}) {
  const { t } = useTextos();
  const ta = t.avisos;
  const router = useRouter();
  const errorArchivos = useErrorArchivos();
  const [abierto, setAbierto] = useState(abiertoInicial || Boolean(fijo));
  const [modo, setModo] = useState<Modo>("grupo");
  const [equipo, setEquipo] = useState(opciones?.equipos[0]?.valor ?? "");
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [asunto, setAsunto] = useState(fijo ? formato(ta.re, { asunto: fijo.asunto }).slice(0, MAX_ASUNTO) : "");
  const [texto, setTexto] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [estado, setEstado] = useState<"listo" | "enviando" | "error" | "enviado">("listo");
  const [mensaje, setMensaje] = useState("");

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (opciones?.alumnos ?? []).filter((a) => !q || a.nombre.toLowerCase().includes(q) || a.matricula.toLowerCase().includes(q));
  }, [opciones, busqueda]);

  if (!abierto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Boton
          type="button"
          onClick={() => {
            setAbierto(true);
            setEstado("listo");
          }}
        >
          ✉️ {textoBoton ?? ta.nuevo}
        </Boton>
        {estado === "enviado" && <p className="text-sm text-acierto" role="status">{ta.enviado}</p>}
      </div>
    );
  }

  function destino(): string {
    if (fijo) return fijo.destino;
    if (!opciones) return "profesor";
    if (modo === "grupo") return "grupo";
    if (modo === "equipo") return equipo;
    return elegidos.length ? `alumnos:${elegidos.join(",")}` : "";
  }

  async function enviar() {
    const problema = archivos.length ? errorArchivos(archivos, MAX_ANEXOS_AVISO) : "";
    if (problema) {
      setEstado("error");
      setMensaje(problema);
      return;
    }
    if (!texto.trim() && !archivos.length) {
      setEstado("error");
      setMensaje(ta.errores.vacio);
      return;
    }
    const d = destino();
    if (!d) {
      setEstado("error");
      setMensaje(ta.errores.destino);
      return;
    }
    setEstado("enviando");
    setMensaje("");
    const datos = new FormData();
    datos.set("grupoId", grupoId);
    datos.set("destino", d);
    datos.set("asunto", asunto);
    datos.set("texto", texto);
    if (fijo) datos.set("respondeA", fijo.respondeA);
    archivos.forEach((f) => datos.append("archivos", f));
    try {
      const r = await fetch("/api/avisos", { method: "POST", body: datos });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || ta.noSeEnvio);
      setAsunto("");
      setTexto("");
      setArchivos([]);
      setElegidos([]);
      setEstado("enviado");
      setAbierto(false);
      onListo?.();
      router.refresh();
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : ta.noSeEnvio);
    }
  }

  const visor: ArchivoVisor[] = archivos.flatMap((f) => {
    const clase = claseDeArchivo(f.name, f.type);
    return clase ? [{ archivo: f, nombre: f.name, clase, bytes: f.size }] : [];
  });
  const enviando = estado === "enviando";
  const chip = (activo: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${activo ? "bg-tinta-600 text-white ring-tinta-600" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50"}`;

  return (
    <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
      <div>
        <p className="text-sm font-medium text-slate-700">{ta.para}</p>
        {fijo ? (
          <p className="mt-1 text-sm text-slate-600">{fijo.etiqueta}</p>
        ) : opciones ? (
          <>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={ta.para}>
              <button type="button" role="radio" aria-checked={modo === "grupo"} className={chip(modo === "grupo")} onClick={() => setModo("grupo")}>
                👥 {ta.todoGrupo} ({opciones.alumnos.length})
              </button>
              <button type="button" role="radio" aria-checked={modo === "equipo"} className={chip(modo === "equipo")} onClick={() => setModo("equipo")}>
                🧩 {ta.unEquipo}
              </button>
              <button type="button" role="radio" aria-checked={modo === "alumnos"} className={chip(modo === "alumnos")} onClick={() => setModo("alumnos")}>
                👤 {ta.algunos}
              </button>
            </div>
            {modo === "equipo" &&
              (opciones.equipos.length ? (
                <label className="mt-3 block text-sm">
                  <span className="text-slate-600">{ta.elegirEquipo}</span>
                  <select className={campo} value={equipo} onChange={(e) => setEquipo(e.target.value)}>
                    {opciones.equipos.map((e) => (
                      <option key={e.valor} value={e.valor}>
                        {formato(ta.equipoDe, { equipo: e.nombre, proyecto: e.proyecto, n: e.n })}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">{ta.sinEquipos}</p>
              ))}
            {modo === "alumnos" && (
              <div className="mt-3 rounded-lg ring-1 ring-slate-200">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-2">
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder={ta.buscar}
                    aria-label={ta.buscar}
                    className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <span className="text-xs text-slate-500">{formato(ta.elegidos, { n: elegidos.length })}</span>
                  <button type="button" className="text-xs font-medium text-tinta-700 hover:underline" onClick={() => setElegidos([...new Set([...elegidos, ...visibles.map((a) => a.matricula)])])}>
                    {ta.marcarTodos}
                  </button>
                  <button type="button" className="text-xs font-medium text-tinta-700 hover:underline" onClick={() => setElegidos([])}>
                    {ta.marcarNinguno}
                  </button>
                </div>
                <ul className="max-h-56 overflow-y-auto p-1">
                  {visibles.map((a) => (
                    <li key={a.matricula}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={elegidos.includes(a.matricula)}
                          onChange={(e) => setElegidos(e.target.checked ? [...elegidos, a.matricula] : elegidos.filter((m) => m !== a.matricula))}
                        />
                        <span className="min-w-0 flex-1 truncate">{a.nombre}</span>
                        <span className="text-xs text-slate-400">{a.matricula}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-600">👩‍🏫 {ta.alProfesor}</p>
        )}
      </div>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">{ta.asunto}</span>
        <input className={campo} value={asunto} maxLength={MAX_ASUNTO} onChange={(e) => setAsunto(e.target.value)} />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">{ta.texto}</span>
        <textarea className={`${campo} min-h-28`} value={texto} maxLength={MAX_TEXTO} placeholder={ta.textoAyuda} onChange={(e) => setTexto(e.target.value)} />
      </label>
      <div className="space-y-2">
        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-3 text-center text-sm text-slate-500 hover:border-tinta-500 hover:bg-tinta-50">
          📎 {ta.anexar}
          <input
            type="file"
            multiple
            accept={ACEPTA_ARCHIVOS}
            className="sr-only"
            onChange={(e) => {
              setArchivos([...archivos, ...Array.from(e.target.files ?? [])].slice(0, MAX_ANEXOS_AVISO + 1));
              e.target.value = "";
            }}
          />
          <span className="mt-1 block text-xs text-slate-400">{formato(ta.formatos, { n: MAX_ANEXOS_AVISO, mb: Math.round(MAX_BYTES_ARCHIVO / 1024 / 1024) })}</span>
        </label>
        {visor.length > 0 && <VisorArchivos archivos={visor} onQuitar={(i) => setArchivos(archivos.filter((_, j) => j !== i))} />}
      </div>
      {estado === "error" && <p className="rounded-lg bg-error-suave p-2 text-sm text-error">{mensaje}</p>}
      <div className="flex flex-wrap gap-2">
        <Boton type="button" onClick={enviar} disabled={enviando}>
          {enviando ? ta.enviando : ta.enviar}
        </Boton>
        <Boton
          type="button"
          variante="secundario"
          disabled={enviando}
          onClick={() => {
            setAbierto(false);
            setEstado("listo");
            onListo?.();
          }}
        >
          {ta.cancelar}
        </Boton>
      </div>
    </div>
  );
}

type Filtro = "todos" | "recibidos" | "enviados" | "sinLeer";

/** Lista de avisos con filtros. Cada aviso se abre al hacer clic y se marca como leído. */
export function ListaAvisos({ avisos, vacio }: { avisos: AvisoVista[]; vacio: string }) {
  const ta = useTextos().t.avisos;
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const sinLeer = avisos.filter((a) => a.sinLeer).length;
  if (!avisos.length) return <p className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{vacio}</p>;
  const lista = avisos.filter((a) => (filtro === "recibidos" ? !a.mio : filtro === "enviados" ? a.mio : filtro === "sinLeer" ? a.sinLeer : true));
  const filtros: [Filtro, string][] = [
    ["todos", ta.filtros.todos],
    ["sinLeer", sinLeer ? `${ta.filtros.sinLeer} (${sinLeer})` : ta.filtros.sinLeer],
    ["recibidos", ta.filtros.recibidos],
    ["enviados", ta.filtros.enviados],
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="tablist">
        {filtros.map(([f, texto]) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filtro === f}
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-3 py-1.5 text-sm ${filtro === f ? "bg-tinta-50 font-medium text-tinta-700" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {texto}
          </button>
        ))}
      </div>
      {lista.length ? (
        <ul className="space-y-3">
          {lista.map((a) => (
            <li key={a.id}>
              <ItemAviso aviso={a} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl bg-white px-5 py-4 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">{ta.vacioFiltro}</p>
      )}
    </div>
  );
}

function ItemAviso({ aviso: a }: { aviso: AvisoVista }) {
  const ta = useTextos().t.avisos;
  const router = useRouter();
  const [sinLeer, setSinLeer] = useState(a.sinLeer);
  const [respondiendo, setRespondiendo] = useState(false);
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();

  function abrir(abierto: boolean) {
    if (!abierto || !sinLeer) return;
    setSinLeer(false);
    iniciar(async () => {
      await marcarAvisoLeido(a.id).catch(() => undefined);
      router.refresh();
    });
  }

  function borrar() {
    if (!window.confirm(ta.confirmarBorrar)) return;
    iniciar(async () => {
      try {
        await borrarAviso(a.id);
        router.refresh();
      } catch {
        setError(ta.noSeBorro);
      }
    });
  }

  const destino =
    a.destino.tipo === "grupo"
      ? ta.paraGrupo
      : a.destino.tipo === "equipo"
        ? formato(ta.paraEquipo, { nombre: a.destino.nombre })
        : a.destino.tipo === "profesor"
          ? ta.paraProfesor
          : a.destino.nombres.length === 0
            ? ta.tu
            : a.destino.nombres.length <= 2
              ? a.destino.nombres.join(", ")
              : formato(ta.paraAlumnosN, { n: a.destino.nombres.length });
  const de = a.mio ? ta.tu : a.autor;
  const anexos = a.anexos.length;
  const archivos: ArchivoVisor[] = a.anexos.map((x) => ({ ruta: x.ruta, nombre: x.nombre, clase: x.clase, bytes: x.bytes }));

  return (
    <details
      onToggle={(e) => abrir((e.currentTarget as HTMLDetailsElement).open)}
      className={`group rounded-xl bg-white shadow-sm ring-1 transition ${sinLeer ? "ring-tinta-500" : "ring-slate-200"} ${pendiente ? "opacity-80" : ""}`}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl px-4 py-3 hover:bg-slate-50 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${sinLeer ? "bg-tinta-600" : "bg-transparent"}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            {a.curso && <span className="font-semibold tracking-wide text-tinta-600 uppercase">{a.curso}</span>}
            <span className={sinLeer ? "font-semibold text-slate-800" : ""}>{de}</span>
            <span aria-hidden>→</span>
            <span>{destino}</span>
            <span aria-hidden>·</span>
            <span>{a.fecha}</span>
            {sinLeer && <span className="rounded-full bg-tinta-600 px-2 py-0.5 text-[11px] font-semibold text-white">{ta.nuevoInsignia}</span>}
          </span>
          <span className={`mt-0.5 block truncate text-[15px] ${sinLeer ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}>
            {a.asunto || ta.sinAsunto}
          </span>
          <span className="block truncate text-sm text-slate-500 group-open:hidden">
            {anexos > 0 && <span className="mr-1">📎</span>}
            {a.texto || formato(anexos === 1 ? ta.anexos1 : ta.anexosN, { n: anexos })}
          </span>
        </span>
        {a.lectura && (
          <span className="shrink-0 text-right text-xs text-slate-500">
            <span className="block text-base font-semibold text-slate-800">{a.lectura.porcentaje} %</span>
            {a.lectura.leidos}/{a.lectura.total}
          </span>
        )}
      </summary>
      <div className="space-y-3 border-t border-slate-100 px-4 py-4 sm:px-5">
        {a.respondeA && <p className="text-xs text-slate-500">↩︎ {formato(ta.respuestaA, { asunto: a.respondeA })}</p>}
        <p className="text-xs text-slate-500">{formato(ta.paraTexto, { destino })}</p>
        {a.texto && <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{a.texto}</p>}
        {archivos.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">📎 {formato(anexos === 1 ? ta.anexos1 : ta.anexosN, { n: anexos })}</p>
            <VisorArchivos archivos={archivos} />
          </div>
        )}
        {a.lectura && (
          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-700">{formato(ta.leidoPor, { l: a.lectura.leidos, n: a.lectura.total, p: a.lectura.porcentaje })}</p>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-acierto" style={{ width: `${a.lectura.porcentaje}%` }} />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-acierto">✓ {ta.leyeron} ({a.lectura.leidos})</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {a.lectura.quienLeyo.map((x, i) => (
                    <li key={i}>
                      {x.nombre} <span className="text-slate-400">· {x.fecha}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-aviso">○ {ta.faltan} ({a.lectura.pendientes.length})</p>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {a.lectura.pendientes.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
            {a.correos && <p className="mt-3 text-xs text-slate-500">{textoCorreos(a.correos, ta.correo)}</p>}
          </div>
        )}
        {a.leidoProfesor !== undefined && (
          <p className={`text-xs ${a.leidoProfesor ? "text-acierto" : "text-slate-500"}`}>
            {a.leidoProfesor ? `✓ ${formato(ta.leidoProfesor, { fecha: a.leidoProfesor })}` : ta.sinLeerProfesor}
          </p>
        )}
        {error && <p className="text-xs text-error">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {a.responder && !respondiendo && (
            <Boton type="button" variante="secundario" onClick={() => setRespondiendo(true)}>
              ↩︎ {ta.responder}
            </Boton>
          )}
          {a.cursoHref && (
            <Link href={a.cursoHref} className="inline-flex items-center px-2 text-sm font-medium text-tinta-700 hover:underline">
              {ta.panel.abrir} →
            </Link>
          )}
          {a.puedeBorrar && (
            <Boton type="button" variante="fantasma" className="ml-auto text-error hover:bg-error-suave" onClick={borrar} disabled={pendiente}>
              {ta.borrar}
            </Boton>
          )}
        </div>
        {respondiendo && a.responder && (
          <NuevoAviso
            grupoId={a.grupoId}
            fijo={{ ...a.responder, etiqueta: a.responder.destino === "profesor" ? `👩‍🏫 ${ta.alProfesor}` : `👤 ${a.autor}` }}
            onListo={() => setRespondiendo(false)}
          />
        )}
      </div>
    </details>
  );
}

function textoCorreos(c: NonNullable<AvisoVista["correos"]>, tc: ReturnType<typeof useTextos>["t"]["avisos"]["correo"]) {
  if (c.sinConfigurar) return tc.sinConfigurar;
  return [
    formato(tc.enviados, { n: c.enviados }),
    c.fallidos ? formato(tc.fallidos, { n: c.fallidos }) : "",
    c.sinCorreo ? formato(tc.sinCorreo, { n: c.sinCorreo }) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

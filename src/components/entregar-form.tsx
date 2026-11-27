"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formato } from "@/lib/i18n/idiomas";
import { CAMPO_ACEPTACION, VERSION_LEGAL } from "@/lib/legal/aceptacion";
import { MINUTOS_REENVIO } from "@/lib/reenvio";
import { ZONA_HORARIA } from "@/lib/resultados";
import { AceptarAvisos } from "./aceptar-avisos";
import { useTextos } from "./proveedor-textos";
import { Boton } from "./ui";

/** Entrega anterior del alumno en esta actividad (para ofrecer el reenvío). */
export interface EntregaPrevia {
  primeraEntregaEn: string;
  paginas: number;
  evaluada: boolean;
}

const hora = (ms: number, locale: string) =>
  new Date(ms).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: ZONA_HORARIA });

/** Cuenta los milisegundos que faltan para una hora; null hasta montar (evita diferencias con el servidor). */
function useFaltan(hasta: number | undefined) {
  const [ahora, setAhora] = useState<number | null>(null);
  useEffect(() => {
    if (hasta === undefined) return;
    const tic = () => setAhora(Date.now());
    tic();
    const t = setInterval(tic, 1000);
    return () => clearInterval(t);
  }, [hasta]);
  return hasta === undefined || ahora === null ? null : Math.max(0, hasta - ahora);
}

function mmss(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface Pagina {
  id: string;
  archivo: File;
  url: string;
}

/**
 * Entrega del alumno desde el celular: toma una foto por página, las ordena y envía.
 * Equivale a la app móvil mientras se construye la versión con Expo.
 */
export function EntregarForm({
  actividadId,
  titulo,
  correoPrivacidad,
  modo,
  automatica,
  matriculaInicial,
  nombreInicial,
  previa,
  versiones,
  versionInicial,
  enHoja = false,
}: {
  actividadId: string;
  titulo: string;
  /** Correo para ejercer los derechos de privacidad (se muestra al crear la cuenta). */
  correoPrivacidad: string;
  /** profesor: sube las hojas de un alumno; sesion: el alumno ya entró; nuevo: pide correo y clave. */
  modo: "profesor" | "sesion" | "nuevo";
  /** true si la rúbrica ya está confirmada y la entrega se evalúa sola. */
  automatica: boolean;
  matriculaInicial?: string;
  nombreInicial?: string;
  /** Entrega que el alumno ya hizo (solo con sesión de alumno). */
  previa?: EntregaPrevia;
  /** Letras de las versiones de la hoja (A, B…), si la actividad tiene varias. */
  versiones?: string[];
  /** Versión que trae el QR de la hoja. */
  versionInicial?: string;
  /** Va dentro de una hoja (página de entrega): sin tarjetas propias, a todo el ancho de la hoja. */
  enHoja?: boolean;
}) {
  const caja = enHoja ? "" : "rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200";
  const cajaAviso = enHoja ? "py-2 text-center" : "rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200";
  const { t, locale } = useTextos();
  const tf = t.alumno.formulario;
  const tc = t.alumno.campos;
  const [matricula, setMatricula] = useState(matriculaInicial ?? "");
  const [version, setVersion] = useState(versionInicial ?? versiones?.[0] ?? "");
  const [nombre, setNombre] = useState(nombreInicial ?? "");
  const [cuenta, setCuenta] = useState<"crear" | "entrar">("crear");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [acepta, setAcepta] = useState(false);
  const pideDatos = modo === "profesor" || (modo === "nuevo" && cuenta === "crear");
  const datosListos =
    modo === "sesion" ||
    (modo === "profesor" && matricula.trim().length >= 3) ||
    (modo === "nuevo" &&
      correo.includes("@") &&
      clave.length >= 6 &&
      (cuenta === "entrar" || (matricula.trim().length >= 3 && nombre.trim().length >= 3 && acepta)));
  const router = useRouter();
  const [paginas, setPaginas] = useState<Pagina[]>([]);
  const [tipo, setTipo] = useState<"foto" | "pdf">("foto");
  const [pdf, setPdf] = useState<File | null>(null);
  // Primera entrega del alumno: fija el plazo de reenvío (los reenvíos no lo alargan).
  const [primera, setPrimera] = useState<string | undefined>(previa?.primeraEntregaEn);
  const [reenviando, setReenviando] = useState(false);
  const limite = primera && modo !== "profesor" ? Date.parse(primera) + MINUTOS_REENVIO * 60_000 : undefined;
  const faltan = useFaltan(limite);
  const plazoAbierto = faltan === null ? limite !== undefined : faltan > 0;
  const listo = tipo === "pdf" ? Boolean(pdf) : paginas.length > 0;
  const [estado, setEstado] = useState<"editando" | "enviando" | "enviado" | "error">("editando");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => () => paginas.forEach((p) => URL.revokeObjectURL(p.url)), [paginas]);

  function agregar(files: FileList | null) {
    if (!files) return;
    const nuevas = Array.from(files).map((archivo) => ({ id: crypto.randomUUID(), archivo, url: URL.createObjectURL(archivo) }));
    setPaginas((ps) => [...ps, ...nuevas]);
  }

  function mover(i: number, d: -1 | 1) {
    setPaginas((ps) => {
      const n = [...ps];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });
  }

  async function enviar() {
    setEstado("enviando");
    const datos = new FormData();
    datos.append("modo", modo === "nuevo" ? cuenta : modo);
    datos.append("matricula", matricula);
    datos.append("nombre", nombre);
    datos.append("correo", correo);
    datos.append("clave", clave);
    if (modo === "nuevo" && cuenta === "crear" && acepta) datos.append(CAMPO_ACEPTACION, VERSION_LEGAL);
    if (versiones?.length) datos.append("version", version);
    if (tipo === "pdf" && pdf) datos.append("pdf", pdf);
    else paginas.forEach((p) => datos.append("fotos", p.archivo));
    try {
      const r = await fetch(`/api/entregas/${actividadId}`, { method: "POST", body: datos });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? tf.errorEnviar);
      setMensaje(
        `${tf.listo} ${j.paginas > 1 ? formato(tf.recibidas, { n: j.paginas }) : tf.recibida} ${formato(tf.conMatricula, { m: j.matricula })}` +
          (j.reemplazo ? ` ${tf.reemplazo}` : "") +
          (j.automatica ? ` ${tf.iaEvaluando}` : ""),
      );
      if (j.primeraEntregaEn) setPrimera(j.primeraEntregaEn);
      setReenviando(false);
      setEstado("enviado");
      if (modo === "nuevo") router.refresh();
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : tf.noSePudo);
      setEstado("error");
    }
  }

  if (estado === "enviado") {
    return (
      <div className={cajaAviso}>
        <p className="text-4xl text-acierto">✓</p>
        <h2 className="mt-2 text-lg font-semibold">{tf.entregaRecibida}</h2>
        <p className="mt-1 text-sm text-slate-600">{mensaje}</p>
        {modo !== "profesor" && (
          <p className="mt-3 text-sm text-slate-500">
            {automatica ? tf.iaCalifica : tf.profesorRevisara} {tf.consultaAntes}{" "}
            <a href="/alumno" className="text-tinta-700 underline">
              {tf.misActividades}
            </a>{" "}
            {tf.consultaDespues}
          </p>
        )}
        {modo === "profesor" ? (
          <Boton
            variante="secundario"
            className="mt-4"
            onClick={() => {
              setPaginas([]);
              setPdf(null);
              setMatricula(matriculaInicial ?? "");
              setNombre(nombreInicial ?? "");
              setEstado("editando");
            }}
          >
            {tf.entregarOtra}
          </Boton>
        ) : (
          plazoAbierto &&
          limite !== undefined && (
            <div className="mt-5 rounded-lg bg-aviso-suave p-4 text-left text-sm">
              <p className="font-medium text-aviso">{tf.incompletas}</p>
              <p className="mt-1 text-slate-700">
                {formato(tf.puedesReenviar, { hora: hora(limite, locale) })}
                {faltan !== null && formato(tf.quedan, { t: mmss(faltan) })}
                {tf.reemplazaAnterior}
              </p>
              <Boton
                variante="secundario"
                className="mt-3 w-full"
                onClick={() => {
                  setPaginas([]);
                  setPdf(null);
                  setReenviando(true);
                  setEstado("editando");
                }}
              >
                {tf.nuevoEnvio}
              </Boton>
            </div>
          )
        )}
      </div>
    );
  }

  const yaEntrego = modo !== "profesor" && (Boolean(previa) || reenviando);
  if (yaEntrego && !plazoAbierto && previa?.evaluada && !reenviando) {
    return (
      <div className={cajaAviso}>
        <p className="text-4xl text-acierto">✓</p>
        <h2 className="mt-2 text-lg font-semibold">{tf.yaEntregaste}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {previa.paginas === 1 ? tf.recibida : formato(tf.recibidas, { n: previa.paginas })} {formato(tf.yaEvaluada, { n: MINUTOS_REENVIO })}
        </p>
        <a href="/alumno" className="mt-4 inline-block text-sm font-medium text-tinta-700 underline">
          {tf.verMisActividades}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {yaEntrego && (
        <div className="rounded-xl bg-aviso-suave p-4 text-sm">
          <p className="font-medium text-aviso">{tf.nuevoEnvioTitulo}</p>
          <p className="mt-1 text-slate-700">
            {plazoAbierto && limite !== undefined
              ? formato(tf.reemplazaHasta, { hora: hora(limite, locale), quedan: faltan !== null ? formato(tf.quedan, { t: mmss(faltan) }) : "" })
              : tf.reemplazaSinPlazo}
          </p>
        </div>
      )}
      {modo !== "sesion" && (
        <div className={caja}>
          <p className="text-sm font-medium text-slate-700">
            {modo === "profesor" ? tf.deQueAlumno : tf.quienEres}
          </p>
          {modo === "profesor" ? (
            <p className="mt-1 text-xs text-slate-500">{tf.comoProfesor}</p>
          ) : (
            <div className="mt-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
              {(["crear", "entrar"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCuenta(c)}
                  aria-pressed={cuenta === c}
                  className={`flex-1 rounded-md px-3 py-1.5 font-medium ${cuenta === c ? "bg-white text-tinta-700 shadow-sm" : "text-slate-600"}`}
                >
                  {c === "crear" ? tf.primeraEntrega : tf.yaTengoCuenta}
                </button>
              ))}
            </div>
          )}
          {pideDatos && (
            <>
              <label className="mt-3 block text-sm text-slate-700">
                {tc.nombre}
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="name"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base"
                  placeholder={tc.nombreEjemplo}
                />
              </label>
              <label className="mt-3 block text-sm text-slate-700">
                {tc.matricula}
                <input
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  autoCapitalize="characters"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-base uppercase"
                  placeholder={tc.matriculaEjemplo}
                />
              </label>
            </>
          )}
          {modo === "nuevo" && (
            <>
              <label className="mt-3 block text-sm text-slate-700">
                {tc.correo}
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base"
                  placeholder={tc.correoEjemplo}
                />
              </label>
              <label className="mt-3 block text-sm text-slate-700">
                {cuenta === "crear" ? tf.creaClave : tc.clave}
                <input
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  autoComplete={cuenta === "crear" ? "new-password" : "current-password"}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base"
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">
                {cuenta === "crear" ? tf.ayudaCrear : tf.ayudaEntrar}
              </p>
              {cuenta === "crear" && (
                <div className="mt-3">
                  <AceptarAvisos t={t.legal} tipo="alumno" correo={correoPrivacidad} marcado={acepta} alCambiar={setAcepta} />
                </div>
              )}
              {cuenta === "entrar" && (
                <Link
                  href={`/recuperar?tipo=alumno&volver=${encodeURIComponent(`/entregar/${actividadId}`)}`}
                  className="mt-1 inline-block text-xs font-medium text-tinta-700 hover:underline"
                >
                  {t.recuperar.olvideAlumno}
                </Link>
              )}
            </>
          )}
        </div>
      )}

      <div className={enHoja && modo !== "sesion" ? "border-t border-slate-200 pt-5" : caja}>
        <p className={enHoja ? "text-[15px] font-semibold text-slate-900" : "text-sm font-medium text-slate-700"}>
          {modo === "sesion" ? "1." : "2."} {formato(tf.comoEntregas, { titulo })}
        </p>
        {versiones && versiones.length > 1 && (
          <fieldset className="mt-3">
            <legend className="text-sm font-medium text-slate-700">{t.alumno.entregar.versionHoja}</legend>
            <div className="mt-1 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
              {versiones.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVersion(v)}
                  aria-pressed={version === v}
                  className={`flex-1 rounded-md px-3 py-1.5 font-semibold ${version === v ? "bg-white text-tinta-700 shadow-sm" : "text-slate-600"}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{t.alumno.entregar.versionAyuda}</p>
          </fieldset>
        )}
        <div
          className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm"
          role="radiogroup"
          aria-label={tf.tipoEnvio}
        >
          {(
            [
              ["foto", tf.tomarFoto, tf.hojasImpresas],
              ["pdf", tf.cargarPdf, tf.escritoTableta],
            ] as const
          ).map(([clave, texto, detalle]) => (
            <button
              key={clave}
              type="button"
              role="radio"
              aria-checked={tipo === clave}
              onClick={() => setTipo(clave)}
              className={`rounded-md px-2 py-2 text-center ${tipo === clave ? "bg-white text-tinta-700 shadow-sm ring-1 ring-tinta-200" : "text-slate-600"}`}
            >
              <span className="block font-medium">{texto}</span>
              <span className="block text-xs text-slate-500">{detalle}</span>
            </button>
          ))}
        </div>
        {tipo === "pdf" ? (
          <>
            <p className="mt-3 text-xs text-slate-500">
              {tf.ayudaPdf}
            </p>
            {pdf ? (
              <div className="mt-3 flex items-center gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                <span className="flex h-12 w-10 items-center justify-center rounded bg-error-suave text-xs font-bold text-error">
                  PDF
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{pdf.name}</span>
                  <span className="block text-xs text-slate-500">
                    {pdf.size < 1024 * 1024
                      ? `${Math.max(1, Math.round(pdf.size / 1024))} KB`
                      : `${(pdf.size / 1024 / 1024).toLocaleString(locale, { maximumFractionDigits: 1 })} MB`}
                  </span>
                </span>
                <button type="button" onClick={() => setPdf(null)} className="rounded px-2 py-1 text-sm text-error">
                  {tf.quitar}
                </button>
              </div>
            ) : (
              <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg bg-tinta-600 px-3 py-3 text-sm font-medium text-white">
                {tf.elegirPdf}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  onChange={(e) => {
                    setPdf(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </>
        ) : (
          <>
            <p className="mt-3 text-xs text-slate-500">
              {tf.ayudaFoto}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="flex cursor-pointer items-center justify-center rounded-lg bg-tinta-600 px-3 py-3 text-sm font-medium text-white">
                {tf.tomarFoto}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    agregar(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-center rounded-lg bg-white px-3 py-3 text-sm font-medium text-slate-800 ring-1 ring-slate-300">
                {tf.elegirGaleria}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    agregar(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {paginas.length > 0 && (
              <ol className="mt-4 space-y-2">
                {paginas.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={formato(tf.pagina, { n: i + 1 })} className="h-20 w-16 rounded object-cover ring-1 ring-slate-300" />
                    <span className="flex-1 text-sm font-medium">{formato(tf.pagina, { n: i + 1 })}</span>
                    <button
                      type="button"
                      onClick={() => mover(i, -1)}
                      disabled={i === 0}
                      className="rounded px-2 py-1 text-lg disabled:opacity-30"
                      aria-label={tf.subirPagina}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(i, 1)}
                      disabled={i === paginas.length - 1}
                      className="rounded px-2 py-1 text-lg disabled:opacity-30"
                      aria-label={tf.bajarPagina}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaginas((ps) => ps.filter((x) => x.id !== p.id))}
                      className="rounded px-2 py-1 text-sm text-error"
                      aria-label={tf.quitarPagina}
                    >
                      {tf.quitar}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </div>

      {estado === "error" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{mensaje}</p>}
      <Boton className="w-full py-3 text-base" onClick={enviar} disabled={!datosListos || !listo || estado === "enviando"}>
        {estado === "enviando"
          ? tipo === "pdf"
            ? tf.enviandoPdf
            : tf.enviando
          : `${modo === "sesion" ? "2." : "3."} ${yaEntrego ? tf.reenviar : tf.enviar} ${
              tipo === "pdf" ? tf.pdf : paginas.length === 0 ? tf.paginasSinNumero : paginas.length === 1 ? tf.unaPagina : formato(tf.paginas, { n: paginas.length })
            }`}
      </Boton>
    </div>
  );
}

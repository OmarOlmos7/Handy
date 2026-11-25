"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { cambiarDatosAlumno, darDeAltaAlumno, darDeAltaLista, darDeBajaAlumno } from "@/app/acciones-alumnos";
import { formato } from "@/lib/i18n/idiomas";
import { BotonIcono, IconoBasura, IconoLapiz } from "./iconos";
import { useTextos } from "./proveedor-textos";
import { Boton, Insignia, campo } from "./ui";

export interface FilaAlumno {
  matricula: string;
  nombre: string;
  correo: string;
  cuenta: boolean;
  entregas: number;
  autoactividades: number;
}

const campoChico = "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100";

/**
 * Altas, cambios y bajas de los alumnos de un curso. Se usa en la vista "Lista de alumnos" y,
 * plegable, en la evaluación de cada actividad.
 */
export function AdministrarAlumnos({ grupoId, alumnos, conLista = true }: { grupoId: string; alumnos: FilaAlumno[]; conLista?: boolean }) {
  const router = useRouter();
  const { t } = useTextos();
  const ta = t.alumnosGrupo;
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [buscar, setBuscar] = useState("");
  const [verLista, setVerLista] = useState(false);

  const textoError = (codigo: string) => ta.errores[codigo as keyof typeof ta.errores] ?? ta.errores.general;
  const datosDe = (f: FormData) => ({
    matricula: String(f.get("matricula") ?? ""),
    nombre: String(f.get("nombre") ?? ""),
    correo: String(f.get("correo") ?? ""),
  });

  function alta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = datosDe(new FormData(form));
    iniciar(async () => {
      const r = await darDeAltaAlumno(grupoId, datos);
      if ("error" in r) return setAviso({ tipo: "error", texto: textoError(r.error) });
      form.reset();
      setAviso({ tipo: "ok", texto: formato(ta.alta.hecha, { nombre: datos.nombre.trim() }) });
      router.refresh();
    });
  }

  function altaLista(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const lista = String(new FormData(form).get("lista") ?? "");
    iniciar(async () => {
      const r = await darDeAltaLista(grupoId, lista);
      if ("error" in r) return setAviso({ tipo: "error", texto: textoError(r.error) });
      const partes = [formato(ta.lista.hecha, { n: r.agregados })];
      if (r.fallidas.length) {
        partes.push(formato(ta.lista.fallidas, { l: r.fallidas.map((x) => `${x.linea} (${textoError(x.error)})`).join(" · ") }));
      } else form.reset();
      setAviso({ tipo: r.fallidas.length ? "error" : "ok", texto: partes.join(" ") });
      router.refresh();
    });
  }

  function guardar(matricula: string, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = datosDe(new FormData(e.currentTarget));
    iniciar(async () => {
      const r = await cambiarDatosAlumno(grupoId, matricula, datos);
      if ("error" in r) return setAviso({ tipo: "error", texto: textoError(r.error) });
      setEditando(null);
      setAviso({ tipo: "ok", texto: ta.guardado });
      router.refresh();
    });
  }

  function baja(a: FilaAlumno) {
    const conTrabajo = a.entregas + a.autoactividades > 0;
    const texto = conTrabajo
      ? formato(ta.confirmarBaja, { nombre: a.nombre, m: a.matricula, e: a.entregas, a: a.autoactividades })
      : formato(ta.confirmarBajaSinTrabajo, { nombre: a.nombre, m: a.matricula });
    if (!window.confirm(texto)) return;
    iniciar(async () => {
      const r = await darDeBajaAlumno(grupoId, a.matricula);
      if ("error" in r) return setAviso({ tipo: "error", texto: textoError(r.error) });
      setAviso({ tipo: "ok", texto: formato(ta.bajaHecha, { nombre: a.nombre }) });
      router.refresh();
    });
  }

  const q = buscar.trim().toLowerCase();
  const visibles = q
    ? alumnos.filter((a) => `${a.nombre} ${a.matricula} ${a.correo}`.toLowerCase().includes(q))
    : alumnos;

  return (
    <div className={`space-y-4 ${pendiente ? "opacity-70" : ""}`}>
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-base font-semibold text-slate-900">{ta.alta.titulo}</h2>
        <form onSubmit={alta} className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-sm font-medium text-slate-700">
            {ta.alta.matricula}
            <input name="matricula" required maxLength={20} autoComplete="off" className={`${campo} font-mono uppercase`} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {ta.alta.nombre}
            <input name="nombre" required maxLength={120} autoComplete="off" className={campo} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {ta.alta.correo}
            <input name="correo" type="email" maxLength={160} autoComplete="off" className={campo} />
          </label>
          <Boton type="submit" disabled={pendiente}>
            + {ta.alta.agregar}
          </Boton>
        </form>
        <p className="mt-2 text-xs text-slate-500">{ta.alta.nota}</p>
        {conLista && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button type="button" onClick={() => setVerLista((v) => !v)} className="text-sm font-medium text-tinta-700 hover:underline" aria-expanded={verLista}>
              {verLista ? "▾" : "▸"} {ta.lista.titulo}
            </button>
            {verLista && (
              <form onSubmit={altaLista} className="mt-2 space-y-2">
                <p className="text-xs text-slate-500">{ta.lista.ayuda}</p>
                <textarea name="lista" rows={5} required className={`${campo} font-mono`} placeholder={"A01234567, Ana López Pérez, ana@correo.com\nA07654321, Luis Martínez Gómez"} />
                <Boton type="submit" variante="secundario" disabled={pendiente}>
                  {ta.lista.agregar}
                </Boton>
              </form>
            )}
          </div>
        )}
      </section>

      {aviso && (
        <p role="status" className={`rounded-lg px-4 py-2.5 text-sm ${aviso.tipo === "ok" ? "bg-acierto-suave text-acierto" : "bg-error-suave text-error"}`}>
          {aviso.texto}
        </p>
      )}

      <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        {alumnos.length > 0 && (
          <div className="border-b border-slate-100 p-3">
            <input
              type="search"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder={ta.tabla.buscar}
              aria-label={ta.tabla.buscar}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100 sm:max-w-sm"
            />
          </div>
        )}
        {alumnos.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">{ta.tabla.vacio}</p>
        ) : visibles.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">{ta.tabla.sinResultados}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibles.map((a) =>
              editando === a.matricula ? (
                <li key={a.matricula} className="bg-tinta-50/40 p-4">
                  <form onSubmit={(e) => guardar(a.matricula, e)} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,1fr)_auto] sm:items-end">
                    <label className="block text-xs font-medium text-slate-500">
                      {ta.tabla.alumno}
                      <input name="nombre" defaultValue={a.nombre} required maxLength={120} autoFocus className={campoChico} />
                    </label>
                    <label className="block text-xs font-medium text-slate-500">
                      {ta.tabla.matricula}
                      <input name="matricula" defaultValue={a.matricula} required maxLength={20} className={`${campoChico} font-mono uppercase`} />
                    </label>
                    <label className="block text-xs font-medium text-slate-500">
                      {ta.tabla.correo}
                      <input name="correo" type="email" defaultValue={a.correo} maxLength={160} className={campoChico} />
                    </label>
                    <div className="flex gap-2">
                      <Boton type="submit" disabled={pendiente} className="!px-3 !py-1.5">
                        {ta.guardar}
                      </Boton>
                      <Boton type="button" variante="secundario" onClick={() => setEditando(null)} className="!px-3 !py-1.5">
                        {ta.cancelar}
                      </Boton>
                    </div>
                  </form>
                  <p className="mt-2 text-xs text-slate-500">{ta.avisoMatricula}</p>
                </li>
              ) : (
                <li key={a.matricula} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate font-medium text-slate-900">{a.nombre}</p>
                    <p className="truncate text-xs text-slate-500">
                      <span className="font-mono">{a.matricula}</span>
                      {a.correo && <> · {a.correo}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <Insignia tono={a.cuenta ? "verde" : "gris"}>{a.cuenta ? ta.tabla.conCuenta : ta.tabla.sinCuenta}</Insignia>
                    <span title={ta.tabla.entregas}>
                      {ta.tabla.entregas}: <strong className="text-slate-700">{a.entregas}</strong>
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <BotonIcono etiqueta={`${ta.cambiar}: ${a.nombre}`} onClick={() => setEditando(a.matricula)} disabled={pendiente}>
                      <IconoLapiz />
                    </BotonIcono>
                    <BotonIcono etiqueta={`${ta.baja}: ${a.nombre}`} peligro onClick={() => baja(a)} disabled={pendiente}>
                      <IconoBasura />
                    </BotonIcono>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Botón plegable con la administración de alumnos, para la evaluación de una actividad. */
export function AlumnosEnActividad({ grupoId, alumnos }: { grupoId: string; alumnos: FilaAlumno[] }) {
  const { t } = useTextos();
  const ta = t.alumnosGrupo.enActividad;
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <Boton type="button" variante="secundario" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
          {abierto ? ta.ocultar : ta.boton}
        </Boton>
        {abierto && (
          <Link href={`/profesor/grupos/${grupoId}/alumnos`} className="text-sm font-medium text-tinta-700 hover:underline">
            {ta.verLista} →
          </Link>
        )}
      </div>
      {abierto && (
        <div className="mt-3">
          <p className="mb-2 text-xs text-slate-500">{ta.ayuda}</p>
          <AdministrarAlumnos grupoId={grupoId} alumnos={alumnos} conLista={false} />
        </div>
      )}
    </div>
  );
}

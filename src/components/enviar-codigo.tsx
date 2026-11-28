"use client";

// Código del curso en la lista de alumnos: copiarlo y mandarlo por correo, a cada alumno por
// separado, para que pague su membresía (licencia) con él. Se eligen alumnos uno por uno o todos.
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { enviarCodigoCurso } from "@/app/acciones-alumnos";
import { formato } from "@/lib/i18n/idiomas";
import { useTextos } from "./proveedor-textos";
import { Boton, fechaLarga } from "./ui";

export interface AlumnoCodigo {
  matricula: string;
  nombre: string;
  correo: string;
  codigoEnviado?: string;
}

const conCorreo = (a: AlumnoCodigo) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.correo.trim());

export function EnviarCodigoCurso({
  grupoId,
  codigo,
  alumnos,
  correoListo,
}: {
  grupoId: string;
  codigo: string;
  alumnos: AlumnoCodigo[];
  /** false si el servidor no tiene correo (SMTP) configurado. */
  correoListo: boolean;
}) {
  const router = useRouter();
  const { t, locale } = useTextos();
  const tc = t.marco.enviarCodigo;
  const tl = t.licencias.profesor;
  const [copiado, setCopiado] = useState(false);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const posibles = useMemo(() => alumnos.filter(conCorreo).map((a) => a.matricula), [alumnos]);
  const todos = posibles.length > 0 && posibles.every((m) => elegidos.has(m));

  function alternar(m: string) {
    setElegidos((s) => {
      const n = new Set(s);
      if (n.has(m)) n.delete(m);
      else n.add(m);
      return n;
    });
  }

  function enviar() {
    if (elegidos.size === 0) return setAviso({ tipo: "error", texto: tc.elige });
    setAviso(null);
    iniciar(async () => {
      const r = await enviarCodigoCurso(grupoId, [...elegidos]);
      if ("error" in r) return setAviso({ tipo: "error", texto: r.error === "elige" ? tc.elige : tc.error });
      if (r.sinConfigurar) return setAviso({ tipo: "error", texto: tc.noConfigurado });
      const partes = [formato(tc.resultado, { e: r.enviados })];
      if (r.fallidos) partes.push(formato(tc.fallidos, { n: r.fallidos }));
      if (r.sinCorreo) partes.push(formato(tc.sinCorreoN, { n: r.sinCorreo }));
      setAviso({ tipo: r.fallidos || !r.enviados ? "error" : "ok", texto: partes.join(" ") });
      if (r.enviados) {
        setElegidos(new Set());
        router.refresh();
      }
    });
  }

  return (
    <section className="mb-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200" aria-labelledby="codigo-curso">
      <h2 id="codigo-curso" className="text-base font-semibold text-slate-900">
        {tc.titulo}
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-sm text-slate-500">{tl.codigoCurso}</span>
        <span className="font-mono text-xl font-semibold tracking-wider text-tinta-700">{codigo}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(codigo).then(() => setCopiado(true), () => {});
          }}
          className="rounded-lg px-2 py-1 text-xs font-medium text-tinta-700 ring-1 ring-tinta-200 hover:bg-tinta-50"
        >
          {copiado ? tl.copiado : tl.copiar}
        </button>
        <span className="basis-full text-xs text-slate-500 lg:basis-auto">{tl.codigoAyuda}</span>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-600">✉️ {tc.texto}</p>
        {!correoListo && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{tc.sinSmtp}</p>}
        {alumnos.length > 0 && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={todos}
                  disabled={posibles.length === 0}
                  onChange={() => setElegidos(todos ? new Set() : new Set(posibles))}
                  className="h-4 w-4 rounded border-slate-300 text-tinta-600"
                />
                {tc.todos}
              </label>
              <span className="text-xs text-slate-500">{formato(tc.seleccionados, { n: elegidos.size, total: posibles.length })}</span>
              <Boton type="button" onClick={enviar} disabled={pendiente || elegidos.size === 0} className="sm:ml-auto">
                {pendiente ? tc.enviando : tc.enviar}
              </Boton>
            </div>
            <ul className="mt-3 grid max-h-80 gap-1 overflow-y-auto rounded-lg bg-slate-50 p-2 sm:grid-cols-2 2xl:grid-cols-3">
              {alumnos.map((a) => {
                const puede = conCorreo(a);
                return (
                  <li key={a.matricula}>
                    <label
                      className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm ${puede ? "cursor-pointer hover:bg-white" : "opacity-60"} ${
                        elegidos.has(a.matricula) ? "bg-white ring-1 ring-tinta-200" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={elegidos.has(a.matricula)}
                        disabled={!puede}
                        onChange={() => alternar(a.matricula)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-tinta-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">{a.nombre}</span>
                        <span className="block truncate text-xs text-slate-500">{puede ? a.correo : tc.sinCorreo}</span>
                        {a.codigoEnviado && (
                          <span className="block text-[11px] text-acierto">✓ {formato(tc.enviado, { fecha: fechaLarga(a.codigoEnviado.slice(0, 10), locale) })}</span>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {aviso && (
          <p role="status" className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${aviso.tipo === "ok" ? "bg-acierto-suave text-acierto" : "bg-error-suave text-error"}`}>
            {aviso.texto}
          </p>
        )}
      </div>
    </section>
  );
}

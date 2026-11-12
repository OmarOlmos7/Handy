"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Boton } from "./ui";

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
  modo,
  automatica,
  matriculaInicial,
  nombreInicial,
}: {
  actividadId: string;
  titulo: string;
  /** profesor: sube las hojas de un alumno; sesion: el alumno ya entró; nuevo: pide correo y clave. */
  modo: "profesor" | "sesion" | "nuevo";
  /** true si la rúbrica ya está confirmada y la entrega se evalúa sola. */
  automatica: boolean;
  matriculaInicial?: string;
  nombreInicial?: string;
}) {
  const [matricula, setMatricula] = useState(matriculaInicial ?? "");
  const [nombre, setNombre] = useState(nombreInicial ?? "");
  const [cuenta, setCuenta] = useState<"crear" | "entrar">("crear");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const pideDatos = modo === "profesor" || (modo === "nuevo" && cuenta === "crear");
  const datosListos =
    modo === "sesion" ||
    (modo === "profesor" && matricula.trim().length >= 3) ||
    (modo === "nuevo" && correo.includes("@") && clave.length >= 6 && (cuenta === "entrar" || (matricula.trim().length >= 3 && nombre.trim().length >= 3)));
  const router = useRouter();
  const [paginas, setPaginas] = useState<Pagina[]>([]);
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
    paginas.forEach((p) => datos.append("fotos", p.archivo));
    try {
      const r = await fetch(`/api/entregas/${actividadId}`, { method: "POST", body: datos });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Error al enviar");
      setMensaje(
        `Listo. Se recibieron ${j.paginas} página${j.paginas > 1 ? "s" : ""} con la matrícula ${j.matricula}.` +
          (j.automatica ? " La IA ya está evaluando tu actividad." : ""),
      );
      setEstado("enviado");
      if (modo === "nuevo") router.refresh();
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "No se pudo enviar");
      setEstado("error");
    }
  }

  if (estado === "enviado") {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-4xl text-acierto">✓</p>
        <h2 className="mt-2 text-lg font-semibold">Entrega recibida</h2>
        <p className="mt-1 text-sm text-slate-600">{mensaje}</p>
        {modo !== "profesor" && (
          <p className="mt-3 text-sm text-slate-500">
            {automatica ? "La IA califica tu actividad y tu profesor la revisa." : "Tu profesor revisará tu actividad."} Cuando la
            apruebe, consulta tu retroalimentación en{" "}
            <a href="/alumno" className="text-tinta-700 underline">Mis actividades</a> con tu correo y tu clave de acceso.
          </p>
        )}
        <Boton
          variante="secundario"
          className="mt-4"
          onClick={() => {
            setPaginas([]);
            setMatricula(matriculaInicial ?? "");
            setNombre(nombreInicial ?? "");
            setEstado("editando");
          }}
        >
          Entregar otra hoja
        </Boton>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {modo !== "sesion" && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-700">{modo === "profesor" ? "1. ¿De qué alumno son las hojas?" : "1. ¿Quién eres?"}</p>
          {modo === "profesor" ? (
            <p className="mt-1 text-xs text-slate-500">Estás subiendo las hojas como profesor.</p>
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
                  {c === "crear" ? "Es mi primera entrega" : "Ya tengo cuenta"}
                </button>
              ))}
            </div>
          )}
          {pideDatos && (
            <>
              <label className="mt-3 block text-sm text-slate-700">
                Nombre completo
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="name"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base"
                  placeholder="Ej. Ana López Ruiz"
                />
              </label>
              <label className="mt-3 block text-sm text-slate-700">
                Matrícula
                <input
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  autoCapitalize="characters"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-base uppercase"
                  placeholder="Ej. A0301"
                />
              </label>
            </>
          )}
          {modo === "nuevo" && (
            <>
              <label className="mt-3 block text-sm text-slate-700">
                Correo
                <input
                  type="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  autoComplete="email"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base"
                  placeholder="tu@correo.com"
                />
              </label>
              <label className="mt-3 block text-sm text-slate-700">
                {cuenta === "crear" ? "Crea tu clave de acceso (mínimo 6 caracteres)" : "Clave de acceso"}
                <input
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  autoComplete={cuenta === "crear" ? "new-password" : "current-password"}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base"
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">
                {cuenta === "crear"
                  ? "Con tu correo y esta clave verás solo tus resultados. Guárdala bien."
                  : "Usa el correo y la clave con que entregaste antes."}
              </p>
            </>
          )}
        </div>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-medium text-slate-700">{modo === "sesion" ? "1." : "2."} Toma una foto de cada hoja de “{titulo}”</p>
        <p className="mt-1 text-xs text-slate-500">
          Pon la hoja sobre una mesa, con buena luz, que se vean las 4 esquinas negras y sin sombras.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="flex cursor-pointer items-center justify-center rounded-lg bg-tinta-600 px-3 py-3 text-sm font-medium text-white">
            Tomar foto
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { agregar(e.target.files); e.target.value = ""; }} />
          </label>
          <label className="flex cursor-pointer items-center justify-center rounded-lg bg-white px-3 py-3 text-sm font-medium text-slate-800 ring-1 ring-slate-300">
            Elegir de galería
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { agregar(e.target.files); e.target.value = ""; }} />
          </label>
        </div>
        {paginas.length > 0 && (
          <ol className="mt-4 space-y-2">
            {paginas.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Página ${i + 1}`} className="h-20 w-16 rounded object-cover ring-1 ring-slate-300" />
                <span className="flex-1 text-sm font-medium">Página {i + 1}</span>
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="rounded px-2 py-1 text-lg disabled:opacity-30" aria-label="Subir página">↑</button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === paginas.length - 1} className="rounded px-2 py-1 text-lg disabled:opacity-30" aria-label="Bajar página">↓</button>
                <button type="button" onClick={() => setPaginas((ps) => ps.filter((x) => x.id !== p.id))} className="rounded px-2 py-1 text-sm text-error" aria-label="Quitar página">Quitar</button>
              </li>
            ))}
          </ol>
        )}
      </div>

      {estado === "error" && <p className="rounded-lg bg-error-suave p-3 text-sm text-error">{mensaje}</p>}
      <Boton className="w-full py-3 text-base" onClick={enviar} disabled={!datosListos || paginas.length === 0 || estado === "enviando"}>
        {estado === "enviando" ? "Enviando…" : `${modo === "sesion" ? "2." : "3."} Enviar ${paginas.length || ""} página${paginas.length === 1 ? "" : "s"}`}
      </Boton>
    </div>
  );
}

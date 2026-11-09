"use client";

import { useState } from "react";
import { grupos } from "@/lib/datos-ejemplo";
import { Boton, BotonLink } from "./ui";

const campo =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100";

/** Formulario de nueva actividad (demostración, sin guardar). */
export function NuevaActividad() {
  const [paso, setPaso] = useState(1);
  const [hoja, setHoja] = useState<"generar" | "propia">("generar");
  const [titulo, setTitulo] = useState("");

  return (
    <div className="mx-auto max-w-2xl">
      <ol className="mb-6 flex gap-2 text-sm">
        {["Datos", "Hoja", "Listo"].map((t, i) => (
          <li key={t} className={`flex-1 rounded-lg px-3 py-2 ${paso === i + 1 ? "bg-tinta-600 text-white" : paso > i + 1 ? "bg-tinta-50 text-tinta-700" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
            {i + 1}. {t}
          </li>
        ))}
      </ol>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {paso === 1 && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Grupo
              <select className={campo}>
                {grupos.map((g) => (
                  <option key={g.id}>
                    {g.materia} · {g.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Título de la actividad
              <input className={campo} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Leyes de Newton" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Fecha de aplicación
                <input type="date" className={campo} defaultValue="2026-11-12" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Páginas por alumno
                <input type="number" min={1} max={10} defaultValue={2} className={campo} />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Indicaciones para la IA (opcional)
              <textarea rows={3} className={campo} placeholder="Ej. En los problemas exige datos, ecuación, sustitución y resultado con unidades. Acepta procedimientos alternativos si son correctos." />
            </label>
            <div className="flex justify-end">
              <Boton onClick={() => setPaso(2)} disabled={!titulo.trim()}>
                Continuar
              </Boton>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">¿Qué hoja vas a imprimir?</p>
            {[
              ["generar", "Subir mi actividad y agregar QR y marcas (recomendado)", "Sube tu documento (PDF o Word). Le agregamos el código QR y las marcas de esquina para una lectura más precisa."],
              ["propia", "Usar mi propia hoja tal cual", "Funciona igual, pero el alumno debe ordenar sus páginas y las marcas de corrección serán menos precisas."],
            ].map(([v, t, d]) => (
              <label key={v} className={`flex cursor-pointer gap-3 rounded-lg p-4 ring-2 ${hoja === v ? "ring-tinta-600" : "ring-slate-200"}`}>
                <input type="radio" name="hoja" checked={hoja === v} onChange={() => setHoja(v as "generar" | "propia")} className="mt-1" />
                <span>
                  <span className="block font-medium">{t}</span>
                  <span className="block text-sm text-slate-600">{d}</span>
                </span>
              </label>
            ))}
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 hover:border-tinta-500">
              Arrastra aquí tu actividad (PDF o Word)
              <input type="file" accept=".pdf,.doc,.docx" className="sr-only" />
            </label>
            <div className="flex justify-between">
              <Boton variante="secundario" onClick={() => setPaso(1)}>
                Atrás
              </Boton>
              <Boton onClick={() => setPaso(3)}>Crear actividad</Boton>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="text-center">
            <p className="text-4xl">✓</p>
            <h2 className="mt-2 text-lg font-semibold">“{titulo}” creada</h2>
            <p className="mt-2 text-sm text-slate-600">
              Imprime las hojas y aplícalas en clase. Después pide a tus alumnos que las escaneen con la app, y sube tu solución para preparar la rúbrica.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <BotonLink href="/profesor/actividades/leyes-newton/hoja">Ver hoja imprimible</BotonLink>
              <BotonLink href="/profesor/actividades/leyes-newton/rubrica" variante="secundario">
                Subir mi solución
              </BotonLink>
            </div>
            <p className="mt-4 text-xs text-slate-400">Demostración: se muestra la actividad de ejemplo “Leyes de Newton”.</p>
          </div>
        )}
      </div>
    </div>
  );
}

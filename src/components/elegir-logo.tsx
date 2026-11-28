"use client";

import { useState } from "react";
import { Boton } from "./ui";

/** Formulario para subir un logo propio, con vista previa antes de guardarlo. */
export function ElegirLogo({
  textos,
  maxBytes,
}: {
  textos: { elegir: string; guardar: string; nota: string; grande: string };
  maxBytes: number;
}) {
  const [vista, setVista] = useState<string>();
  const [grande, setGrande] = useState(false);
  return (
    <form action="/api/logo" method="post" encType="multipart/form-data" className="flex flex-wrap items-center gap-3">
      <label className="cursor-pointer rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-tinta-400">
        {textos.elegir}
        <input
          type="file"
          name="archivo"
          accept="image/png,image/jpeg,image/webp"
          required
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (vista) URL.revokeObjectURL(vista);
            setGrande(Boolean(f && f.size > maxBytes));
            setVista(f ? URL.createObjectURL(f) : undefined);
          }}
        />
      </label>
      {vista && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={vista} alt="" className="h-14 w-auto max-w-[8rem] rounded-md object-contain ring-1 ring-slate-200" />
      )}
      <Boton type="submit" disabled={!vista || grande}>
        {textos.guardar}
      </Boton>
      <span className={`basis-full text-xs ${grande ? "font-medium text-error" : "text-slate-500"}`}>{grande ? textos.grande : textos.nota}</span>
    </form>
  );
}

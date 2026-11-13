"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./ui";

export function BarraApp({
  enlaces,
  usuario,
  extra,
}: {
  enlaces: { href: string; texto: string; exacto?: boolean }[];
  usuario: { nombre: string; rol: string };
  extra?: React.ReactNode;
}) {
  const ruta = usePathname();
  return (
    <header className="no-imprimir border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/">
          <Logo grande />
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
          {enlaces.map((e) => {
            const activo = e.exacto ? ruta === e.href : ruta.startsWith(e.href);
            return (
              <Link
                key={e.href}
                href={e.href}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 ${activo ? "bg-tinta-50 font-medium text-tinta-700" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {e.texto}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {extra}
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-tinta-100 text-xs font-semibold text-tinta-700">
              {usuario.nombre
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0])
                .join("")}
            </span>
            <span className="hidden text-sm leading-tight md:block">
              <span className="block font-medium">{usuario.nombre}</span>
              <span className="block text-xs text-slate-500">{usuario.rol}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

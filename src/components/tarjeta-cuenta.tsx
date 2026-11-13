import Link from "next/link";
import { Logo } from "./ui";

export const campoCuenta =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-tinta-500 focus:ring-2 focus:ring-tinta-100";

/** Marco común de las pantallas de ingreso y registro. */
export function TarjetaCuenta({ titulo, error, children }: { titulo: string; error?: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-tinta-50 to-[#f6f7f9] px-4 py-16">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
        <Link href="/">
          <Logo grande />
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{titulo}</h1>
        {error && <p className="mt-4 rounded-lg bg-error-suave p-3 text-sm text-error">{error}</p>}
        {children}
      </div>
    </main>
  );
}

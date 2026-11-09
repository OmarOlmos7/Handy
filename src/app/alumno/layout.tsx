import { BarraApp } from "@/components/barra-app";

export default function LayoutAlumno({ children }: LayoutProps<"/alumno">) {
  return (
    <>
      <BarraApp
        enlaces={[{ href: "/alumno", texto: "Mis actividades", exacto: true }]}
        usuario={{ nombre: "Vista de alumno", rol: "Demo" }}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}

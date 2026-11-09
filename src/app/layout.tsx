import type { Metadata } from "next";
import { Caveat, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Letra manuscrita para simular la escritura del alumno en la vista previa de hojas.
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Retroalimenta · Evaluación de actividades impresas con IA",
    template: "%s · Retroalimenta",
  },
  description:
    "Tus alumnos fotografían su hoja, tú subes la solución y la IA sugiere calificación, correcciones en rojo y verde, reportes y el Excel para Canvas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

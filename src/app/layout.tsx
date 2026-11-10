import type { Metadata, Viewport } from "next";
import { Caveat, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Letra manuscrita para simular la escritura del alumno en la vista previa de hojas.
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Ieureka-Grader · Evaluación de actividades impresas con IA",
    template: "%s · Ieureka-Grader",
  },
  description:
    "Tus alumnos fotografían su hoja, tú subes la solución y la IA sugiere calificación, correcciones en rojo y verde, reportes y el Excel para Canvas.",
  applicationName: "Ieureka-Grader",
  // Al agregarla a la pantalla de inicio en iPhone o iPad abre como app, sin la barra de Safari.
  appleWebApp: { capable: true, title: "Ieureka-Grader", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#2554e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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

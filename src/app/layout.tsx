import type { Metadata, Viewport } from "next";
import { Caveat, Geist, Geist_Mono, Inter } from "next/font/google";
import { ProveedorTextos } from "@/components/proveedor-textos";
import { textos } from "@/lib/i18n/servidor";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Letra manuscrita para simular la escritura del alumno en la vista previa de hojas.
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });
// Letra de las hojas de actividad impresas (Inter con tamaño óptico para los títulos).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], axes: ["opsz"], style: ["normal", "italic"] });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return {
    title: { default: t.meta.titulo, template: "%s · iEureka-Grader" },
    description: t.meta.descripcion,
    applicationName: "iEureka-Grader",
    // Al agregarla a la pantalla de inicio en iPhone o iPad abre como app, sin la barra de Safari.
    appleWebApp: { capable: true, title: "iEureka-Grader", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: "#2554e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { idioma, t, locale } = await textos();
  return (
    <html
      lang={idioma}
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ProveedorTextos valor={{ idioma, t, locale }}>{children}</ProveedorTextos>
      </body>
    </html>
  );
}

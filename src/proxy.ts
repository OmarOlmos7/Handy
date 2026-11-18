// Pasa la ruta pedida a las páginas en la cabecera x-ruta: el idioma depende de la vista
// (página pública por país; vistas de trabajo del profesor con el idioma de su configuración).
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const cabeceras = new Headers(request.headers);
  cabeceras.set("x-ruta", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: cabeceras } });
}

export const config = {
  // Todo menos archivos estáticos e imágenes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)"],
};

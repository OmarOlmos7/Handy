import type { Metadata } from "next";
import { PaginaLegal } from "@/components/pagina-legal";
import { textos } from "@/lib/i18n/servidor";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await textos();
  return { title: t.legal.terminos };
}

export default function Pagina() {
  return <PaginaLegal clave="terminos" />;
}

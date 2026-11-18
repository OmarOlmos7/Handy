"use client";

// Insignias de estado (actividad, entrega y nivel) con el texto en el idioma elegido.
import type { Nivel } from "@/lib/estadisticas";
import type { EstadoActividad, EstadoEntrega } from "@/lib/tipos";
import { useTextos } from "./proveedor-textos";
import { Insignia, type Tono } from "./ui";

const tonoActividad: Record<EstadoActividad, Tono> = {
  esperando_entregas: "gris",
  rubrica_pendiente: "ambar",
  evaluando: "azul",
  en_revision: "ambar",
  publicada: "verde",
};

const tonoEntrega: Record<EstadoEntrega, Tono> = {
  sin_entregar: "rojo",
  entregada: "gris",
  evaluada: "azul",
  aprobada: "verde",
};

const tonoNivel: Record<Nivel, Tono> = { alto: "verde", medio: "ambar", bajo: "rojo" };

export function InsigniaActividad({ estado }: { estado: EstadoActividad }) {
  const { t } = useTextos();
  return <Insignia tono={tonoActividad[estado]}>{t.profesor.estados.actividad[estado]}</Insignia>;
}

export function InsigniaEntrega({ estado }: { estado: EstadoEntrega }) {
  const { t } = useTextos();
  return <Insignia tono={tonoEntrega[estado]}>{t.profesor.estados.entrega[estado]}</Insignia>;
}

export function InsigniaNivel({ nivel }: { nivel: Nivel }) {
  const { t } = useTextos();
  return <Insignia tono={tonoNivel[nivel]}>{t.profesor.estados.nivel[nivel]}</Insignia>;
}

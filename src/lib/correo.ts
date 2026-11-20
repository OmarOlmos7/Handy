// Envío de correos (recuperar contraseña) por SMTP con TLS directo (puerto 465), sin dependencias.
// Se configura con variables de entorno; nunca se guardan credenciales en el código.
import "server-only";
import crypto from "node:crypto";
import tls from "node:tls";
import { construirMensaje } from "./correo-mensaje";

interface ConfiguracionSmtp {
  host: string;
  puerto: number;
  usuario: string;
  contrasena: string;
  remitente: string;
}

function configuracion(): ConfiguracionSmtp | undefined {
  const host = process.env.SMTP_HOST?.trim();
  const usuario = process.env.SMTP_USUARIO?.trim();
  const contrasena = process.env.SMTP_CONTRASENA;
  if (!host || !usuario || !contrasena) return undefined;
  return {
    host,
    puerto: Number(process.env.SMTP_PUERTO || 465),
    usuario,
    contrasena,
    remitente: process.env.CORREO_REMITENTE?.trim() || usuario,
  };
}

/** true si hay servidor de correo configurado. */
export function correoConfigurado(): boolean {
  return Boolean(configuracion());
}

/** Envía un correo de texto. Lanza un error si el servidor lo rechaza o no hay configuración. */
export async function enviarCorreo(para: string, asunto: string, texto: string): Promise<void> {
  const c = configuracion();
  if (!c) throw new Error("Correo sin configurar (SMTP_HOST, SMTP_USUARIO, SMTP_CONTRASENA)");
  const dominio = c.remitente.split("@")[1] || "localhost";
  const mensaje = construirMensaje({
    de: `iEureka-Grader <${c.remitente}>`,
    para,
    asunto,
    texto,
    id: `<${crypto.randomBytes(12).toString("hex")}@${dominio}>`,
    fecha: new Date(),
  });

  const socket = tls.connect({ host: c.host, port: c.puerto, servername: c.host });
  socket.setTimeout(20_000);
  let pendiente = "";
  const lineas: string[] = [];
  let avisar: (() => void) | undefined;
  let fallo: Error | undefined;
  socket.on("data", (d) => {
    pendiente += d.toString("utf8");
    const partes = pendiente.split("\r\n");
    pendiente = partes.pop() ?? "";
    lineas.push(...partes);
    avisar?.();
  });
  socket.on("error", (e) => {
    fallo = e;
    avisar?.();
  });
  socket.on("timeout", () => {
    fallo = new Error("SMTP: tiempo de espera agotado");
    socket.destroy();
    avisar?.();
  });

  /** Espera la respuesta completa del servidor (la última línea es "NNN texto") y revisa su código. */
  async function respuesta(esperado: number): Promise<string> {
    for (;;) {
      if (fallo) throw fallo;
      const k = lineas.findIndex((l) => /^\d{3}(?: |$)/.test(l));
      if (k >= 0) {
        const linea = lineas.splice(0, k + 1).pop()!;
        const codigo = Number(linea.slice(0, 3));
        if (codigo !== esperado) throw new Error(`SMTP ${codigo}: ${linea.slice(4, 200)}`);
        return linea;
      }
      await new Promise<void>((listo) => (avisar = listo));
      avisar = undefined;
    }
  }
  const enviar = (linea: string) => socket.write(`${linea}\r\n`);

  try {
    await respuesta(220);
    enviar(`EHLO ${dominio}`);
    await respuesta(250);
    enviar("AUTH LOGIN");
    await respuesta(334);
    enviar(Buffer.from(c.usuario).toString("base64"));
    await respuesta(334);
    enviar(Buffer.from(c.contrasena).toString("base64"));
    await respuesta(235);
    enviar(`MAIL FROM:<${c.remitente}>`);
    await respuesta(250);
    enviar(`RCPT TO:<${para}>`);
    await respuesta(250);
    enviar("DATA");
    await respuesta(354);
    socket.write(`${mensaje}\r\n.\r\n`);
    await respuesta(250);
    enviar("QUIT");
  } finally {
    socket.end();
  }
}

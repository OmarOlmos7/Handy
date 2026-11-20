// Mensaje de correo en formato MIME (texto UTF-8 en base64). Sin dependencias del servidor
// para poder probarlo.

/** Quita saltos de línea para que nadie pueda agregar cabeceras. */
function limpio(s: string) {
  return s.replace(/[\r\n]+/g, " ").trim();
}

/** Cabecera con acentos codificada en UTF-8 (RFC 2047). */
function cabeceraUtf8(s: string) {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;
}

/** Base64 en renglones de 76 caracteres. */
function base64Renglones(s: string) {
  return (Buffer.from(s, "utf8").toString("base64").match(/.{1,76}/g) ?? []).join("\r\n");
}

export function construirMensaje(m: { de: string; para: string; asunto: string; texto: string; id: string; fecha: Date }): string {
  const texto = m.texto.replace(/\r?\n/g, "\r\n");
  return [
    `From: ${limpio(m.de)}`,
    `To: <${limpio(m.para)}>`,
    `Subject: ${cabeceraUtf8(limpio(m.asunto))}`,
    `Date: ${m.fecha.toUTCString()}`,
    `Message-ID: ${limpio(m.id)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Renglones(texto),
  ].join("\r\n");
}

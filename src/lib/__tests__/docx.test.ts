import { describe, expect, it } from "vitest";
import { temarioDeTexto } from "../asignaturas";
import { textoDeDocx } from "../docx";

// Un .docx mínimo: un párrafo y una lista de dos niveles.
const DOCX = "UEsDBBQAAAAIADN0dV3HHBc8CgAAAAgAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbLMJqSxILda3AwBQSwMEFAAAAAgAM3R1XZ3tMFW8AAAAfQEAABEAAAB3b3JkL2RvY3VtZW50LnhtbJ2QPwvCMBDFv0qI0NHYgkvbpIOz4KJ7bE4I5B9Jm9Zvb9NqRRAHl3fh7uXux6ubUSsUwQdpDcX5docbVg+lsG2vwXRoGptQDhSPOPWvVtxTdUl8ko6djRRcoBxlXLsKHaQBnW2KYl91suU1SZ6kfla3fneneYHp9fKQKio0lJErineYzO7nkKzu5WbCKoPjLVDsPATwETA72ii1nKgt+ri6kvZG3qzX8B9T/puJXUDZNkXxZT15RUfe2bIHUEsBAhQDFAAAAAgAM3R1XcccFzwKAAAACAAAABMAAAAAAAAAAAAAAIABAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAMUAAAACAAzdHVdne0wVbwAAAB9AQAAEQAAAAAAAAAAAAAAgAE7AAAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAIAAgCAAAAAJgEAAAAA";

describe("Word", () => {
  it("saca el texto con el nivel de las listas", () => {
    const texto = textoDeDocx(Buffer.from(DOCX, "base64"));
    expect(texto).toBe("Unidad 1 & Cinemática\n- Movimiento uniforme\n    - Velocidad");
    expect(temarioDeTexto(texto!)).toEqual([{ nombre: "Unidad 1 & Cinemática", temas: [{ nombre: "Movimiento uniforme", subtemas: ["Velocidad"] }] }]);
  });
  it("no truena con algo que no es Word", () => {
    expect(textoDeDocx(Buffer.from("hola"))).toBeUndefined();
  });
});

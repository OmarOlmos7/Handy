// Se ejecuta una vez al arrancar el servidor. Prende el reloj de los recordatorios de asesoría.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { iniciarRelojRecordatorios } = await import("./lib/reloj-recordatorios");
  iniciarRelojRecordatorios();
}

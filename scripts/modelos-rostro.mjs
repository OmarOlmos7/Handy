// Copia a public/modelos-rostro los tres modelos de face-api que usa la asistencia con foto
// (detector de rostros, puntos del rostro y descriptor). Corre antes de `next dev` y `next build`;
// así no se guardan ~12 MB de modelos en el repositorio.
import fs from "node:fs";
import path from "node:path";

const origen = path.join("node_modules", "@vladmandic", "face-api", "model");
const destino = path.join("public", "modelos-rostro");
const modelos = ["ssd_mobilenetv1_model", "face_landmark_68_model", "face_recognition_model"];

if (!fs.existsSync(origen)) {
  console.warn("modelos-rostro: no está @vladmandic/face-api; la asistencia con foto no funcionará.");
  process.exit(0);
}
fs.mkdirSync(destino, { recursive: true });
for (const m of modelos) {
  for (const archivo of [`${m}-weights_manifest.json`, `${m}.bin`]) {
    const a = path.join(origen, archivo);
    const b = path.join(destino, archivo);
    if (!fs.existsSync(b) || fs.statSync(b).size !== fs.statSync(a).size) fs.copyFileSync(a, b);
  }
}
console.log(`modelos-rostro: ${modelos.length} modelos en ${destino}`);

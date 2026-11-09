# Retroalimenta · demo funcional

Web del profesor y del alumno para evaluar actividades impresas con apoyo de IA.
Esta versión ya funciona de punta a punta: guarda grupos, actividades y entregas,
recibe fotos desde el celular del alumno, califica con la API de Claude, genera el
PDF corregido y exporta el Excel para Canvas. Todavía no tiene inicio de sesión real
ni pagos.

## Cómo correrlo

Requiere Node.js 20 o superior y una llave de la API de Claude
(https://console.anthropic.com → API Keys).

```bash
npm install
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local   # tu llave; nunca la subas a GitHub
npm run build && npm start                         # http://localhost:3000
```

Sin llave la app funciona igual con los datos de ejemplo; solo la lectura de la
solución y la evaluación muestran el aviso "Falta la llave de la API de Claude".

Variables opcionales en `.env.local`:

| Variable | Para qué |
| --- | --- |
| `APP_URL` | Dirección que va en el QR, por ejemplo `http://192.168.1.20:3000` para que los celulares de la misma red WiFi puedan entrar |
| `DATA_DIR` | Carpeta donde se guardan la base de datos y las fotos (por omisión `./data`) |
| `CLAUDE_MODEL` | Modelo de Claude a usar (por omisión `claude-opus-5-5`) |

Para probar con celulares, arranca con `npm start -- -H 0.0.0.0` y pon en `APP_URL`
la IP de tu computadora.

## Flujo para validar con un grupo

1. **Nuevo grupo**: pega la lista de alumnos (matrícula, nombre, correo), una por línea.
2. **Nueva actividad**: título, grupo, fecha y páginas por alumno.
3. **Solución y rúbrica**: sube fotos o PDF de tu solución hecha a mano. La IA propone
   reactivos, respuestas, puntos y pasos. Revísala y confírmala.
4. **Entregas**: los alumnos escanean el QR (o abren el enlace), eligen su nombre y toman
   una foto por hoja. También puedes subir las hojas de un alumno desde la tabla.
5. **Evaluar**: 1 crédito por página. Los reactivos cerrados los califica el código contra
   tu clave; los de desarrollo los compara la IA paso por paso con tu solución.
6. **Revisar y aprobar**: ajusta puntos y comentarios; descarga el PDF corregido.
7. **Reporte del grupo**: estadísticas, Excel y CSV para Canvas. El alumno ve su reporte
   en `/alumno?m=MATRICULA` cuando lo apruebas.

En **Créditos → Reiniciar demo** regresas todo a los datos de ejemplo.

## Privacidad

A la IA solo se envían las fotos de las hojas y la rúbrica. Nunca el nombre ni la
matrícula del alumno. Pide a los alumnos que no escriban datos personales extra en
la hoja más allá de su nombre.

## Comandos

```bash
npm run dev     # desarrollo
npm test        # pruebas de calificación y estadísticas (Vitest)
npm run lint
npm run build
```

## Estructura

```
src/
  app/                    páginas y rutas de API (Next.js App Router)
    api/actividades/…     subir solución → rúbrica con IA
    api/entregas/…        fotos del alumno
    api/evaluar/…         evaluación con IA y cobro de créditos
    api/pdf/…             PDF corregido
    entregar/[id]         página del alumno para subir fotos
    acciones.ts           acciones del servidor (grupos, actividades, revisión)
  components/             UI; hoja-foto.tsx dibuja marcas sobre la foto
  lib/
    almacen.ts            base de datos JSON y archivos en disco
    ia.ts                 llamadas a la API de Claude (rúbrica y evaluación)
    calificar.ts          calificación exacta de reactivos cerrados
    pdf.ts                PDF de retroalimentación (pdf-lib)
    estadisticas.ts       calificación, reporte del grupo, niveles
    exportar.ts           Excel (exceljs) y CSV de Canvas
```

## Siguientes pasos

1. Publicar en Hostinger (VPS con Node, o Docker con Caddy y HTTPS).
2. Inicio de sesión real para profesores y alumnos.
3. Cambiar el JSON por PostgreSQL y las fotos por almacenamiento de objetos.
4. Envío del reporte por correo y pagos de créditos.

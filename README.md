# Retroalimenta · plataforma web (iteración 1)

Web del profesor y del alumno para evaluar actividades impresas con apoyo de IA.
Esta iteración es el **frontend completo con datos de ejemplo**: todavía no hay base de
datos, inicio de sesión real, pagos ni llamadas a la API de Claude.

## Cómo correrlo

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # pruebas de cálculos y exportación (Vitest)
npm run lint
npm run build && npm start   # versión de producción
```

## Qué incluye

| Ruta | Qué es |
| --- | --- |
| `/` | Página pública: propuesta de valor, cómo funciona, precios, privacidad |
| `/ingresar` | Acceso de demostración (profesor o alumno) |
| `/profesor` | Panel: grupos, actividades, saldo de créditos |
| `/profesor/actividades/nueva` | Alta de actividad en 3 pasos |
| `/profesor/actividades/[id]` | Entregas del grupo, calificación sugerida, baja confianza, aprobar todo |
| `/profesor/actividades/[id]/rubrica` | Solución del profesor y rúbrica propuesta por la IA (editable) |
| `/profesor/actividades/[id]/revision/[matricula]` | Hoja corregida (palomas, taches, comentarios en rojo) + edición de puntos y retroalimentación |
| `/profesor/actividades/[id]/reporte` | Estadísticas del grupo, temas, habilidades, niveles, **Excel** y **CSV para Canvas** |
| `/profesor/actividades/[id]/hoja` | Hoja imprimible con QR y marcas de esquina |
| `/profesor/creditos` | Tienda de créditos (demo) y movimientos |
| `/alumno`, `/alumno/reporte/[id]` | Actividades del alumno y su reporte de retroalimentación |

## Estructura

```
src/
  app/                 páginas (Next.js App Router)
  components/          UI; hoja.tsx dibuja la hoja anotada en SVG
  lib/
    tipos.ts           modelo de datos (debe coincidir con la futura API)
    datos-ejemplo.ts   datos de demostración y funciones de consulta
    estadisticas.ts    calificación, reporte del grupo, niveles
    exportar.ts        Excel (exceljs) y CSV del libro de calificaciones de Canvas
```

Para conectar el backend, sustituye las funciones de consulta de `datos-ejemplo.ts`
por llamadas a la API (FastAPI) sin cambiar las páginas.

## Siguientes pasos

1. Backend FastAPI + PostgreSQL: usuarios, grupos, actividades, entregas, créditos.
2. Autenticación real (correo y Google) con roles profesor y alumno.
3. Carga de archivos y worker de evaluación con la API de Claude.
4. PDF anotado real (PyMuPDF) a partir de la foto escaneada.
5. Pagos con Mercado Pago y webhook que acredita créditos.
6. Despliegue en VPS de Hostinger con Docker Compose y Caddy.

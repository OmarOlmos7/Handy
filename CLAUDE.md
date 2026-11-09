# Retroalimenta (web)

@AGENTS.md

- Interfaz y textos en español de México. Código con nombres en español.
- Next.js 16 (App Router, Cache Components activado), React 19, Tailwind v4, TypeScript.
- Las rutas dinámicas usan `generateStaticParams` mientras los datos sean de ejemplo.
- Los números (calificaciones, estadísticas) siempre los calcula el código en `src/lib`;
  la IA solo lee hojas y redacta textos.
- Antes de terminar un cambio: `npm test`, `npm run lint` y `npm run build`.
- Privacidad: nunca enviar nombre ni matrícula del alumno a la IA; datos de menores.

# Imagen de producción de Retroalimenta (Next.js en modo standalone).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Base libre de países por IP (DB-IP Lite, CC BY 4.0) para elegir el idioma del visitante.
# Si no se puede descargar, la app usa el idioma del navegador.
RUN node scripts/descargar-geoip.mjs geoip

FROM node:22-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/datos
# pdftoppm convierte en imágenes los PDF que entregan los alumnos desde una tableta.
# Chromium (sin interfaz) imprime la página de recomendaciones con las fórmulas de KaTeX.
# chromium-headless-shell es opcional: si la distribución no lo tiene, se usa chromium.
# fonts-wqy-microhei: letras japonesas y chinas para los PDF en esos idiomas.
RUN apt-get update \
    && apt-get install -y --no-install-recommends poppler-utils chromium fonts-dejavu-core fonts-wqy-microhei \
    && (apt-get install -y --no-install-recommends chromium-headless-shell || true) \
    && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /datos && chown node:node /datos
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/geoip ./geoip
# Hoja de estilos y fuentes de KaTeX para imprimir fórmulas en el PDF.
COPY --from=build --chown=node:node /app/node_modules/katex/dist ./node_modules/katex/dist
USER node
EXPOSE 3000
VOLUME ["/datos"]
CMD ["node", "server.js"]

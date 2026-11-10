# Publicar Retroalimenta en Hostinger (VPS)

Guía paso a paso para dejar la plataforma funcionando en internet con tu propio
dominio, HTTPS y una contraseña de acceso. Tiempo estimado: 45 a 60 minutos la
primera vez.

## Por qué un VPS y no el hosting web normal

La app guarda grupos, actividades, fotos y calificaciones como archivos en el
disco del servidor, y cada evaluación con IA puede tardar varios minutos. En el
hosting web administrado (planes Business o Cloud con Node.js) cada
publicación vuelve a construir la carpeta de la app y no hay garantía de que esos
archivos sobrevivan, ni control sobre los tiempos de espera. En un VPS tú
controlas el disco, la app corre con Docker y el mismo servidor servirá después
para FastAPI y PostgreSQL, como dice el plan maestro.

**Plan recomendado: VPS KVM 2** (2 vCPU, 8 GB de RAM, 100 GB NVMe). El KVM 1
(4 GB) alcanza para el piloto con un grupo, pero la compilación y las fotos
llenan rápido; el KVM 2 da margen sin tener que mudarse. Elige el centro de datos
más cercano a México que ofrezca (por ejemplo, Estados Unidos o Brasil).

## Antes de empezar

1. **Fusiona los cambios en GitHub** (https://github.com/OmarOlmos7/Handy/pulls), en
   este orden: el PR #2 (marcas en el margen), luego el PR de despliegue
   (Dockerfile y Caddy), y al final el PR #1 (demo funcional) hacia `main`.
   Así `main` tiene todo lo que se va a publicar.
2. **Ten a la mano tu llave de la API de Claude** (console.anthropic.com → API
   Keys). Pon un límite de gasto mensual en la consola de Anthropic.
3. **Decide el dominio.** Puede ser un subdominio de uno que ya tengas, por
   ejemplo `app.tudominio.com`, o uno nuevo comprado en Hostinger.

## Paso 1. Comprar y preparar el VPS

1. En hostinger.mx entra a **VPS** y elige **KVM 2**. Paga el periodo que
   prefieras (los periodos largos salen más baratos por mes).
2. En el asistente de configuración:
   - **Sistema operativo:** elige la plantilla **Ubuntu 24.04 con Docker**
     (aparece en "Aplicaciones" o "SO con panel" como *Docker*). Si no la ves,
     elige Ubuntu 24.04 limpio; en el paso 2 instalas Docker.
   - **Contraseña de root:** usa una larga y guárdala en tu gestor de
     contraseñas.
   - **Ubicación:** la más cercana a México.
3. Al terminar, en hPanel → **VPS → Administrar** anota la **dirección IP** (algo
   como `123.45.67.89`).

## Paso 2. Entrar al servidor

En hPanel → VPS → Administrar, pulsa **Terminal del navegador** (o desde tu
computadora: `ssh root@TU_IP`). Todo lo que sigue se escribe ahí.

Si elegiste Ubuntu limpio, instala Docker:

```bash
curl -fsSL https://get.docker.com | sh
```

Comprueba que funciona:

```bash
docker --version && docker compose version
```

## Paso 3. Apuntar el dominio al VPS

1. En hPanel → **Dominios → tu dominio → DNS / Nameservers**.
2. Agrega un registro **A**:
   - Nombre: `app` (o `@` si usarás el dominio completo)
   - Apunta a: la IP del VPS
   - TTL: el que venga por omisión
3. Si el dominio está en otro proveedor (GoDaddy, Cloudflare…), crea ahí el
   mismo registro A. En Cloudflare deja la nube en gris (sin proxy) para que
   el certificado HTTPS se emita bien.
4. Espera unos minutos y comprueba desde la terminal del VPS:

```bash
getent hosts app.tudominio.com
```

Debe responder con la IP del VPS. No sigas al paso 6 hasta que así sea.

## Paso 4. Abrir los puertos

En hPanel → VPS → **Seguridad → Firewall**, crea una regla que permita
**22 (SSH), 80 (HTTP) y 443 (HTTPS)**, TCP, desde cualquier origen. Si no hay
firewall configurado, todo está abierto y puedes saltar este paso.

## Paso 5. Descargar el código

El repositorio es privado, así que el servidor necesita permiso para leerlo. La
forma más sencilla es un token de solo lectura:

1. En GitHub: **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**. Repositorio: solo `Handy`.
   Permiso: **Contents: Read-only**. Caducidad: 90 días o más.
2. En el VPS:

```bash
cd /opt
git clone https://github.com/OmarOlmos7/Handy.git retroalimenta
# Usuario: OmarOlmos7   Contraseña: pega el token (no se ve al escribir)
cd /opt/retroalimenta
git config credential.helper store   # recuerda el token para futuras actualizaciones
```

## Paso 6. Configurar las variables

```bash
cd /opt/retroalimenta
cp despliegue/env.ejemplo .env
```

Genera el hash de la contraseña que pedirá el sitio (cambia `TU-CONTRASEÑA`):

```bash
docker run --rm caddy:2.10 caddy hash-password --plaintext 'TU-CONTRASEÑA'
```

Copia el resultado (empieza con `$2a$14$…`) y abre el archivo:

```bash
nano .env
```

Llena así:

```
DOMINIO=app.tudominio.com
RETROALIMENTA_CLAUDE_KEY=sk-ant-...tu llave...
CLAUDE_MODEL=claude-opus-5-5
ACCESO_USUARIO=profesor
ACCESO_HASH='$2a$14$...el hash completo...'
```

El hash va entre comillas simples. Guarda con `Ctrl+O`, `Enter` y sal con
`Ctrl+X`. Protege el archivo:

```bash
chmod 600 .env
```

## Paso 7. Compilar y arrancar

```bash
docker compose up -d --build
```

La primera vez tarda de 3 a 6 minutos. Al terminar:

```bash
docker compose ps          # app y caddy deben decir "running" / "Up"
docker compose logs -f     # Ctrl+C para salir
```

Caddy pide el certificado HTTPS a Let's Encrypt solo; en los registros verás
`certificate obtained successfully` en menos de un minuto.

## Paso 8. Verificar

1. Abre `https://app.tudominio.com`: debe aparecer la portada con candado.
2. Entra a **Panel del profesor**: el navegador pide usuario y contraseña
   (`profesor` y la que elegiste).
3. Abre una actividad y comprueba que la tabla, el reporte y el PDF corregido
   cargan.
4. Desde tu celular, con datos móviles (no WiFi), escanea el QR de una actividad:
   la página para subir fotos debe abrir **sin** pedir contraseña.
5. Sube la solución de una actividad nueva y confirma que la IA propone la
   rúbrica (si sale "Falta la llave de la API de Claude", revisa
   `RETROALIMENTA_CLAUDE_KEY` en `.env` y ejecuta `docker compose up -d`).

Si todo eso funciona, la plataforma ya está en línea.

## Qué queda protegido y qué no

Mientras la app no tenga inicio de sesión real, Caddy pide usuario y contraseña
para todo, excepto:

- la portada (`/`),
- la página donde el alumno sube sus fotos (`/entregar/…`) y su envío.

El reporte del alumno (`/alumno`) sí pide la contraseña, porque mostraría datos
de menores a cualquiera que adivine una matrícula. Por ahora, comparte el
reporte con el alumno desde tu sesión (PDF o pantalla).

## Uso diario

**Actualizar después de fusionar cambios en GitHub:**

```bash
cd /opt/retroalimenta && git pull && docker compose up -d --build
```

Los datos no se pierden: viven en el volumen `datos`, fuera del contenedor.

**Respaldo manual de los datos** (fotos, calificaciones):

```bash
cd /opt/retroalimenta
docker compose run --rm --user root -v "$PWD:/respaldo" --entrypoint tar app czf /respaldo/datos-$(date +%F).tar.gz -C /datos .
```

Descarga el `.tar.gz` a tu computadora (`scp root@TU_IP:/opt/retroalimenta/datos-*.tar.gz .`).
Además, en hPanel → VPS → **Instantáneas y respaldos**, activa los respaldos
semanales o toma una instantánea antes de cada cambio grande.

**Cambiar la contraseña de acceso:** genera un hash nuevo (paso 6), cámbialo en
`.env` y ejecuta `docker compose up -d`.

**Reiniciar todo:** `docker compose restart`.

## Si algo falla

| Síntoma | Qué revisar |
| --- | --- |
| El navegador dice "no es seguro" o no abre | El registro A todavía no apunta a la IP (`getent hosts …`), o los puertos 80/443 están cerrados. Luego `docker compose restart caddy`. |
| `docker compose logs caddy` muestra errores de certificado | Lo mismo que arriba; Let's Encrypt necesita llegar al puerto 80. Con Cloudflare, desactiva el proxy (nube gris). |
| Pide contraseña y no la acepta | El hash en `.env` debe ir entre comillas simples y completo. |
| "Falta la llave de la API de Claude" | `RETROALIMENTA_CLAUDE_KEY` vacío o mal copiado en `.env`. |
| La evaluación se queda cargando | `docker compose logs app`; revisa saldo y límite de la API en console.anthropic.com. |
| Error al compilar por memoria | Usa KVM 2, o crea swap: `fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`. |

## Archivos de despliegue en el repositorio

- `Dockerfile`: compila la app en modo *standalone* y la corre con Node 22.
- `docker-compose.yml`: la app más Caddy (HTTPS automático y contraseña).
- `despliegue/Caddyfile`: qué rutas son públicas y cuáles piden contraseña.
- `despliegue/env.ejemplo`: plantilla del `.env`.

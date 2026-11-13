# Publicar iEureka-Grader en Hostinger (VPS)

Guía paso a paso para dejar la plataforma funcionando en internet con tu propio
dominio y HTTPS. Los profesores crean su cuenta con correo y contraseña; los
alumnos entregan sin cuenta, con su nombre y matrícula. Tiempo estimado: 45 a
60 minutos la primera vez.

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
   este orden: el PR #2 (marcas en el margen), luego el PR #3 (cuentas de
   profesor, ID de curso y despliegue), y al final el PR #1 (demo funcional)
   hacia `main`. Así `main` tiene todo lo que se va a publicar.
2. **Ten a la mano tu llave de la API de Claude** (console.anthropic.com → API
   Keys). Pon un límite de gasto mensual en la consola de Anthropic.
3. **Decide el dominio.** Puede ser uno nuevo comprado en Hostinger (el VPS
   incluye uno gratis el primer año) o un subdominio de uno que ya tengas.

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
2. Agrega dos registros **A** (borra antes los registros A o CNAME que ya
   existan con esos nombres, por ejemplo los que apuntan al "parking" de
   Hostinger):
   - Nombre `@` → la IP del VPS
   - Nombre `www` → la IP del VPS
   - TTL: el que venga por omisión
3. Si el dominio está en otro proveedor (GoDaddy, Cloudflare…), crea ahí el
   mismo registro A. En Cloudflare deja la nube en gris (sin proxy) para que
   el certificado HTTPS se emita bien.
4. Espera unos minutos y comprueba desde la terminal del VPS:

```bash
getent hosts tudominio.com
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

Abre el archivo:

```bash
nano .env
```

Llena así:

```
DOMINIO=tudominio.com
RETROALIMENTA_CLAUDE_KEY=sk-ant-...tu llave...
CLAUDE_MODEL=claude-opus-5-5
REGISTRO_CODIGO=una-palabra-que-solo-tú-compartas
CREDITOS_INICIALES=50
```

`REGISTRO_CODIGO` es el código de invitación que pide la página de registro
de profesores. Mientras el piloto sea cerrado, ponle un valor y compártelo solo
con los profesores invitados; así nadie de fuera crea cuentas y gasta tu saldo
de la API. Si lo dejas vacío, cualquiera puede registrarse.

Guarda con `Ctrl+O`, `Enter` y sal con `Ctrl+X`. Protege el archivo:

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

1. Abre `https://tudominio.com`: debe aparecer la portada con candado.
2. **Crea tu cuenta primero.** Entra a **Crear cuenta de profesor**
   (`/registro`) con tu correo, una contraseña y el código de invitación. La
   primera cuenta que se registra se queda con los cursos de ejemplo, para que
   puedas enseñar la plataforma; cuando ya no los necesites, quítalos en
   **Créditos → Quitar datos de ejemplo**.
3. Crea un curso en **Nuevo curso**. Al guardarlo aparece su **ID de curso**
   (por ejemplo `FIS-7K2Q`) en el panel; ese ID también sale impreso en la hoja.
4. Crea una actividad, imprime la hoja y, desde tu celular con datos móviles
   (no WiFi), escanea el QR: la página para subir fotos abre **sin** cuenta y
   pide nombre y matrícula. Si la matrícula no estaba en el curso, el alumno
   queda registrado solo.
5. Sube tu solución y confirma que la IA propone la rúbrica (si sale "Falta la
   llave de la API de Claude", revisa `RETROALIMENTA_CLAUDE_KEY` en `.env` y
   ejecuta `docker compose up -d`).
6. Abre `/alumno` en otra ventana privada y entra con el ID de curso y la
   matrícula de prueba: debe aparecer la actividad "En revisión".

Si todo eso funciona, la plataforma ya está en línea.

## Cómo funcionan las cuentas

- **Profesores:** se registran con nombre, correo y contraseña (mínimo 8
  caracteres). Cada uno ve solo sus cursos, actividades, evaluaciones y
  créditos. Reciben `CREDITOS_INICIALES` de regalo al registrarse.
- **ID de curso:** cada curso tiene uno. Une las entregas de los alumnos con la
  cuenta del profesor y es lo que el alumno usa para consultar sus reportes.
- **Alumnos:** no se registran. Al entregar escriben su nombre y matrícula; con
  eso se crea su registro en el curso. Para ver sus reportes aprobados entran a
  `/alumno` con el ID de curso y su matrícula.
- Las contraseñas se guardan cifradas (scrypt) y la sesión dura 30 días.

Límite actual: cualquiera que conozca el ID de curso y una matrícula puede ver
los reportes aprobados de ese alumno. Para el piloto es aceptable si el ID de
curso solo se comparte en clase; más adelante conviene agregar un PIN por
alumno.

## Computadoras, teléfonos y tabletas

La misma dirección sirve para todos los dispositivos; no hay que publicar nada
aparte.

- **Computadora:** se usa en el navegador (Chrome, Edge, Safari o Firefox). En
  Chrome y Edge aparece además el botón **Instalar iEureka-Grader como app** en
  la pantalla de ingreso, para abrirla en su propia ventana.
- **Android (teléfono o tableta):** en Chrome, el botón **Instalar
  iEureka-Grader como app** o el menú ⋮ → **Instalar app**. Queda con ícono
  propio y abre sin la barra del navegador.
- **iPhone y iPad:** en Safari, **Compartir** → **Agregar a inicio**. La
  pantalla de ingreso lo explica.
- Los alumnos no necesitan instalar nada: escanean el QR y entregan desde el
  navegador del celular.

Esto requiere HTTPS, que Caddy ya pone. Una app nativa en la App Store y Google
Play (con Expo) puede venir después y usará el mismo VPS como servidor.

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

**Cambiar el código de invitación:** edítalo en `.env` y ejecuta
`docker compose up -d`.

**Reiniciar todo:** `docker compose restart`.

## Si algo falla

| Síntoma | Qué revisar |
| --- | --- |
| El navegador dice "no es seguro" o no abre | El registro A todavía no apunta a la IP (`getent hosts …`), o los puertos 80/443 están cerrados. Luego `docker compose restart caddy`. |
| `docker compose logs caddy` muestra errores de certificado | Lo mismo que arriba; Let's Encrypt necesita llegar al puerto 80. Con Cloudflare, desactiva el proxy (nube gris). |
| Al registrarse dice "El código de invitación no es correcto" | Debe coincidir exacto con `REGISTRO_CODIGO` en `.env`. |
| Olvidaste tu contraseña de profesor | Aún no hay recuperación por correo; pídeme que la restablezca desde el servidor. |
| "Falta la llave de la API de Claude" | `RETROALIMENTA_CLAUDE_KEY` vacío o mal copiado en `.env`. |
| La evaluación se queda cargando | `docker compose logs app`; revisa saldo y límite de la API en console.anthropic.com. |
| Error al compilar por memoria | Usa KVM 2, o crea swap: `fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`. |

## Archivos de despliegue en el repositorio

- `Dockerfile`: compila la app en modo *standalone* y la corre con Node 22.
- `docker-compose.yml`: la app más Caddy (HTTPS automático).
- `despliegue/Caddyfile`: dominio, HTTPS, redirección de www y tiempos de espera.
- `despliegue/env.ejemplo`: plantilla del `.env`.

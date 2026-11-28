# Perfil de aprendizaje y desempeño (Modelo CREAR)

Módulo que construye, por curso, el perfil de razonamiento y aprendizaje de cada alumno con el
Modelo CREAR (Comprender, Representar, Estrategia, Aplicar y Resultado, más la transferencia a casos
nuevos), alineado con la taxonomía SOLO y con Bloom revisada. Se desarrolla en tres etapas:

1. **Diagnóstico inicial** (lo que ya está): consentimiento informado, autodiagnóstico de las
   unidades (la valoración inicial que ya existía) y prueba de Stroop de lectura de colores al inicio
   y al final del semestre. El profesor adapta el Modelo CREAR a la disciplina de su curso.
2. **Seguimiento en actividades** (lo que ya está): logro por etapa CREAR en cada entrega, historial
   de intentos con tiempo, día y hora; casos equivalentes (máximo 5) si no llega a 70; bolsa de
   créditos del alumno y tienda de paquetes. Ver la sección "Seguimiento en actividades".
3. **Reporte en tablero** (pendiente): perfil por alumno para el profesor y resumen para el alumno.

La evaluación con IA no cambia: el módulo va encima del flujo existente. Con la bandera encendida,
la única diferencia en la calificación es que, si el alumno resuelve casos equivalentes, cuenta el
último (la calificación escrita a mano por el profesor sigue teniendo prioridad).

## Cómo activarlo

Todo queda detrás de la bandera `perfil_cognitivo`, apagada por omisión. Para prenderla, agrega a
`.env` (o `.env.local` en desarrollo):

```
BANDERAS=perfil_cognitivo
```

y reinicia (`docker compose up -d --build` en el VPS). Con la bandera apagada no aparece ningún
enlace nuevo, las páginas del perfil responden "no encontrada" y las acciones no guardan nada.

Con la bandera encendida:

- **Alumno**: botón "Mi perfil de aprendizaje" en el curso (`/alumno/cursos/[id]/perfil`), un aviso
  mientras falte algo del diagnóstico inicial y la prueba en `/alumno/cursos/[id]/perfil/stroop`.
- **Profesor**: botón "Perfil CREAR" en el curso (`/profesor/grupos/[id]/perfil`) con el estado de
  cada alumno, y el editor del modelo en `/profesor/grupos/[id]/perfil/modelo`.

## Privacidad

- Sin consentimiento vigente (versión `VERSION_CONSENTIMIENTO` en `src/lib/perfil/consentimiento.ts`)
  no se guarda nada del perfil. Si el alumno es menor de edad, también escribe el nombre y parentesco
  de su madre, padre o tutor y confirma su acuerdo. Puede retirar el consentimiento cuando quiera.
- El texto del consentimiento es un borrador alineado con el Aviso de privacidad, pendiente de la
  revisión del abogado. Si cambia de forma importante, sube `VERSION_CONSENTIMIENTO`: todos vuelven a
  consentir.
- El profesor solo ve a los alumnos de sus cursos y, del perfil, solo a quienes dieron su
  consentimiento (`datosPerfilGrupo` en `src/lib/perfil/diagnostico-inicial.ts`).
- La prueba de Stroop es un indicador educativo, no clínico; no cuenta para la calificación y se
  puede omitir (por ejemplo, si el alumno no distingue bien los colores).

## Datos

En `db.json` (tipos en `src/lib/tipos.ts`), todas opcionales, así que no hace falta migración:

| Colección | Qué guarda |
| --- | --- |
| `consentimientosPerfil` | Alumno, versión, fecha, si es menor y su tutor, y cuándo lo retiró |
| `stroop` | Una aplicación por alumno, semestre (`2026-2`) y momento (`inicio` o `fin`): ensayos y resumen |
| `modelosCrear` | El modelo CREAR de cada curso, con su versión y las versiones anteriores |

Los números (medianas, efecto Stroop, errores, ventanas de la prueba) los calcula
`src/lib/perfil/stroop.ts`; la IA no interviene en esta etapa.

La prueba de cierre se abre 21 días antes del primer fin de curso del alumno en el semestre (o del
fin del semestre si sus cursos no tienen fecha de fin). Si la de inicio se presentó ya dentro de esa
ventana, vale por el semestre.

## Seguimiento en actividades (etapa 2)

- **Etapa de cada elemento de la rúbrica.** Cada reactivo, paso de desarrollo y criterio tiene una
  etapa CREAR. El profesor la fija en `/profesor/grupos/[id]/perfil/actividades`; si no, la sugiere
  el código por las palabras del paso o del reactivo (`src/lib/perfil/etapas.ts`, `PISTAS_ETAPA`).
- **Logro por etapa.** Al evaluar una entrega, los puntos de cada paso o criterio se suman en su
  etapa (`logroPorEtapa`). Una etapa está lograda con 70 % o más; el nivel SOLO es el de la última
  etapa lograda en orden (`nivelAlcanzado`).
- **Intentos.** Cada entrega evaluada y cada caso equivalente terminado queda en `intentosPerfil`
  con calificación sobre 100, logro por etapa, nivel, tiempo activo, fecha, día de la semana y hora
  del centro de México. Re-evaluar la misma entrega actualiza su intento; no lo duplica. Solo se
  registra con consentimiento vigente.
- **Casos equivalentes.** Si la calificación que cuenta queda abajo de 70, el alumno pide un caso en
  `/alumno/cursos/[id]/perfil/seguimiento` (`POST /api/perfil/casos`). La IA lo genera con la
  rúbrica de la actividad (sin datos del alumno) y se resuelve como una actividad de autoestudio.
  Al terminarlo, su calificación queda en `Entrega.calificacionCaso` y cuenta en el cuaderno. Máximo
  5 por actividad; si el quinto no llega a 70, el profesor recibe un aviso automático y el alumno ve
  el botón para agendar asesoría. Los casos no cuentan en el promedio de autoestudio ni en su límite
  diario.
- **Bolsa de créditos del alumno.** Con membresía vigente (o si las licencias no son obligatorias),
  el alumno tiene 500 créditos por semestre (`src/lib/perfil/bolsa.ts`). Con la bandera encendida,
  el autoestudio y los casos equivalentes se pagan de su bolsa, no de los créditos del profesor. La
  bolsa del semestre no se acumula; lo que exceda sale de los créditos comprados, que no vencen.
- **Tienda.** `/alumno/creditos`: paquetes de 100 a 500 créditos a $100 MXN por cada 100, con Mercado
  Pago (llave `CRE-XXXX-XXXX-XXXX`, el mismo webhook de las licencias). Con `PAGOS_DEMO=1` el pago
  se simula.

Colecciones nuevas, opcionales: `intentosPerfil`, `movimientosAlumno` y `comprasCreditos`. Campos
nuevos opcionales: `etapaCrear` en reactivos, pasos y criterios; `calificacionCaso` en la entrega;
`casoDe` y `pagadoPor` en la autoactividad.

## Reporte en tablero (etapa 3)

Todo lo calcula `src/lib/perfil/tablero.ts` con los intentos registrados en la etapa 2:

- **Tablero del alumno** (`/alumno/cursos/[id]/perfil/tablero`): promedio (último intento de cada
  actividad), nivel SOLO, intentos, casos, tiempo y mejora con casos; perfil por etapa; fortalezas
  (≥ 85 %) y áreas a desarrollar (< 70 %); recomendaciones por etapa con las evidencias del Modelo
  CREAR del curso; evolución de calificaciones (SVG); horario de trabajo (7 días × 4 franjas); avance
  por unidad contra el autodiagnóstico (esperado: Avanzado 90, Bueno 75, Básico 60, Requiero apoyo 40,
  No tengo idea 20; ± 10 puntos cuenta como "como esperabas"); Stroop de inicio contra fin.
- **Tablero de un alumno para el profesor** (`/profesor/grupos/[id]/perfil/alumnos/[matricula]`): el
  mismo tablero, solo con el consentimiento vigente del alumno. Se llega desde la tabla "Seguimiento
  por etapa".
- **Reporte del grupo** (en `/profesor/grupos/[id]/perfil`): logro promedio por etapa, niveles SOLO,
  áreas más comunes, horario del grupo y las reflexiones del profesor.
- **Reflexiones** (`/profesor/grupos/[id]/perfil/reflexiones`): una por unidad del temario y una de
  cierre del curso (hasta 3000 caracteres; vacía la borra), con el logro del grupo en la unidad a un
  lado. Se guardan en `reflexionesPerfil`.
- **Ruta de mejora con IA** (`POST /api/perfil/ruta`): la pide el alumno (se paga de su bolsa) o su
  profesor (de sus créditos, con `como: "profesor"` y la matrícula). Cuesta lo mismo que una hoja en
  precisión media. A la IA solo viajan los números de `datosRutaMejora` (logro por etapa, nivel,
  promedio, horario, efecto Stroop) y el modelo CREAR del curso: nunca nombre, matrícula ni correo.
  Se guarda una por alumno y curso en `rutasMejora`, con la versión del prompt.

### Prompts versionados

Los prompts viven en `src/lib/perfil/prompts/`. Hoy solo existe `ruta_mejora_v1`; cada ruta guarda
la versión con que se redactó (`RutaMejora.prompt`). Para cambiarlo, crea `ruta_mejora_v2` en vez de
editar el anterior. No hay `diagnostico_v1` porque el diagnóstico (logro por etapa, nivel SOLO,
fortalezas y áreas) lo calcula el código, no la IA.

## Cómo agregar una disciplina

Las plantillas viven en `PLANTILLAS` de `src/lib/perfil/crear.ts`. Para una disciplina nueva:

1. Agrega una entrada con su clave (por ejemplo `medicina`) y las seis etapas
   (`comprender`, `representar`, `estrategia`, `aplicar`, `resultado`, `transferencia`), cada una con
   `elementos`, `procesos`, `modelos` y `evidencias`.
2. Agrega en `PISTAS` una expresión que reconozca la materia (por ejemplo `/medicina|anatom/i`) para
   que se sugiera sola.
3. Agrega el nombre en `perfil.crear.disciplinas` de los siete diccionarios
   (`src/lib/i18n/diccionarios/perfil/*.ts`).
4. Corre `npm test`: la prueba "cada plantilla tiene las seis etapas con sus cuatro campos" revisa
   que no falte nada.

El profesor siempre puede ajustar la plantilla a su curso; cada cambio guardado sube la versión del
modelo para que los análisis de la etapa 2 sepan con qué definición se hicieron.

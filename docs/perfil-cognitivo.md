# Perfil de aprendizaje y desempeño (Modelo CREAR)

Módulo que construye, por curso, el perfil de razonamiento y aprendizaje de cada alumno con el
Modelo CREAR (Comprender, Representar, Estrategia, Aplicar y Resultado, más la transferencia a casos
nuevos), alineado con la taxonomía SOLO y con Bloom revisada. Se desarrolla en tres etapas:

1. **Diagnóstico inicial** (lo que ya está): consentimiento informado, autodiagnóstico de las
   unidades (la valoración inicial que ya existía) y prueba de Stroop de lectura de colores al inicio
   y al final del semestre. El profesor adapta el Modelo CREAR a la disciplina de su curso.
2. **Seguimiento en actividades** (pendiente): errores y procedimientos por etapa CREAR en cada
   entrega, intentos, tiempos y horarios; casos equivalentes para practicar si no llega a 70 %.
3. **Reporte en tablero** (pendiente): perfil por alumno para el profesor y resumen para el alumno.

La calificación actual no cambia: el módulo va encima del flujo existente.

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

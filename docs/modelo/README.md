# Modelo de datos

Dos ficheros [DBML](https://dbml.dbdiagram.io/docs/), versionados junto al código:

| Fichero                        | Qué describe                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [`actual.dbml`](actual.dbml)   | La base en Supabase tras el PR 2, como referencia histórica. El esquema vigente está en `apps/api/src/db/schema/` |
| [`destino.dbml`](destino.dbml) | La base a la que se llega con la API en NestJS y Neon. Es un diseño: lo implementa el esquema de Drizzle          |

Para verlos como diagrama, pega el contenido en [dbdiagram.io](https://dbdiagram.io/d). Las tablas no se agrupan por módulo en el dibujo (en dbdiagram eso es de pago); el esquema va en el nombre de cada tabla.

## Reglas del modelo de destino

- **Un esquema de Postgres por módulo de la API**, y cada módulo solo escribe en el suyo:
  - `identity`: usuarios, sesiones y cuentas (better-auth);
  - `core`: el núcleo compartido (proyectos, miembros, invitaciones, equipo, departamentos, calendario laboral y ficheros);
  - `calendar`: el módulo Calendario (elementos, dependencias, atributos y estados).
- **Qué va en `core`**: lo que necesitaría otro módulo. La pregunta es «si mañana existe el Plan de rodaje o el Presupuesto, ¿lo usaría?». El equipo, los departamentos, el calendario laboral y los ficheros están en `core` por eso.
- **Todos los módulos pueden apuntar a `identity` y a `core`.** Entre módulos, como mucho referencias en un solo sentido y documentadas (por ejemplo, un futuro `shooting` → `calendar`), nunca ciclos.
- **El mismo nombre de arriba abajo**: el esquema `calendar` es `CalendarModule` en la API y `calendar.ts` en el esquema de Drizzle.
- **Identificadores en inglés; lo que ve el usuario, en español.** Los enums llevan su traducción como nota.

### El árbol del Calendario

- **Fases, subfases, procesos y acciones son una sola tabla, `calendar.elements`**, con el tipo explícito en `kind`: comparten atributos, pueden cruzar fases y se colocan en el tiempo igual. Hay cinco tipos de acción: evento, tarea, reunión, recordatorio y contratación.
- **Fase ⊃ subfase ⊃ proceso ⊃ acción, con niveles que se pueden saltar**: un proceso puede colgar de la fase, y en Postproducción conviven subfases y procesos. La profundidad no dice el tipo.
- **Un elemento pertenece a la fase en la que empieza**, aunque acabe en otra (el casting empieza en SoftPre y suele acabar en Preparación). Si al mover fechas su inicio sale de su padre, la app avisa y ofrece cambiarlo de fase; nunca lo cambia sola.
- **Las fechas se calculan como en el Excel del productor**: un ancla (normalmente el inicio de rodaje), duraciones con cantidad, unidad y base (naturales por defecto, laborables en las excepciones) y dependencias con desfase. Sin ajustes ocultos: mover el inicio reescribe el desfase y mover el fin, la duración. Todo es editable en cada proyecto.
- **Los eventos y las tareas** pueden durar varios días o uno; **las reuniones, los recordatorios y las contrataciones**, solo uno.
- **Al crear un bloque** («Rodaje 1», «Rodaje 2»…), el bloque recibe sus propios procesos, copiados de la plantilla de su fase (pendiente de confirmar con el productor).
- **El tablero es una capacidad, no un módulo**: estado, prioridad y tamaño son atributos opcionales de cualquier elemento.

## Del esquema actual al de destino

Hoy la base (Neon) tiene las tablas en `public` e `identity` (ver `apps/api/src/db/schema/`). Con los datos aún de prueba, moverlas de esquema es una línea por tabla.

| Actual                                                 | Destino                                                                            | Cambio                                                                                  |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `identity.*`                                           | `identity.*`                                                                       | Igual                                                                                   |
| `public.projects`                                      | `core.projects`                                                                    | Gana `kind` (cine, serie, documental)                                                   |
| `public.project_members`, `public.project_invitations` | `core.*`                                                                           | `role` y `status` pasan a enum                                                          |
| `public.profiles`                                      | `identity.users`                                                                   | Se funde: el nombre y la imagen ya están en `identity.users`                            |
| `public.columns`                                       | `calendar.statuses`                                                                | Los estados de cualquier elemento                                                       |
| `public.tasks`                                         | `calendar.elements`                                                                | Elementos de tipo tarea, sin fase (acciones sueltas), con su estado, prioridad y tamaño |
| `tasks.assignee_id`                                    | `calendar.element_assignees` + `core.crew_members`                                 | Varias personas por elemento, con o sin cuenta, como responsable o ejecutante           |
| `public.task_history`                                  | `calendar.element_status_history`                                                  | Gana quién hizo el cambio                                                               |
| —                                                      | `core.departments`, `core.work_calendars`, `core.work_calendar_days`, `core.files` | Nuevas, compartidas                                                                     |
| —                                                      | resto de `calendar.*`                                                              | Nuevas: el árbol, las dependencias y los atributos comunes                              |

## Cuándo llega cada parte

| Parte                                                                                            | PR        |
| ------------------------------------------------------------------------------------------------ | --------- |
| Tablas actuales a `core` y `calendar`; tipo de proyecto                                          | 5a        |
| El árbol de elementos y la plantilla, por tipo de proyecto                                       | 5a        |
| El calendario laboral y el motor de fechas: ancla, duraciones, dependencias y contadores de días | 5b        |
| Atributos comunes: equipo, departamentos, responsables, invitados, avisos, repetición, links     | 5c        |
| Documentos adjuntos (`core.files`), cuando haya almacenamiento                                   | posterior |
| Vistas del Calendario: Gantt, mensual, semanal                                                   | 6 y 8     |

El antiguo PR 7 (subtareas y WBS) queda absorbido por el árbol, y el PR 9 (equipo) por el 5c.

## Plantilla del calendario

Al crear un proyecto, el calendario nace de una plantilla que depende de su tipo (`core.projects.kind`: cine, serie o documental). La plantilla vive en código (`packages/domain`), versionada y con tests, y no en la base. Es solo el punto de partida: todo se puede renombrar, añadir o borrar en cada proyecto.

Se crea todo lo que aparece en la plantilla, Preparación y Rodaje incluidas. Lo único que se crea a mano son sus **bloques** («Rodaje 1 (Madrid)», «Rodaje 2 (Almería)»…): subfases que solo hacen falta si la producción se divide por estaciones o países. Fuente: el documento «Conceptos y Definiciones» del productor (8 de octubre de 2026).

| Fase                  | Subfases                                                | Procesos (y acciones)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desarrollo            | Creativa · Financiación                                 | **Creativa:** Escritura de sinopsis, Argumento (cine), Biblia (serie), Mapa de trama de personajes (serie), Escritura de guion (guiones en serie). **Financiación:** Elaboración de desglose de necesidades, Calendario de trabajo, Plan de rodaje, Presupuesto de financiación, Plan de financiación, Negociación de la financiación, Estructuración y negociación de incentivos fiscales, Dossier del proyecto y búsqueda de financiación |
| SoftPre               | —                                                       | Casting (Búsqueda de actores, Negociación de actores) · Localizaciones (Scouting) (Búsqueda de localizaciones, Localizaciones artísticas) · Evaluación económica (Elaboración de calendario, Presupuesto de ejecución, Cash flow, Protocolos y Work flow, Negociación)                                                                                                                                                                      |
| Preparación           | bloques a mano, si hacen falta                          | Localizaciones técnicas (Recce), Ensayos, Pruebas de cámara, Pruebas de vestuario y maquillaje, Chequeo de cámara                                                                                                                                                                                                                                                                                                                           |
| Rodaje                | bloques a mano, si hacen falta                          | Rodaje (Shooting y Wrap), Cierre                                                                                                                                                                                                                                                                                                                                                                                                            |
| Postproducción        | Edición · VFX · Música · Montaje de Sonido · Deliveries | **VFX:** Creación VFX, Integración y Composición, Render. **Música:** Composición, Grabación y Mezcla de música. **Montaje de Sonido:** Edición de diálogos, Foley, Edición de efectos, Edición de música. **Al nivel de las subfases:** Conformado, Etalonado, Mezcla, Copia Master                                                                                                                                                        |
| Explotación           | —                                                       | Publicidad y Marketing, Festivales, Estreno (explotación comercial)                                                                                                                                                                                                                                                                                                                                                                         |
| Acreditación de coste | —                                                       | a mano                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Los procesos de SoftPre casi nunca terminan en SoftPre: siguen hasta Preparación, antes del rodaje, y pertenecen a SoftPre porque es donde empiezan. La plantilla no fija fechas: las pone y las mueve quien planifica. Pendiente: qué procesos cambian en los documentales.

## Decidido con el productor

**7 de octubre de 2026:**

1. **Ancla.** Casi siempre es el inicio de rodaje, pero puede ser otro elemento, como un estreno ya cerrado: `is_anchor`, uno por proyecto.
2. **El calendario va de lunes a domingo; los laborables habituales, de lunes a viernes, salvo festivos.** Las duraciones en días cuentan laborables; en semanas, los siete días; en meses, meses de calendario. La semana laborable es configurable por proyecto (`working_weekdays`).
3. **Festivos y F.Especial se pueden trabajar**, con más penalización en los F.Especial: un día conserva su tipo y lleva `is_worked`.
4. **Todo el proyecto usa los festivos de un solo lugar**, aunque se ruede en varios.

**9 de octubre de 2026**, con el documento «Conceptos y Definiciones»:

1. **Cuatro niveles** (fase, subfase, proceso y acción) en un solo árbol.
2. **Tres tipos de proyecto**: cine, serie y documental.
3. **Todo es editable**: se renombran fases, se añaden nuevas y se borra lo que no se use de la plantilla.
4. **Los procesos «(cierre)» de Preparación** son los de SoftPre alargándose, no procesos nuevos.
5. **La app es, de momento, el módulo Calendario**; el tablero deja de ser la vista principal.

## Pendiente

- **Para el productor:** qué cambia en la plantilla de un documental, y confirmar que cada bloque copia los procesos de su fase.
- **Avisos:** a quién llegan (responsable, ejecutantes, todo el equipo) y por qué canal.
- **Contratación:** si necesita datos propios (empresa, persona, fechas de contrato) además de los comunes.
- **Almacenamiento de ficheros:** dónde (por ejemplo, Cloudflare R2), antes de los documentos adjuntos.

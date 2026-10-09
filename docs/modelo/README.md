# Modelo de datos

Dos ficheros [DBML](https://dbml.dbdiagram.io/docs/), versionados junto al código:

| Fichero                        | Qué describe                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| [`actual.dbml`](actual.dbml)   | La base en Supabase tras el PR 2, como referencia histórica. El esquema vigente está en `apps/api/src/db/schema/` |
| [`destino.dbml`](destino.dbml) | La base a la que se llega con la API en NestJS y Neon. Es un diseño: lo implementa el esquema de Drizzle          |

Para verlos como diagrama, pega el contenido en [dbdiagram.io](https://dbdiagram.io/d). Las tablas no se agrupan por módulo en el dibujo (en dbdiagram eso es de pago); el esquema va en el nombre de cada tabla.

## Reglas del modelo de destino

- **Un esquema de Postgres por módulo de la API**, y cada módulo solo escribe en el suyo: `identity` (better-auth), `core` (proyectos), `work` (tablero y equipo) y `planning` (plan y calendario).
- **FK libres hacia `identity` y `core`**: usuario y proyecto son el núcleo compartido. **`work` puede apuntar a `planning`**, porque cada elemento se crea dentro de un nodo del plan, **pero nunca al revés**: no hay ciclos entre módulos.
- **Identificadores en inglés; lo que ve el usuario, en español.** Los enums llevan su traducción como nota.
- **Los ids de usuario se conservan** al pasar de Supabase Auth a better-auth: `identity.users.id` es el mismo uuid de `auth.users`, así que ninguna FK cambia de persona.

## Del modelo actual al de destino

| Actual                           | Destino                                          | Cambio                                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.users` + `public.profiles` | `identity.users`                                 | Se funden. `full_name` pasa a `name`, `avatar_url` a `image`                                                                                                                            |
| —                                | `identity.accounts`, `sessions`, `verifications` | Nuevas, de better-auth. La contraseña bcrypt se importa a `accounts.password`                                                                                                           |
| `public.projects`                | `core.projects`                                  | Igual                                                                                                                                                                                   |
| `public.project_members`         | `core.project_members`                           | `role` pasa a enum                                                                                                                                                                      |
| `public.project_invitations`     | `core.project_invitations`                       | `status` pasa a enum                                                                                                                                                                    |
| `public.columns`                 | `work.statuses`                                  | Se renombra: son los estados del tablero                                                                                                                                                |
| `public.tasks`                   | `work.items`                                     | Pasa a ser un elemento con tipo (tarea, evento, reunión, recordatorio o contratación), creado dentro de un nodo del plan, con fechas y hora, subelementos y avisos (`work.item_alerts`) |
| `tasks.assignee_id`              | `work.item_assignees` + `work.crew_members`      | Varias personas por elemento, tengan cuenta o no (PR 9)                                                                                                                                 |
| `public.task_history`            | `work.item_history`                              | Gana `moved_by`                                                                                                                                                                         |
| —                                | `planning.*`                                     | Nuevo: árbol de fases, subfases y procesos, dependencias y calendario laboral (PR 5)                                                                                                    |

## Cuándo llega cada parte

| Parte                                                                  | PR        |
| ---------------------------------------------------------------------- | --------- |
| La API usa las tablas actuales tal cual, sobre el Postgres de Supabase | 3.1 a 4.1 |
| `identity` con better-auth                                             | 4.2       |
| Paso a Neon; los esquemas por módulo se crean ahí                      | 4.3       |
| `work.items`: tipos, fechas con hora, subelementos y avisos            | 5 y 7     |
| `planning`                                                             | 5         |
| `work.crew_members` y `item_assignees`                                 | 9         |

## Decidido con el productor (7 de octubre de 2026)

1. **Ancla.** Casi siempre es el inicio de rodaje, pero puede ser otro nodo, como un estreno ya cerrado. El modelo lo permite: `is_anchor` puede ir en cualquier nodo, con uno por proyecto.
2. **Tres niveles: fase, subfase y proceso.** Dentro de cualquiera de ellos se crean **elementos** de cinco tipos: tarea, evento, reunión, recordatorio y contratación. **Todos llevan avisos.** De ahí `work.items` con su `kind`, su enlace al nodo (`schedule_node_id`) y `work.item_alerts`.
3. **El calendario va de lunes a domingo; los laborables habituales son de lunes a viernes, salvo festivos.** Las duraciones en semanas cuentan los siete días; las de días cuentan laborables. La semana laborable es configurable por proyecto (`working_weekdays`) para producciones que ruedan, por ejemplo, de lunes a sábado.
4. **Festivos y F.Especial se pueden trabajar**, con una penalización mayor en los F.Especial. Por eso un día conserva su tipo y lleva `is_worked`: un festivo trabajado sigue siendo festivo para calcular la penalización cuando entre el presupuesto.

## Pendiente para la implementación

- ¿Qué tipos de elemento pasan por el tablero kanban? ¿Solo tareas y contrataciones, o también reuniones y eventos? De eso depende que `status_id` sea obligatorio por tipo.
- Avisos: ¿a quién llegan (asignados, todo el equipo) y por qué canales (en la app, correo, notificación en el móvil)? El modelo admite varios avisos por elemento y por canal.
- Una contratación, ¿necesita datos propios (empresa, persona, fechas de contrato)? Hoy comparte los campos comunes del elemento.

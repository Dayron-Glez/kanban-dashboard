# Campos de las acciones y de la alerta

Inventario de los campos de cada tipo de acción (evento, reunión, tarea, recordatorio, contratación y viaje) y de la alerta: dónde se guarda cada uno, si es obligatorio, su valor por defecto, cómo se valida y cuándo llega. Es la base para revisar los campos uno a uno y para maquetar los formularios.

**Fuentes**, de más a menos peso:

1. Lo decidido con el productor y con el usuario (`README.md`, «Decidido con el productor» y «Alertas»).
2. El documento «Campos de los formularios de las acciones» del prototipo del productor (FFCal, 15 oct 2026).
3. El modelo de destino (`destino.dbml`) y lo que ya existe en la base.

Donde FFCal y lo decidido no coinciden, gana lo decidido y el campo se marca **«A decidir»** si conviene revisarlo con el productor. La sección 7 los reúne todos, con una recomendación.

## 1. Cómo leer las tablas

| Columna         | Qué dice                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Dónde se guarda | Tabla y columna, o relación. «Calculado» si no se guarda: lo obtiene el motor de fechas o una función de `@repo/domain`. |
| Oblig.          | **Sí**, **No**, **Cond.** (solo en el caso que se indica) o **Auto** (no se escribe).                                    |
| Por defecto     | El valor con el que nace el campo al crear la acción.                                                                    |
| Validación      | La regla. Va en `@repo/contracts`, y la base la repite con un CHECK cuando se puede.                                     |
| Llega           | **Hecho** (ya existe), **5c** (los atributos comunes), **Más adelante** (otro módulo o un PR posterior) o **A decidir**. |

Las tablas son de `calendar` salvo que se indique otra cosa: `elements.name` es `calendar.elements.name`.

## 2. Qué lleva cada tipo

| Sección                      | Evento | Reunión      | Tarea | Recordatorio | Contratación          | Viaje            | Alerta              |
| ---------------------------- | ------ | ------------ | ----- | ------------ | --------------------- | ---------------- | ------------------- |
| Tipo                         | ✔      | ✔            | ✔     | ✔            | ✔                     | ✔                | Aparte (no es tipo) |
| Título                       | ✔      | ✔            | ✔     | ✔            | Automático            | ✔                | ✔                   |
| Cuelga de · Prioridad        | ✔      | ✔            | ✔     | ✔            | ✔ (+ Lugar)           | ✔                | —                   |
| Cuándo                       | ✔      | ✔ (un día)   | ✔     | ✔ (un día)   | Alta y baja, sin hora | De los trayectos | ✔ (fin abierto)     |
| Ya se realizó                | —      | —            | ✔     | —            | —                     | —                | —                   |
| Avisos                       | ✔      | ✔ (30 min)   | ✔     | ✔ (30 min)   | ✔ + automáticos       | ✔ + automático   | —                   |
| Repetición                   | ✔      | ✔            | ✔     | ✔            | —                     | ✔                | Pendiente           |
| Asignación                   | ✔      | ✔            | ✔     | ✔            | ✔                     | Viajeros         | Alcance             |
| Etiquetas                    | ✔      | ✔            | ✔     | ✔            | ✔                     | ✔                | —                   |
| Notas · Enlaces · Archivos   | ✔      | ✔            | ✔     | ✔            | ✔                     | ✔                | Notas               |
| Ubicación                    | ✔      | ✔            | ✔     | ✔            | Lugar                 | ✔                | —                   |
| Propio del tipo              | —      | Videollamada | —     | —            | Puesto y trabajador   | Datos del viaje  | Motivo y certeza    |
| Aprobación (si el proyecto…) | A dec. | A dec.       | —     | —            | —                     | —                | —                   |

«Ya se realizó» solo en tareas es lo decidido el 11 oct; FFCal lo pone en todos los tipos menos la contratación (ver 7.3).

## 3. Campos comunes

### 3.1. Tipo y primera línea

| Campo     | Dónde se guarda      | Oblig.           | Por defecto        | Validación                                                                                   | Llega |
| --------- | -------------------- | ---------------- | ------------------ | -------------------------------------------------------------------------------------------- | ----- |
| Tipo      | `elements.kind`      | Sí               | El de la celda     | Uno de los seis. Cambiarlo ajusta la duración (`kindChange`: reunión y recordatorio, un día) | Hecho |
| Título    | `elements.name`      | Sí (salvo cont.) | «Nuevo evento»…    | 1 a 120 caracteres (la base admite hasta 200, por los nombres de antes)                      | Hecho |
| Cuelga de | `elements.parent_id` | Sí               | La fase de la fila | Fase, subfase o proceso de la fase de la acción (`ACTION_PARENT_KINDS`)                      | Hecho |
| Prioridad | `elements.priority`  | Sí               | Normal             | Alta, normal o baja. Solo sirve para resolver conflictos                                     | Hecho |

- **Título con sugerencias**: FFCal sugiere las acciones habituales de la fase. Aquí salen de la plantilla (`template_key`) y de las acciones ya creadas en esa fase. No se guarda nada nuevo.
- **«Fase o subfase» y «Proceso» son un solo campo, «Cuelga de»**: el árbol ya permite colgar de cualquiera de los tres.
- **Si la fecha de inicio cae fuera de su padre**, FFCal mueve la acción sola. Lo decidido el 9 oct es **avisar y dejar elegir, nunca moverla sola**.

### 3.2. Cuándo

| Campo          | Dónde se guarda                         | Oblig.               | Por defecto           | Validación                                                       | Llega |
| -------------- | --------------------------------------- | -------------------- | --------------------- | ---------------------------------------------------------------- | ----- |
| Inicio         | `elements.starts_on`, calculado         | Sí                   | El día de la celda    | Lo calcula el motor: regla de inicio (la «fórmula») o fecha fija | Hecho |
| Fin            | `elements.ends_on`, calculado           | Sí (salvo cont.)     | Igual que el inicio   | Por duración o regla de fin. No anterior al inicio               | Hecho |
| Todo el día    | `elements.all_day`                      | Sí                   | Sí (no en la reunión) | Las reglas de `checkWhen`, las mismas que la alerta              | Hecho |
| Hora de inicio | `elements.start_time`                   | Cond. (con horas)    | Vacía                 | HH:MM, hora local del proyecto, sin zona                         | Hecho |
| Hora de fin    | `elements.end_time`                     | Cond. (con horas)    | Vacía                 | Un día: posterior a la de inicio. Varios días: según el horario  | Hecho |
| Horario        | `elements.hours_mode`                   | Cond. (horas y días) | Cada día              | Cada día o seguido. Lo que cruza la medianoche es «seguido»      | Hecho |
| Ya se realizó  | `elements.completed_at`, `completed_by` | No                   | Sin marcar            | Solo en tareas (CHECK). Tacha la acción y quita sus avisos       | Hecho |

- **Las fechas no son campos libres**: inicio y fin salen del motor (duración más reglas). La «fórmula» de FFCal («−1 semana inicio de Rodaje») es una regla de dependencia, ya hecha (`SetElementRuleInput`). Escribir una fecha a mano fija la acción.
- **El selector de «Cuándo» de las acciones** no pide la duración con su unidad (una acción no dura semanas ni meses, 17 oct) y elegir es aplicar, sin «Aplicar»: un día, al pulsarlo; un periodo, al pulsar el fin. El de las fases sí la pide, con su botón.
- **No se planifica hacia atrás** (17 oct): ningún calendario deja elegir días anteriores a hoy, y en el menú de una celda pasada no se crean acciones. Lo guardado antes de hoy se puede seguir editando. De momento es solo de la interfaz: la API no lo comprueba.
- **FFCal escribe la duración de las horas** (hora de inicio + duración = hora de fin). Aquí se guarda la hora de fin y la duración se muestra en el formulario, calculada: es un campo solo de interfaz.
- **Reunión y recordatorio** son de un día: sin campo de fin. Lo comprueban contracts y la API; no hay CHECK, porque la fecha de fin la escribe el motor después de insertar la fila y la incumpliría.
- **El «Cuándo» de las acciones no tiene fin abierto**, salvo la contratación sin baja. El de la alerta sí (`OpenWhenSchema`).

### 3.3. Avisos

| Campo        | Dónde se guarda                              | Oblig. | Por defecto          | Validación                                                  | Llega |
| ------------ | -------------------------------------------- | ------ | -------------------- | ----------------------------------------------------------- | ----- |
| Respecto a   | `element_notifications.relative_to`          | Sí     | Comienzo             | Comienzo o fin                                              | 5c    |
| Cuánto antes | `element_notifications.offset_amount`        | Sí     | Según el tipo        | Entero ≥ 0 (0 = al empezar)                                 | 5c    |
| Unidad       | `element_notifications.offset_unit`          | Sí     | Días                 | Minutos, horas, días o semanas                              | 5c    |
| Base         | `element_notifications.offset_basis` (nueva) | Sí     | Naturales            | Naturales o laborables: «3 días de trabajo antes del final» | 5c    |
| Automáticos  | Calculado                                    | Auto   | Viaje y contratación | No se pueden quitar. Como mucho 3 propios en esos dos tipos | 5c    |

- **La lista de FFCal** (al empezar; 15 o 30 minutos; 1 o 2 horas; 1, 2 o 3 días; el laborable anterior; 3 días de trabajo antes del final; 1 semana) son atajos del formulario sobre estos cuatro campos: no hace falta guardarlos aparte.
- **«El día laborable anterior»** es 1 día en base laborable. Para eso hace falta la columna nueva `offset_basis`, que no está en el dbml.
- **Los automáticos no se guardan**: los calcula `@repo/domain` a partir de las fechas, igual que los conflictos. Así no se desincronizan si se mueve la acción.
- **A quién llegan y por qué canal** sigue pendiente (README, «Pendiente»). Hasta decidirlo, `channel` vale `app`.

### 3.4. Repetición

| Campo        | Dónde se guarda                     | Oblig.               | Por defecto  | Validación                                  | Llega        |
| ------------ | ----------------------------------- | -------------------- | ------------ | ------------------------------------------- | ------------ |
| Se repite    | `elements.recurrence_rule` (`FREQ`) | No                   | No se repite | Cada día, semana, mes o año                 | Más adelante |
| Cada cuántos | `recurrence_rule` (`INTERVAL`)      | Cond. (si se repite) | 1            | Entero de 1 a 999                           | Más adelante |
| Hasta        | `recurrence_rule` (`UNTIL`)         | No                   | Sin fin      | No anterior al inicio. FFCal admite fórmula | Más adelante |

- **Solo acciones de un día**, y nunca la contratación (CHECK).
- **Las repeticiones se calculan, no se guardan**, al pintar el Gantt.
- **Más adelante y no en el 5c**: una repetición que se mueve con el motor (y «hasta» con fórmula) toca la vista previa, los conflictos y el Gantt, y merece su propio PR. Ver 7.6.

### 3.5. Asignación

| Campo         | Dónde se guarda                           | Oblig. | Por defecto   | Validación                                                                      | Llega |
| ------------- | ----------------------------------------- | ------ | ------------- | ------------------------------------------------------------------------------- | ----- |
| Creada por    | `elements.created_by`                     | Auto   | Quien la crea | Solo lectura. No existe todavía en la base                                      | 5c    |
| Responsable   | `element_assignees`, `role = responsible` | No     | —             | Como mucho uno (índice único parcial)                                           | Hecho |
| Ejecutantes   | `element_assignees`, `role = executor`    | No     | —             | Personas del equipo del proyecto, sin repetir                                   | Hecho |
| Departamentos | `element_departments`                     | No     | —             | Departamentos del proyecto, sin repetir                                         | Hecho |
| Participantes | `element_guests`                          | No     | —             | Del equipo, o nombre y email de fuera (los dos obligatorios). Email sin repetir | Hecho |

- **En FFCal cada persona es un texto suelto** (cargo, nombre, email y departamento) que se rellena al elegir a alguien conocido. Aquí el responsable y los ejecutantes son siempre personas del equipo (`core.crew_members`), y solo los participantes pueden ser de fuera.
- **«Basta el cargo si el puesto aún no tiene persona»** no cabe en este modelo. Es lo que hace la contratación sin trabajador. Ver 7.4.
- **Cada persona, un solo papel**: el responsable no es además ejecutante. Los participantes sí pueden repetir a alguien asignado. Los emails se guardan en minúsculas, y se comparan así para no repetirlos.
- **Se guardan enteras**: al editar, las cuatro listas se sustituyen de una vez (`people` en `PATCH /elements/:id/edits`). Si se borra a alguien del equipo o un departamento, desaparece de las acciones.
- **El viaje y la contratación no las llevan** (`actionIssues`). Al cambiar a uno de esos tipos, el formulario las quita.
- **En el formulario**, la sección «Personas» tiene un buscador por campo. Desde cualquiera se puede **añadir a alguien al equipo** (nombre, email opcional y departamento) y queda asignado de una vez; en Participantes, además, **invitar a alguien de fuera**.
- **Los conflictos con las alertas de personas y departamentos** salen de esta sección (`findAlertConflicts`). Una persona afectada choca donde es responsable, ejecutante o participante del equipo. Un departamento afectado choca donde está asignado o donde interviene alguien de él. Una persona no arrastra a su departamento: si por su falta un departamento no puede trabajar, quien crea la alerta lo marca también (17 oct). Los viajeros y el contratado se sumarán con el viaje y la contratación.

### 3.6. Etiquetas, notas, enlaces, archivos y ubicación

| Campo     | Dónde se guarda                              | Oblig. | Por defecto | Validación                                              | Llega        |
| --------- | -------------------------------------------- | ------ | ----------- | ------------------------------------------------------- | ------------ |
| Etiquetas | `element_tags` (nueva)                       | No     | —           | Texto de 1 a 60, sin «#», sin repetir en la acción      | 5c           |
| Notas     | `elements.notes`                             | No     | —           | Texto largo                                             | Hecho        |
| Enlaces   | `element_links` (`url`, `title`, `position`) | No     | —           | `https:`, `http:`, `mailto:` o `file:`                  | 5c           |
| Archivos  | `element_attachments` + `core.files`         | No     | —           | Hasta 25 MB cada uno                                    | Más adelante |
| Ubicación | `elements.location`                          | No     | —           | Texto de hasta 200. En la contratación se llama «Lugar» | Hecho        |

- **Las etiquetas de serie no se guardan**: personas, cargos, departamentos y viajeros ya son datos de la acción, y el filtro los trata como etiquetas. Solo se guardan las que se escriben a mano.
- **`elements.description` y `elements.notes`**: el dbml tiene los dos y FFCal solo notas. Ver 7.7.
- **Los archivos** esperan a decidir el almacenamiento (README, «Pendiente»). FFCal los guarda solo en el navegador, que no sirve para un producto con varios usuarios.

### 3.7. Aprobación

FFCal la pone en eventos y reuniones si el proyecto la activa: una lista de usuarios de la app que aprueban. No está en el modelo: hace falta un ajuste del proyecto, una tabla de aprobadores con su estado y avisos. **A decidir** con el productor si la usa de verdad. Ver 7.8.

## 4. Por tipo de acción

### 4.1. Evento

Acción general, de uno o varios días. Todos los comunes.

- **Obligatorios**: título, «cuelga de» e inicio; horas si no es «todo el día».
- **Por defecto**: todo el día, sin avisos, prioridad normal.

### 4.2. Reunión

De un solo día, presencial o por videollamada.

- **Por defecto**: de 10:00 a 11:00 (no es «todo el día»), aviso 30 minutos antes.
- **Sin fecha de fin**: es la del inicio.

| Campo        | Dónde se guarda              | Oblig.                     | Por defecto | Validación                                    | Llega |
| ------------ | ---------------------------- | -------------------------- | ----------- | --------------------------------------------- | ----- |
| Videollamada | `elements.video_app` (nueva) | No                         | No          | Vacía = presencial                            | Hecho |
| App          | `elements.video_app`         | Cond. (si es videollamada) | —           | Meet, Teams, Zoom, Webex u otra               | Hecho |
| Enlace       | `elements.video_url` (nueva) | No                         | —           | `https:` o `http:`. Solo en reuniones (CHECK) | Hecho |

Dos columnas nullables en `elements` en vez de una tabla: son dos datos y solo de un tipo. «Crear la convocatoria en la app» de FFCal (abrir Meet o Teams) es un enlace del formulario, sin datos nuevos.

### 4.3. Tarea

Trabajo con plazo, de uno o varios días. La única que se completa («ya se realizó», `completed_at`).

- **Por defecto**: todo el día, aviso 3 días de trabajo antes del final (relativo al fin, base laborable).

### 4.4. Recordatorio

De un solo día. Sin fecha de fin.

- **Por defecto**: todo el día, aviso 30 minutos antes. Con «todo el día», 30 minutos antes de las 0:00: ver 7.9.

### 4.5. Contratación

El alta y la baja de un puesto y, si ya se sabe, de quien lo ocupa. Sin horas, sin «ya se realizó» y sin repetición. Su título es automático: «Puesto — Trabajador».

| Campo        | Dónde se guarda                           | Oblig. | Por defecto | Validación                                                             | Llega |
| ------------ | ----------------------------------------- | ------ | ----------- | ---------------------------------------------------------------------- | ----- |
| Puesto       | `hirings.job_title_id` y `job_title_name` | Sí     | —           | Un cargo del catálogo (se copia su nombre), u «Otro» escrito (1 a 120) | 5c    |
| Código e ID  | Del cargo (`core.job_titles`)             | Auto   | —           | Solo lectura                                                           | 5c    |
| Departamento | Del cargo; escrito si es «Otro»           | Auto   | —           | Un departamento del proyecto                                           | 5c    |
| Trabajador   | `hirings.crew_member_id`                  | No     | —           | Vacío = puesto sin cubrir. Persona del equipo del proyecto             | 5c    |
| Nombre       | `core.crew_members.full_name`             | —      | —           | En la ficha de la persona, no en la contratación                       | Hecho |
| DNI          | `core.crew_members.document_id` (nueva)   | No     | —           | Hasta 30. Único en el proyecto                                         | 5c    |
| Alta         | `elements.starts_on`                      | Sí     | La celda    | Calculada: regla o fecha fija, como cualquier inicio                   | Hecho |
| Baja         | `elements.ends_on`                        | No     | Vacía       | No anterior al alta. Vacía: sigue activa (decidido el 10 oct)          | Hecho |
| Días         | Calculado                                 | Auto   | —           | Del alta a la baja, ambos incluidos                                    | 5c    |
| Lugar        | `elements.location`                       | No     | —           | Hasta 200                                                              | Hecho |

- **Una tabla aparte, `calendar.hirings`** (`element_id` como clave), para no llenar `elements` de columnas que solo usa un tipo.
- **El catálogo de cargos** (`core.job_titles`: código, abreviatura, nombre y departamento) sale de `puestos.ts` del prototipo. Lo necesitarán también el equipo y el personal, así que va en `core`.
- **El trabajador es una persona del equipo**: su nombre, apellidos y DNI van en su ficha, no se copian en cada contratación. FFCal los escribe en la contratación y separa nombre (80) y apellidos (120). Ver 7.5.
- **Avisos automáticos**: 3 días antes del alta o el laborable anterior (el que dé más margen) y el día siguiente a la baja. De serie, uno propio: 1 semana antes del alta.
- **Salario, grupo de cotización y tipo de contrato** no van aquí: irán en el módulo de personal (README, «Pendiente»).
- **FFCal exige la baja**; lo decidido el 10 oct permite dejarla vacía mientras sigue activa.

### 4.6. Viaje

El desplazamiento de personas del equipo, del reparto o de fuera. Su «Cuándo» sale de los trayectos: de la salida de la ida a la llegada final.

**El viaje** (`calendar.travels`, con `element_id` como clave):

| Campo       | Dónde se guarda                                    | Oblig. | Por defecto | Validación                      | Llega |
| ----------- | -------------------------------------------------- | ------ | ----------- | ------------------------------- | ----- |
| Origen      | `travels.origin`                                   | No     | —           | Hasta 200                       | 5c    |
| Destino     | `travels.destination`                              | No     | —           | Hasta 200                       | 5c    |
| Clase       | `travels.fare_class`                               | No     | —           | Texto con sugerencias, hasta 60 | 5c    |
| Precio      | `travels.price`                                    | No     | —           | Importe ≥ 0, dos decimales      | 5c    |
| Dietas      | `travels.per_diem`                                 | No     | No          | Sí o no                         | 5c    |
| Alojamiento | `travels.lodging` (sí o no) y columnas `lodging_*` | No     | No          | Ver tabla siguiente             | 5c    |

**Los trayectos** (`calendar.travel_legs`, uno o dos por viaje):

| Campo                                      | Dónde se guarda                | Oblig. | Por defecto                     | Validación                                                           | Llega |
| ------------------------------------------ | ------------------------------ | ------ | ------------------------------- | -------------------------------------------------------------------- | ----- |
| Ida o vuelta                               | `travel_legs.direction`        | Sí     | Ida                             | Ida obligatoria; vuelta si es «ida y vuelta». Una de cada como mucho | 5c    |
| Fecha                                      | `travel_legs.departs_on`       | Sí     | La celda (ida)                  | La vuelta, no anterior a la ida                                      | 5c    |
| Salida y llegada                           | `departs_at`, `arrives_at`     | No     | —                               | HH:MM. Llegada antes que salida = llega al día siguiente             | 5c    |
| Medio                                      | `travel_legs.mode`             | Sí     | Avión (la vuelta, el de la ida) | Avión, tren, coche, furgoneta, autobús, barco u otro                 | 5c    |
| Localizador                                | `travel_legs.locator`          | No     | —                               | Hasta 60                                                             | 5c    |
| Compañía                                   | `travel_legs.carrier`          | No     | —                               | Hasta 200                                                            | 5c    |
| Número                                     | `travel_legs.number`           | No     | —                               | Hasta 40. El rótulo cambia con el medio (vuelo, tren…)               | 5c    |
| Asiento                                    | `travel_legs.seat`             | No     | —                               | Hasta 40                                                             | 5c    |
| Terminal o estación de salida y de llegada | `from_terminal`, `to_terminal` | No     | —                               | Hasta 60. «Terminal» en avión, «estación o lugar» en los demás       | 5c    |

**El alojamiento** (columnas de `travels`):

| Campo          | Dónde se guarda         | Oblig. | Por defecto             | Validación                                                                            | Llega |
| -------------- | ----------------------- | ------ | ----------------------- | ------------------------------------------------------------------------------------- | ----- |
| Hotel          | `lodging_name`          | No     | —                       | Hasta 200                                                                             | 5c    |
| Dirección      | `lodging_address`       | No     | —                       | Hasta 300                                                                             | 5c    |
| Entrada        | `lodging_check_in`      | No     | El día que llega la ida | Fecha                                                                                 | 5c    |
| Noches         | `lodging_nights`        | No     | Calculadas              | Entero de 0 a 365. De la llegada de la ida a la salida de la vuelta; se puede cambiar | 5c    |
| Importe/noche  | `lodging_nightly_price` | No     | —                       | Importe ≥ 0                                                                           | 5c    |
| Nº de reserva  | `lodging_booking`       | No     | —                       | Hasta 60                                                                              | 5c    |
| Salida y total | Calculados              | Auto   | —                       | Entrada + noches; noches × importe                                                    | 5c    |

**Los viajeros** (`calendar.element_travelers`):

| Campo              | Dónde se guarda                    | Oblig.                      | Validación                               | Llega |
| ------------------ | ---------------------------------- | --------------------------- | ---------------------------------------- | ----- |
| Persona del equipo | `element_travelers.crew_member_id` | Cond. (o nombre)            | Del equipo del proyecto, sin repetir     | 5c    |
| Nombre y apellidos | `full_name`, si es de fuera        | Cond. (si no es del equipo) | Hasta 200                                | 5c    |
| Email              | `email`, si es de fuera            | No                          | Email válido, sin repetir en el viaje    | 5c    |
| Cargo o personaje  | `role_label`                       | No                          | Hasta 200                                | 5c    |
| Departamento       | `department_id`                    | No                          | Del proyecto. «Reparto» para los actores | 5c    |

- **Las fechas del viaje vienen de los billetes**, no del motor: un viaje es una acción fijada (`is_pinned`) cuyo inicio y fin escribe la API a partir de los trayectos. Ver 7.10.
- **Su asignación** es solo «creado por» y los viajeros: sin responsable, ejecutantes ni participantes.
- **Aviso automático**: 3 días antes o el laborable anterior (el que dé más margen). Como mucho 3 propios.
- **El importe va en la moneda del proyecto**, que todavía no existe (`core.projects.currency`, EUR por defecto). Ver 7.11.

## 5. La alerta

Entidad propia de `core`, ya hecha (PR «alerta 1»). Sus campos:

| Campo     | Dónde se guarda                            | Oblig.                            | Por defecto | Validación                                                                     | Llega |
| --------- | ------------------------------------------ | --------------------------------- | ----------- | ------------------------------------------------------------------------------ | ----- |
| Título    | `core.alerts.title`                        | Sí                                | —           | 1 a 120 caracteres                                                             | Hecho |
| Motivo    | `core.alerts.cause`                        | Sí                                | —           | Indisponibilidad, enfermedad, huelga, meteorología, permisos, proveedor u otro | Hecho |
| Certeza   | `core.alerts.certainty`                    | Sí                                | Segura      | Segura o posible                                                               | Hecho |
| Alcance   | `core.alerts.scope`                        | Sí                                | —           | Todo el proyecto, o personas y departamentos                                   | Hecho |
| Afectados | `core.alert_targets`                       | Cond. (si no es todo el proyecto) | —           | Al menos uno; del proyecto; sin mezclar con «todo el proyecto»                 | Hecho |
| Cuándo    | `core.alerts` (`starts_on` … `hours_mode`) | Sí                                | Todo el día | `OpenWhenSchema`: el de las acciones con fin abierto                           | Hecho |
| Notas     | `core.alerts.notes`                        | No                                | —           | Texto largo                                                                    | Hecho |

**Lo que FFCal le pone y aquí no lleva**, decidido el 15 y 16 oct: fase, prioridad, «ya se realizó», avisos, asignación, etiquetas, enlaces y ubicación. Una alerta no pertenece al árbol ni la hace nadie: es un suceso. La repetición queda pendiente del productor («un actor que hace teatro los fines de semana»).

**«Personas afectadas» de FFCal** (de Equipo y Actores) son aquí los destinos de la alerta, que además admiten departamentos.

## 6. Comprobaciones al guardar

Las nueve de FFCal (§11), y dónde se comprueba cada una:

| Regla de FFCal                                  | Dónde                                                              | Llega |
| ----------------------------------------------- | ------------------------------------------------------------------ | ----- |
| 1. Título vacío (salvo contratación)            | contracts y CHECK de longitud                                      | Hecho |
| 2. Contratación sin puesto                      | contracts (unión por `kind`) y CHECK en `hirings`                  | 5c    |
| 3. Sin padre, o ninguno incluye el inicio       | API: padre válido. Si el inicio sale del padre, **aviso**          | Hecho |
| 4. Reunión o recordatorio de más de un día      | contracts y API (sin CHECK: el fin lo escribe el motor)            | Hecho |
| 5. Fechas inválidas o fin antes del inicio      | contracts y motor de fechas                                        | Hecho |
| 6. Horas incoherentes                           | `checkWhen` en contracts y CHECK, como en la alerta                | Hecho |
| 7. Avisos con cantidades que no son enteros ≥ 0 | contracts y CHECK                                                  | 5c    |
| 8. Enlaces con esquema no válido                | contracts y CHECK                                                  | 5c    |
| 9. DNI repetido                                 | Índice único en `core.crew_members`; el 409 se muestra en su campo | 5c    |

**Avisos que no impiden guardar**:

- coincide con una alerta: el conflicto, ya calculado por `findAlertConflicts`;
- se solapa con otra acción: FFCal pregunta cuál priorizar, cuál eliminar o si conviven. Aquí, la prioridad lo resuelve sin preguntar al guardar. Ver 7.12.

## 7. A decidir

Lo que choca con lo decidido o no está en el modelo. Con mi recomendación, para la revisión de campos.

1. **Largo del título**: 120, como en FFCal y en la alerta, para que quepa en el Gantt y en los avisos. Hecho.
2. **Mover la acción si su inicio sale del padre**: FFCal la mueve sola. → **Avisar y dejar elegir**, como se decidió el 9 oct.
3. **«Ya se realizó» en todos los tipos** (FFCal, 15 oct) o solo en tareas (decidido el 11 oct). → **Solo tareas**: en una reunión o un viaje pasado, la fecha ya lo dice. Preguntar al productor si lo echa en falta.
4. **Asignar un cargo sin persona** («ayudante de producción», sin nombre aún). → No como texto suelto: es una **contratación sin trabajador**, y desde ella se asigna la persona cuando la haya.
5. **Datos de la persona en la contratación** (nombre, apellidos y DNI escritos en ella, como FFCal) o en la ficha del equipo. → **En la ficha**, para no repetirlos en cada contratación. El equipo gana `document_id` (DNI); nombre y apellidos siguen en `full_name`, salvo que el productor los necesite separados.
6. **Repetición en el 5c o más adelante.** → **Más adelante**, en su propio PR.
7. **Descripción y notas**: el dbml tiene las dos; FFCal, solo notas. → **Solo notas**, y fuera `description` del destino.
8. **Aprobación**: no está en el modelo. → Preguntar al productor si la usa; si no, fuera.
9. **Avisos de un recordatorio de todo el día**: «30 minutos antes» de un día entero es las 23:30 del día anterior. → Aviso **a las 9:00 del mismo día** para lo que es de todo el día, como hacen los calendarios habituales.
10. **Fechas del viaje**: si vienen de los billetes, el viaje no se mueve con el motor. → **Fijado**: el motor no lo toca y la API escribe sus fechas desde los trayectos.
11. **Moneda del proyecto** para los importes del viaje. → `core.projects.currency`, EUR por defecto, sin conversión.
12. **Solape entre acciones**: FFCal pregunta al guardar. → **No preguntar**: marcarlo en el Gantt como el conflicto de las alertas, y que la prioridad ordene. Preguntar al productor si el diálogo le es útil.
13. **Actores**: FFCal tiene listas de Equipo y de Actores. → **Una sola lista**, el equipo, con los actores en el departamento Reparto y su personaje en la ficha. Cuando llegue el Plan de rodaje se revisa.

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

- **Fases, subfases, procesos y acciones son una sola tabla, `calendar.elements`**, con el tipo explícito en `kind`: comparten atributos, pueden cruzar fases y se colocan en el tiempo igual. Hay seis tipos de acción: evento, tarea, reunión, recordatorio, contratación y viaje.
- **Fase ⊃ subfase ⊃ proceso ⊃ acción, con niveles que se pueden saltar**: un proceso puede colgar de la fase, y en Postproducción conviven subfases y procesos. La profundidad no dice el tipo.
- **Un elemento pertenece a la fase en la que empieza**, aunque acabe en otra (el casting empieza en SoftPre y suele acabar en Preparación). Si al mover fechas su inicio sale de su padre, la app avisa y ofrece cambiarlo de fase; nunca lo cambia sola.
- **Las fechas se calculan como en el prototipo del productor**, que es la referencia (su Excel quedó atrás): un ancla (normalmente el inicio de rodaje), duraciones con cantidad, unidad y base (naturales por defecto, laborables en las excepciones) y dependencias con desfase. Sin ajustes ocultos: escribir una fecha reescribe el desfase o la duración que la produce (ver «Editar el plan»). Todo es editable en cada proyecto.
- **Los eventos y las tareas** pueden durar varios días o uno; **las reuniones y los recordatorios**, solo uno. **Una contratación** va de la fecha de alta a la de baja, y sin baja sigue activa: la baja se ordena cuando el trabajador termina. **Un viaje** va de la salida de la ida a la llegada final, en uno o varios días.
- **Al crear un bloque** («Rodaje 1», «Rodaje 2»…), el bloque recibe sus propios procesos, copiados de la plantilla de su fase: cada bloque de rodaje, su Shooting y su Wrap.
- **Las acciones siempre cuelgan de un elemento**: fase, subfase o proceso. Como en el prototipo, solo las tareas se marcan como hechas (`completed_at`) y la prioridad sirve para resolver conflictos; no hay estados, columnas ni tamaños.

## Del esquema actual al de destino

Hoy la base (Neon) tiene las tablas en `public` e `identity` (ver `apps/api/src/db/schema/`). Con los datos aún de prueba, moverlas de esquema es una línea por tabla.

| Actual                                                  | Destino                                                                            | Cambio                                                                              |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `identity.*`                                            | `identity.*`                                                                       | Igual                                                                               |
| `public.projects`                                       | `core.projects`                                                                    | Gana `kind` (cine, serie, documental)                                               |
| `public.project_members`, `public.project_invitations`  | `core.*`                                                                           | `role` y `status` pasan a enum                                                      |
| `public.profiles`                                       | `identity.users`                                                                   | Se funde: el nombre y la imagen ya están en `identity.users`                        |
| `public.columns`, `public.tasks`, `public.task_history` | Se quedan en `public`, congeladas                                                  | El tablero de la etapa anterior, como vista secundaria y sin trabajo nuevo (11 oct) |
| —                                                       | `calendar.element_assignees` + `core.crew_members`                                 | Varias personas por elemento, con o sin cuenta, como responsable o ejecutante       |
| —                                                       | `core.departments`, `core.work_calendars`, `core.work_calendar_days`, `core.files` | Nuevas, compartidas                                                                 |
| —                                                       | resto de `calendar.*`                                                              | Nuevas: el árbol, las dependencias y los atributos comunes                          |

## Cuándo llega cada parte

| Parte                                                                                            | PR        |
| ------------------------------------------------------------------------------------------------ | --------- |
| Tablas actuales a `core` y `calendar`; tipo de proyecto                                          | 5a        |
| El árbol de elementos y la plantilla, por tipo de proyecto                                       | 5a        |
| El calendario laboral y el motor de fechas: ancla, duraciones, dependencias y contadores de días | 5b        |
| Atributos comunes: equipo, departamentos, responsables, invitados, avisos, repetición, links     | 5c        |
| Documentos adjuntos (`core.files`), cuando haya almacenamiento                                   | posterior |
| Vistas del Calendario: las siete del prototipo, empezando por el Gantt                           | 6 y 8     |

El antiguo PR 7 (subtareas y WBS) queda absorbido por el árbol, y el PR 9 (equipo) por el 5c.

## Plantilla del calendario

Al crear un proyecto, el calendario nace de una plantilla que depende de su tipo (`core.projects.kind`: cine, serie o documental). La plantilla vive en código (`packages/domain`), versionada y con tests, y no en la base. Es solo el punto de partida: todo se puede renombrar, añadir o borrar en cada proyecto.

Se crea todo lo que aparece en la plantilla, Preparación y Rodaje incluidas. Lo único que se crea a mano son sus **bloques** («Rodaje 1 (Madrid)», «Rodaje 2 (Almería)»…): subfases que solo hacen falta si la producción se divide por estaciones o países. Fuentes: el documento «Conceptos y Definiciones» del productor (8 de octubre de 2026), su prototipo y sus respuestas del 10 de octubre. Entre paréntesis, las acciones comunes: se crean solas y se pueden modificar o borrar.

| Fase                  | Subfases                                                | Procesos (y acciones)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desarrollo            | Creativa · Financiación                                 | **Creativa:** Escritura de sinopsis, Argumento (cine), Biblia (serie), Mapa de trama de personajes (serie), Escritura de guion (guiones en serie). **Financiación:** Elaboración de desglose de necesidades, Calendario de trabajo, Plan de rodaje, Presupuesto de financiación, Plan de financiación, Negociación de la financiación, Estructuración y negociación de incentivos fiscales, Dossier del proyecto y búsqueda de financiación |
| SoftPre               | —                                                       | Casting (Búsqueda de actores, Negociación de actores) · Localizaciones (Scouting) (Búsqueda de localizaciones, Localizaciones artísticas) · Evaluación económica (Elaboración de calendario, Presupuesto de ejecución, Cash flow, Protocolos y Work flow, Negociación)                                                                                                                                                                      |
| Preparación           | bloques a mano, si hacen falta                          | Localizaciones técnicas (Recce), Ensayos, Pruebas de cámara, Pruebas de vestuario y maquillaje, Chequeo de cámara                                                                                                                                                                                                                                                                                                                           |
| Rodaje                | bloques a mano, si hacen falta                          | Shooting, Wrap. Si hay bloques, cada uno tiene los suyos                                                                                                                                                                                                                                                                                                                                                                                    |
| Postproducción        | Edición · VFX · Música · Montaje de Sonido · Deliveries | **VFX:** Creación VFX, Integración y Composición, Render. **Música:** Composición, Grabación y Mezcla de música. **Montaje de Sonido:** Edición de diálogos, Foley, Edición de efectos, Edición de música. **Al nivel de las subfases:** Conformado, Etalonado, Mezcla, Copia Master                                                                                                                                                        |
| Explotación           | —                                                       | Publicidad y Marketing, Festivales, Estreno (explotación comercial)                                                                                                                                                                                                                                                                                                                                                                         |
| Acreditación de coste | —                                                       | a mano                                                                                                                                                                                                                                                                                                                                                                                                                                      |

Los procesos de SoftPre casi nunca terminan en SoftPre: siguen hasta Preparación, antes del rodaje, y pertenecen a SoftPre porque es donde empiezan. La plantilla no fija fechas ni duraciones: las pone y las mueve quien planifica. Pendiente: la plantilla de los documentales, que aún no está definida (mientras, usan la de cine).

### Dependencias por defecto

La plantilla sí trae cómo se encadenan los elementos, tomado del prototipo del productor. En cuanto se escribe la fecha de rodaje y las duraciones, el plan sale solo. Como todo, se puede cambiar en cada proyecto.

| Elemento                 | Se coloca así                                                                       | Dependencia                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Rodaje                   | La fecha clave, escrita a mano                                                      | ancla (`is_anchor`)                                                            |
| Desarrollo               | Su inicio se escribe a mano                                                         | fijado (`is_pinned`)                                                           |
| Preparación              | Termina el día antes de que empiece Rodaje; su duración se cuenta hacia atrás       | inicio de Rodaje → su fin, −1 día                                              |
| SoftPre                  | Termina el día antes de que empiece Preparación, igual                              | inicio de Preparación → su fin, −1 día                                         |
| Postproducción           | Empieza con el primer día de rodaje: el de Rodaje o el de cualquiera de sus bloques | inicio de Rodaje y de cada bloque → su inicio, con «cualquiera»                |
| Explotación              | Empieza al día siguiente de que acabe Postproducción                                | fin de Postproducción → su inicio, +1 día                                      |
| Acreditación de coste    | Empieza al día siguiente de que acabe Explotación                                   | fin de Explotación → su inicio, +1 día                                         |
| Subfases y procesos      | Empiezan con el elemento del que cuelgan (Edición, con Postproducción)              | inicio del padre → su inicio                                                   |
| Shooting                 | Sin bloques, ocupa lo mismo que Rodaje. Con bloques, empieza con su bloque          | inicio y fin de Rodaje → su inicio y su fin; o inicio de su bloque → su inicio |
| Wrap                     | Empieza al día siguiente de que acabe su Shooting                                   | fin del Shooting → su inicio, +1 día                                           |
| Acciones de la plantilla | Empiezan con su proceso                                                             | inicio del proceso → su inicio                                                 |

El Shooting de un rodaje sin bloques tiene en el prototipo su duración «enlazada» a la de Rodaje. Aquí no hace falta un mecanismo aparte: depende del inicio y del fin de Rodaje a la vez, y su duración sale de ahí.

## Motor de fechas

Las convenciones que deciden cada fecha, fijadas antes de escribir el motor (`packages/domain`). Reproducen las del prototipo del productor, y su proyecto de ejemplo es la prueba de aceptación: las 12 filas con fechas de la hoja «Fases» de su plantilla xlsx tienen que salir iguales.

**Fechas y duraciones**

- **Las fechas son días, sin hora ni zona**: `YYYY-MM-DD` en la API y en la base (`date`), y enteros (días desde una época, en UTC) dentro del motor.
- **El fin es el último día, incluido.** Algo de un día empieza y acaba el mismo día.
- **La duración da el fin a partir del inicio**: días, `inicio + n − 1`; semanas, `inicio + n × 7 − 1`; meses, como EDATE de Excel (el mismo día del mes, o el último si no existe: del 31 de enero, al 28 de febrero), menos un día.
- **Los decimales se redondean hacia abajo**: 2,5 semanas son 17 días. En los meses, la fracción se toma de los días del mes siguiente: 1,5 meses es un mes más la mitad de los días del mes que sigue.
- **Contar hacia atrás** (cuando lo que se conoce es el fin): el inicio es la fecha que queda la duración antes del día siguiente al fin. Es la regla de Preparación y SoftPre.
- **Días naturales.** Los laborables (`duration_basis`, `lag_basis`) llegan con el calendario laboral, en las excepciones.

**Dependencias**

- **El desfase es aritmética literal**: la fecha que se fija es la del otro elemento más el desfase, sin días implícitos. «Empieza al día siguiente del fin» es fin → inicio con **+1 día**; «termina el día antes del inicio» es inicio → fin con **−1 día**; «−4 semanas fin de Edición» es fin → inicio con −4 semanas, exactamente 28 días antes. La plantilla lleva sus ±1 explícitos.
- **Una dependencia por extremo del elemento**: como mucho una fija su inicio y otra su fin. Varias sobre el mismo extremo se combinan con `dependency_join` («cuando acaben todas» o «con la primera»), que llega con los bloques de rodaje.
- **Qué manda en cada elemento**, en este orden:
  1. el **ancla** y los **fijados** tienen su inicio escrito a mano y no se mueven;
  2. con dependencia de **inicio y de fin**, las dos fechas salen de ellas y la duración es la que resulte (el Shooting de un rodaje sin bloques);
  3. con dependencia **solo de inicio**, el fin sale de la duración;
  4. con dependencia **solo de fin**, el inicio se cuenta hacia atrás con la duración.
- **Sin duración**, se calcula el inicio si se puede y el fin queda vacío, con el motivo («falta la duración»). El prototipo lo dejaba todo vacío; saber cuándo empieza algo ya sirve para planificar.
- **Sin lo que necesita** (una dependencia hacia algo sin fechas), el elemento queda sin fechas y el motor dice qué falta. Nunca inventa una fecha.
- **Los ciclos se rechazan**, indicando el camino que los forma.
- **Semana 1** es la del inicio de Rodaje; antes, semanas negativas, y no hay semana 0.

### Editar el plan

Cualquier fecha se puede escribir a mano, también las calculadas. La app no la deja suelta: reescribe lo que la produce, para que el elemento siga encadenado y lo que se ve sea lo que se calcula.

- **Mover el inicio**:
  - con dependencia de inicio, se reescribe su desfase («VFX, −4 semanas del fin de Edición» pasa a −3 semanas);
  - si solo depende del fin, se reescribe la duración y el fin no se mueve: así, llevar el inicio de SoftPre al 5 de octubre de 2026 la deja en 17 semanas, no en 3,85 meses;
  - en el ancla o un fijado, cambia su fecha;
  - sin dependencias, pasa a ser un fijado con esa fecha.
- **Mover el fin**: con dependencia de fin, se reescribe su desfase; si no, la duración.
- **La unidad al reescribir** es la que había, si la cantidad sale entera; si no, semanas, si salen enteras; y si no, días. Nunca aparecen decimales que nadie ha escrito: los 119 días de SoftPre no son meses enteros, pero sí 17 semanas.
- **Arrastrar una barra del cronograma es escribir una fecha**, con las mismas reglas:
  - el cuerpo la mueve entera: escribe el inicio o, si solo depende de su fin, reescribe ese desfase;
  - el borde del fin cambia solo el fin; el del inicio solo se ofrece si el fin se queda donde está (el inicio no tiene regla);
  - se ajusta a días en el zoom por día y a semanas en los de semana y mes; con el teclado, ← → mueven un día, con Mayús una semana y con Alt solo el fin;
  - lo que tiene sus dos fechas atadas a otros (el Shooting a Rodaje) no se arrastra: se mueve con ellos.
- **Antes de guardar, la app enseña qué más se mueve**: el cambio («Mover Rodaje 1 semana más tarde»), cuánto se desplaza el plan («+1 semana para 45 elementos»), cuánto cada fase, lo que pasa a empezar fuera de su fase y, si se pide, la tabla de fechas de antes y después. Si no se mueve nada más, se guarda sin preguntar. La vista previa sale del mismo motor que el servidor.
- **Cambiar una regla** (de qué elemento depende un extremo, de qué punto y con qué desfase) pasa por la misma vista previa. Una regla que cerraría un ciclo no se puede elegir, y si llega a la API se rechaza con el camino que lo forma.
- **El último cambio se puede deshacer**: se aplica el cambio contrario (la duración, el desfase o la regla de antes). No hay historial de cambios.
- **En el panel de un elemento, los cambios se juntan en un borrador** y se guardan de una vez, en una sola petición: o se guarda todo o nada, con un solo recálculo. Mientras se edita, el panel enseña el plan como quedaría, con el mismo motor. Deshacer revierte el conjunto. Arrastrar en el Gantt y escribir en la tabla siguen guardando al momento.
- **Las fases no cambian de orden, y cada una solo puede solaparse con la siguiente hasta el 25 % de la duración de esa siguiente.** Es una restricción, no un aviso: el motor la comprueba, la API rechaza el cambio con un 409 que dice qué fase la incumple, y al arrastrar la barra se para en el tope.
- **Si un cambio deja un elemento empezando fuera de su fase, la app avisa**, pero no lo cambia de fase: eso es mover el elemento en el árbol, y lo decide quien planifica.

## Vistas del Calendario

La pantalla es «Calendario», con un selector entre las siete vistas del prototipo: Gantt (día a día), Semanal 1, Vertical, Mensual, Scroll, Semanal 3 y Semanal 2. De momento solo está el Gantt; las demás esperan a las acciones, las contrataciones y los festivos de los que viven.

- **El Gantt es día a día y se abre centrado en hoy**, con zoom por día, semana o mes. La vista y el zoom van en la URL (`?vista=`, `?zoom=`).
- **El mes de la cabecera se queda a la vista**: cada mes lleva su año, y su rótulo se queda pegado junto a la columna «Elemento» mientras se ve algún día suyo, hasta que el siguiente lo empuja (en el zoom por mes, el del año). Al desplazarse, siempre se sabe en qué mes se está.
- **La semana 1 es la del inicio de Rodaje**, como en el motor; los fines de semana se sombrean solo en el zoom por día.
- **Cada fase tiene un color**, y de él salen los de los dos temas con el mismo tono (en OKLCH): el relleno es el mismo pastel en los dos y, en claro, lleva un borde más oscuro del mismo tono. El texto de las barras es oscuro en los dos temas. Las subfases, procesos y acciones llevan una versión más suave del color de su fase.
- **Una fase sin duración lo dice**: un aviso en su fila y, en la cabecera, cuántas hay.
- **No hay leyenda fija** (15 de octubre): mezclaba capas del gráfico, un glosario y categorías. Hoy, la semana 1 y los fines de semana se apagan en «Vista»; lo que se aprende una vez (fase, subfase, sin fin, clave, fija) se explica donde aparece, en su Tooltip, y todo junto en la guía «Cómo leer el Gantt» (el botón ?).
- **Qué columnas, filas de la cabecera y marcas del tiempo se ven, y los tipos de acción ocultos**, son preferencias de cada persona, en su navegador.
- **En el móvil**, solo el árbol, sin rejilla.
- **«Fases» pasará a ser la sección de configuración** (añadir, renombrar, borrar, bloques y colores), con las siete fases en su orden fijo.

### Celdas y acciones en el Gantt

- **Una celda por día, cuadrada**: fila y día miden lo mismo (48 px). Con el zoom por semana o por mes, la celda es la semana o el mes.
- **Un clic es para ver** (acordado con el productor el 15 de octubre): en una celda con una acción, su detalle; con varias, la lista. En una celda vacía, un clic solo la elige. **Crear es doble clic o Enter**, o arrastrar sobre varias celdas. La lista deja crear en ese día y abrir el día completo.
- **Las acciones no son filas del árbol**: cada elemento con acciones tiene, al desplegarlo, una fila «Acciones» propia. Las de un día van arriba y los números (varias en una celda) a la misma altura; los periodos, debajo, en dos carriles que no se pisan; lo que no cabe se suma al número de su celda.
- **Plegado, un elemento resume lo de dentro bajo su barra**: marcas pequeñas, números y una línea por periodo, más apagados. Al abrir una acción desde ese resumen, se despliega lo que la contiene y la celda elegida pasa a su fila.
- **Cada tipo de acción tiene un icono y un color**, los mismos en toda la app: evento (bandera, ámbar), tarea (casilla, azul), reunión (personas, violeta), recordatorio (campana, rosa), contratación (maletín, esmeralda) y viaje (avión, naranja; el rojo queda para la alerta). Los números van neutros e invertidos.
- **Los tipos de acción se filtran sobre el Gantt**: un botón por tipo con cuántas hay. Un clic lo oculta en todo el Gantt (filas, resúmenes y números); Alt + clic o doble clic deja solo ese. Si algo está oculto se dice («Se ven 9 de 14 · Mostrar todas»). Al pasar por un tipo se atenúan los demás; al pasar por una marca, se señala su tipo. Los tipos sin ninguna acción van al final, solo con su icono: no se pueden ocultar ni pulsar, y su tooltip dice que aún no hay; «dejar solo» elige entre los que tienen acciones.
- **Las acciones se arrastran como las barras**: el cuerpo las mueve y el borde del fin las alarga. Reuniones y recordatorios son de un solo día: ni al crearlas ni después se alargan, y la API lo comprueba.
- **Borrar una acción desde el Gantt**, siempre tras confirmarlo, de tres maneras: **Supr** (o Retroceso) en la celda de una sola acción, que con varias abre su lista; el **clic derecho** sobre la acción (abrir, cambiar de tipo y borrar); y la **papelera** de cada fila en la lista de una celda. La confirmación dice qué se borra, de qué cuelga y cuándo, y que no se puede deshacer.
- **Una acción sin duración** solo ocupa su día de inicio y lo avisa; la contratación sin baja sigue en curso.
- **El panel del día** enseña sus acciones y lo que está en curso, y deja crear. Si se abre desde una fila, se cuelga dentro de su fase; desde la cabecera, de cualquier fase, subfase o proceso.
- **Hoy**: el número marcado en la cabecera y una línea cian que pasa por encima de las barras.
- **La columna «Elemento»** se ajusta arrastrando su borde y se contrae a una tira con el color de cada fila (el nombre, en un Tooltip). Contraída, no enseña duración, inicio ni fin. El botón para contraerla va siempre al final de la tabla, y el ancho cambia sin saltos. Arrastrar la cabecera de fechas desplaza el Gantt; Mayús + rueda, también.

### Paneles laterales

- **Un panel cada vez a la derecha, el de un elemento o el de un día**, del mismo ancho (520 px) y con la misma forma: cabecera, cuerpo con scroll y pie fijo.
- **No son modales**: el Gantt se sigue viendo y tocando con el panel abierto. Esc, la X o pulsar fuera del calendario lo cierran; ↑ ↓ pasan de un elemento a otro, y ← → de un día a otro.
- **Nada se guarda al tocar.** Cada campo cambiado lleva una marca cian; el pie cuenta los cambios y deja guardarlos o descartarlos. Salir con cambios (cerrar, pasar a otro elemento, abrir un día) pregunta antes.
- **«Cuándo» es un solo campo**: el tramo y lo que dura. Al abrirlo, la duración con su unidad y un calendario de dos meses (uno, en reuniones y recordatorios), limitado a lo que dibuja el Gantt:
  - pulsar solo el inicio mueve el tramo entero, con lo que dura;
  - pulsar inicio y fin da la duración, en la unidad que tenía si sale exacta;
  - los puntos de cada día son las acciones de la misma fase, con su lista al pasar por encima, para no pisarse. Los conflictos de verdad (la misma persona o el mismo sitio a la misma hora) llegan con la hora, el lugar y los participantes.
- **Una acción** muestra su tipo, cuándo y de qué cuelga (su fase, sus subfases o sus procesos), sin reglas. Se borra desde el pie, tras confirmarlo; las fases, subfases y procesos no se borran desde aquí.
- **El nombre de cualquier elemento** se cambia en la cabecera del panel.
- **El panel del día** tiene «Nueva acción» en el pie.

## Decidido con el productor

**7 de octubre de 2026:**

1. **Ancla.** Casi siempre es el inicio de rodaje, pero puede ser otro elemento, como un estreno ya cerrado: `is_anchor`, uno por proyecto.
2. **El calendario va de lunes a domingo; los laborables habituales, de lunes a viernes, salvo festivos.** La semana laborable es configurable por proyecto (`working_weekdays`).
3. **Festivos y F.Especial se pueden trabajar**, con más penalización en los F.Especial: un día conserva su tipo y lleva `is_worked`.
4. **Todo el proyecto usa los festivos de un solo lugar**, aunque se ruede en varios.

**9 de octubre de 2026**, con el documento «Conceptos y Definiciones»:

1. **Cuatro niveles** (fase, subfase, proceso y acción) en un solo árbol.
2. **Tres tipos de proyecto**: cine, serie y documental.
3. **Todo es editable**: se renombran fases, se añaden nuevas y se borra lo que no se use de la plantilla.
4. **Los procesos «(cierre)» de Preparación** son los de SoftPre alargándose, no procesos nuevos.
5. **La app es, de momento, el módulo Calendario**; el tablero deja de ser la vista principal.

**10 de octubre de 2026**, tras revisar su prototipo:

1. **El prototipo es la referencia**, no el Excel, que quedó atrás.
2. **Días naturales por defecto**, en duraciones y desfases; laborables solo en las excepciones.
3. **La contratación es un periodo**, del alta a la baja.
4. **Rodaje, y cada uno de sus bloques, tiene dos procesos: Shooting y Wrap.**
5. **Las acciones comunes se crean solas** con la plantilla, y se pueden modificar o borrar.
6. **F.Especial**: Jueves y Viernes Santo, y el 1 y 6 de enero y el 24, 25 y 31 de diciembre.

**11 de octubre de 2026**, tras recorrer el prototipo en marcha:

1. **El tablero no pasa al Calendario.** El prototipo no tiene columnas, estados, orden manual ni velocidad. Se revierte la decisión del 9 de octubre de llevar estado, prioridad y tamaño a cualquier elemento: el tablero queda congelado en `public`, como vista secundaria, por si vuelve a hacer falta.
2. **Las acciones cuelgan siempre de un elemento**, solo las tareas se completan y la prioridad llega con los conflictos.
3. **El proyecto se abre en el Calendario.**

**13 de octubre de 2026:**

1. **Las fases no cambian de orden**, y el solape con la siguiente es como mucho el 25 % de la duración de esa siguiente.
2. **Las siete vistas del prototipo**, con selector. El Gantt, día a día con foco en hoy, y con zoom por semana y por mes, que también le gustaron.

**15 de octubre de 2026:**

1. **Ver y editar, separados**: un clic en una celda es para ver (el detalle o la lista); crear, con doble clic o Enter.
2. **Los paneles laterales no son modales**, y lo que se edita en ellos se guarda con Guardar, de una vez.
3. **Borrar pide confirmación siempre**, no un aviso con «Deshacer» que se va a los segundos.
4. **El viaje es el sexto tipo de acción.** La alerta (una huelga, una baja, alguien que no está disponible) no es una acción: es un suceso con sus fechas que afecta a todo el proyecto, a personas o a departamentos, y llega aparte.

## Pendiente

- **Para el productor:** la plantilla de un documental.
- **Avisos:** a quién llegan (responsable, ejecutantes, todo el equipo) y por qué canal.
- **Contratación:** los datos laborales que el prototipo usa para las nóminas (puesto, salario, grupo de cotización, tipo de contrato) irán en un módulo futuro (personal o presupuesto), no en el Calendario. Aquí la contratación es su periodo y la persona contratada.
- **Viaje:** sus datos propios (ida y vuelta, alojamiento, viajeros) llegan con los atributos comunes.
- **Almacenamiento de ficheros:** dónde (por ejemplo, Cloudflare R2), antes de los documentos adjuntos.
- **Papelera y deshacer:** una papelera donde recuperar lo borrado, con borrado lógico (hoy borrar una acción es definitivo), y un deshacer siempre disponible, rediseñado, en lugar del aviso de unos segundos tras guardar.

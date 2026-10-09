# cauce

Aplicación web de tablero Kanban interactivo construida con React, TypeScript y Tailwind CSS, con una API propia en NestJS sobre Postgres. Permite gestionar tareas organizadas en columnas con drag & drop, búsqueda en tiempo real, proyectos compartidos con invitaciones y validación de formularios.

## Tabla de Contenidos

- [Acerca del Proyecto](#acerca-del-proyecto)
- [Tecnologías](#tecnologías)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Base de datos local](#base-de-datos-local)
- [Scripts Disponibles](#scripts-disponibles)
- [Datos de prueba](#datos-de-prueba)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Arquitectura](#arquitectura)
- [Funcionalidades](#funcionalidades)
- [Contribución](#contribución)

## Acerca del Proyecto

cauce es una herramienta de gestión visual de tareas que implementa la metodología Kanban. Permite a los usuarios crear columnas personalizadas, agregar tareas con prioridades y tamaños, y reorganizar el tablero mediante arrastrar y soltar.

El proyecto está diseñado como una SPA (Single Page Application) con enfoque en la experiencia de usuario, ofreciendo interacciones fluidas, validaciones en tiempo real y una interfaz responsiva.

## Tecnologías

### Core

| Tecnología                                    | Versión | Descripción                        |
| --------------------------------------------- | ------- | ---------------------------------- |
| [React](https://react.dev/)                   | 19      | Biblioteca de UI                   |
| [TypeScript](https://www.typescriptlang.org/) | 5.9     | Tipado estático                    |
| [Vite](https://vite.dev/)                     | 7       | Build tool y dev server            |
| [Tailwind CSS](https://tailwindcss.com/)      | 4       | Framework de estilos utility-first |
| [NestJS](https://nestjs.com/)                 | 12      | API propia (`apps/api`)            |
| [Drizzle](https://orm.drizzle.team/)          | —       | Esquema, migraciones y consultas   |
| [better-auth](https://www.better-auth.com/)   | 1.7     | Login, sesión por cookie y Google  |
| [PostgreSQL](https://www.postgresql.org/)     | 17      | Base de datos                      |

### Monorepo

| Tecnología                          | Descripción                                      |
| ----------------------------------- | ------------------------------------------------ |
| [pnpm](https://pnpm.io/) 12         | Gestor de paquetes y workspaces                  |
| [Turborepo](https://turborepo.com/) | Orquestación de tareas entre paquetes, con caché |

### UI y Componentes

| Tecnología                                     | Descripción                                                 |
| ---------------------------------------------- | ----------------------------------------------------------- |
| [shadcn/ui](https://ui.shadcn.com/)            | Componentes reutilizables basados en Radix UI               |
| [Radix UI](https://www.radix-ui.com/)          | Primitivas de UI accesibles (Dialog, Select, Tooltip, etc.) |
| [Lucide React](https://lucide.dev/)            | Iconos SVG                                                  |
| [Tabler Icons](https://tabler.io/icons)        | Iconos adicionales                                          |
| [Class Variance Authority](https://cva.style/) | Variantes de componentes                                    |

### Drag & Drop

| Tecnología                                                                                   | Descripción                                      |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [pragmatic-drag-and-drop](https://atlassian.design/components/pragmatic-drag-and-drop/about) | Motor de drag & drop sobre el arrastre nativo    |
| `pragmatic-drag-and-drop-hitbox`                                                             | Borde más cercano para colocar encima o debajo   |
| `pragmatic-drag-and-drop-auto-scroll`                                                        | Desplazamiento automático de las columnas largas |

### Formularios y Validación

| Tecnología                                                          | Descripción                       |
| ------------------------------------------------------------------- | --------------------------------- |
| [React Hook Form](https://react-hook-form.com/)                     | Gestión de formularios            |
| [Zod](https://zod.dev/)                                             | Validación de esquemas y tipos    |
| [@hookform/resolvers](https://github.com/react-hook-form/resolvers) | Integración Zod + React Hook Form |

### Routing y Testing

| Tecnología                                      | Descripción                       |
| ----------------------------------------------- | --------------------------------- |
| [React Router](https://reactrouter.com/) v7     | Enrutamiento del lado del cliente |
| [Vitest](https://vitest.dev/)                   | Tests unitarios y de componentes  |
| [Testing Library](https://testing-library.com/) | Tests de componentes React        |

## Requisitos Previos

- [Node.js](https://nodejs.org/) 22.13 o superior (lo exige ESLint 10).
- [pnpm](https://pnpm.io/installation). La versión está fijada en `packageManager` del `package.json` raíz: cualquier pnpm 10 o superior descarga y usa automáticamente la correcta.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), para la base de datos local.

## Instalación

1. Clona el repositorio y entra en él:

```bash
git clone https://github.com/Dayron-Glez/kanban-dashboard.git
cd kanban-dashboard
```

2. Instala las dependencias de todo el monorepo:

```bash
pnpm install
```

3. Levanta la base de datos local (ver [Base de datos local](#base-de-datos-local)):

```bash
pnpm db:start
```

4. Crea el fichero de entorno de la API a partir del ejemplo y rellena `BETTER_AUTH_SECRET` con un valor aleatorio (`openssl rand -base64 32`). La web no necesita ninguno: llama a la API en `/api` a través del proxy de Vite.

```bash
cp apps/api/.env.example apps/api/.env
```

5. Inicia el servidor de desarrollo:

```bash
pnpm dev
```

Arranca la web en `http://localhost:5173` y la API en `http://localhost:3000`. Regístrate con cualquier email: no se envían correos de confirmación. Entrar con Google en local exige rellenar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `apps/api/.env`.

## Base de datos local

Un único contenedor de Postgres 17, definido en `compose.yaml`, en el puerto 5433 para no chocar con un Postgres instalado en la máquina. El esquema lo crean las migraciones de Drizzle de `apps/api/drizzle/`.

| Cuándo                     | Comando         | Qué hace                                                                        |
| -------------------------- | --------------- | ------------------------------------------------------------------------------- |
| Empiezas a trabajar        | `pnpm db:start` | Arranca el contenedor y aplica las migraciones pendientes; tus datos siguen ahí |
| Terminas                   | `pnpm db:stop`  | Para el contenedor y **conserva los datos**                                     |
| Quieres empezar desde cero | `pnpm db:reset` | Borra el contenedor **y los datos**, y vuelve a crear la base migrada           |
| Quieres datos de prueba    | `pnpm db:seed`  | Ver [Datos de prueba](#datos-de-prueba)                                         |

Para consultar la base, conéctate con cualquier cliente de Postgres a `postgresql://postgres:postgres@127.0.0.1:5433/cauce`, o desde la terminal con `docker compose exec db psql -U postgres -d cauce`.

### Cambiar el esquema

El esquema se escribe a mano en `apps/api/src/db/schema/` y Drizzle genera la migración a partir de la diferencia:

1. Cambia el esquema en `apps/api/src/db/schema/`.
2. Genera la migración y **revisa el SQL**: `pnpm --filter api exec drizzle-kit generate --name nombre_descriptivo`.
3. Aplícala en local: `pnpm db:start`. Para comprobar que la serie entera se aplica limpia desde cero: `pnpm db:reset`.
4. Commitea el esquema, el SQL y los ficheros de `apps/api/drizzle/meta/` juntos.

En producción, la migración se aplica con `pnpm --filter api db:migrate:prod` antes de mergear el código que la necesita (ver el README de la API).

## Scripts Disponibles

Todos se ejecutan desde la raíz del repositorio.

| Script         | Descripción                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `dev`          | Servidor de desarrollo con HMR                                              |
| `build`        | Comprueba los tipos y genera el build de producción                         |
| `test`         | Tests en modo observación                                                   |
| `test:run`     | Ejecuta todos los tests una vez (con la caché de Turborepo)                 |
| `test:int`     | Tests de integración de la API contra la base local (`pnpm db:start` antes) |
| `typecheck`    | Comprueba los tipos de todos los paquetes                                   |
| `lint`         | Análisis estático con ESLint, sin advertencias permitidas                   |
| `format`       | Formatea el código con Prettier                                             |
| `format:check` | Comprueba el formato sin modificar nada                                     |
| `db:*`         | Base de datos local (ver [Base de datos local](#base-de-datos-local))       |

Para ejecutar un script de un solo paquete: `pnpm --filter web <script>` o `pnpm --filter api <script>`.

## Datos de prueba

Una cuenta recién creada no tiene proyectos, y con el tablero vacío es difícil juzgar pantallas como el inicio o las analíticas. `apps/api/seed.sql` siembra un entorno realista: cuatro proyectos de distinto tamaño, unas treinta tareas con prioridades y asignaciones variadas, historial de movimientos de las últimas semanas y una invitación pendiente.

1. Regístrate en la app (el seeder necesita que el usuario exista).
2. Cambia `v_email` al principio de `apps/api/seed.sql` por tu email.
3. Ejecútalo contra la base local: `pnpm db:seed`.

Es idempotente: identifica lo que siembra con el marcador `[seed]` en la descripción del proyecto, así que lo borra y lo recrea en cada ejecución sin tocar tus proyectos reales. Para revertirlo, ejecuta solo el `delete` del bloque LIMPIEZA.

## Estructura del Proyecto

Monorepo con pnpm workspaces. Dentro de la app, el código sigue una **Screaming Architecture** organizada por features: la estructura de carpetas comunica de qué trata la aplicación.

```
kanban-dashboard/
├── apps/
│   ├── api/                             # API en NestJS (ver apps/api/README.md)
│   └── web/                             # La aplicación React
│       ├── src/
│       │   ├── features/                # Dominios de la aplicación
│       │   │   ├── analytics/           # Métricas del proyecto (velocidad, prioridades, actividad)
│       │   │   ├── auth/                # Login, registro, sesión y guarda de rutas
│       │   │   ├── board/               # Tablero: contexto, vistas kanban y tabla, lógica de reordenación
│       │   │   ├── column/              # Columnas, su arrastre y la vista previa al moverlas
│       │   │   ├── home/                # Inicio con las tareas asignadas al usuario
│       │   │   ├── invite/              # Aceptación de invitaciones a proyectos
│       │   │   ├── project/             # Proyectos, miembros y ajustes
│       │   │   └── task/                # Tarjetas, formularios y paneles de tareas
│       │   ├── shared/                  # Infraestructura compartida
│       │   │   ├── api/                 # Cliente de la API, TanStack Query y errores
│       │   │   ├── components/ui/       # Componentes shadcn/ui
│       │   │   └── index.ts             # API pública de shared
│       │   ├── layouts/                 # Estructura de páginas
│       │   ├── App.tsx                  # Configuración de rutas
│       │   └── main.tsx                 # Punto de entrada
│       ├── tailwind.css                 # Variables CSS y tema
│       ├── vite.config.ts               # Vite y Vitest
│       └── components.json              # Configuración de shadcn/ui
├── packages/
│   ├── api-client/                      # Cliente HTTP de la API, con la respuesta validada
│   ├── contracts/                       # Esquemas Zod compartidos por la web y la API
│   └── domain/                          # Lógica de dominio pura, sin framework ni DOM
├── supabase/
│   ├── migrations/                      # Historial de la base en Supabase, hasta el paso a Neon
│   └── rollback/                        # Vueltas atrás manuales, que nunca se aplican solas
├── compose.yaml                         # Postgres local
├── eslint.config.js                     # ESLint para todo el monorepo
├── pnpm-workspace.yaml                  # Paquetes del workspace
└── turbo.json                           # Tareas de Turborepo
```

## Arquitectura

### Monorepo

- **`apps/web`** es la aplicación y **`apps/api`** la API. En producción, Vercel reenvía `/api/*` a la API en Railway; en local lo hace el proxy de Vite. Así comparten dominio y la cookie de sesión es de primera parte.
- **`packages/contracts`** define con Zod la forma de los datos: la API valida con esos esquemas y **`packages/api-client`** los usa para validar las respuestas en la web.
- **`packages/domain`** guarda la lógica de dominio pura, que no depende de React ni del navegador. Su `tsconfig` excluye la librería `DOM`, así que el compilador impide que ese código toque `window` o `document`. La app lo consume como `@repo/domain`.
- ESLint, Prettier y husky se configuran una vez en la raíz y aplican a todos los paquetes.

### Screaming Architecture

Cada feature de `apps/web` es autocontenida, con sus propios componentes, hooks, tipos y esquemas de validación, y expone su API pública en `index.ts`.

**Reglas de imports:**

- Dentro de la misma feature: imports relativos (`./`, `../`).
- Entre features: `@/features/<feature>`.
- Infraestructura compartida: `@/shared`.
- Lógica de dominio: `@repo/domain`.

`shared/` no importa de ninguna feature.

### Gestión de Estado

El proyecto utiliza **React Context API** para manejar el estado global:

- **`KanbanContext`** (`features/board/context/`) — Estado principal del tablero. Contiene las columnas, tareas y todas las acciones CRUD (`createNewColumn`, `updateColumn`, `deleteColumn`, `createNewTask`, `updateTask`, `deleteTask`). Se mantiene unificado porque columnas y tareas forman un bounded context (eliminar una columna cascadea sus tareas).

- **`SearchContext`** (`shared/context/`) — Contexto cross-cutting para la funcionalidad de filtrado. Almacena el valor del input de búsqueda y lo comparte entre el `Header` y el `KanbanBoard` para filtrar tareas en tiempo real.

### Validación

Se utiliza **Zod** para definir esquemas de validación integrados con **React Hook Form**, co-localizados con cada feature:

- `features/task/schemas/task.schema.ts` — Contenido (mín. 5 caracteres), prioridad (`P0`, `P1`, `P2`) y tamaño (`XS`, `S`, `M`, `L`, `XL`).
- `features/column/schemas/column.schema.ts` — Título no vacío con mínimo de 5 caracteres.

### Drag & Drop

Implementado con **pragmatic-drag-and-drop**, que usa el arrastre nativo del navegador:

- **Nada se mueve durante el arrastre.** Solo se muestra dónde caerá el elemento, y el estado se actualiza una única vez al soltar.
- Las tarjetas (`features/task/hooks/useTaskDrag.ts`) y las columnas (`ColumnContainer`) se registran con **ref callbacks**, de modo que el registro sigue al ciclo de vida del elemento.
- `KanbanBoard` escucha el soltado con un monitor global y aplica el cambio.
- La lógica de reordenación es pura y está cubierta por tests: `features/board/lib/reorder.ts`.
- Los datos que viajan con cada arrastre se validan con las guardas de `features/board/lib/dragData.ts`.

## Funcionalidades

### Gestión de Columnas

- Crear columnas con título personalizado o auto-generado.
- Editar el título de columnas existentes de forma inline.
- Eliminar columnas (solo si no contienen tareas).
- Máximo de **6 columnas** simultáneas.
- Columnas iniciales por defecto: Backlog, Ready, In Progress, In Review, Done.

### Gestión de Tareas

- Crear tareas con contenido, prioridad, tamaño, fecha de vencimiento y asignado.
- Editar tareas existentes desde un panel lateral.
- Ver detalles de una tarea en modo solo lectura.
- Eliminar tareas con diálogo de confirmación.

### Prioridad y Tamaño

Cada tarea tiene dos propiedades clasificatorias:

- **Prioridad:** `P0` (crítica), `P1` (alta), `P2` (normal)
- **Tamaño:** `XS`, `S`, `M`, `L`, `XL`

### Drag & Drop

- Reordenar tareas dentro de una columna, soltándolas encima o debajo de otra tarjeta.
- Mover tareas entre columnas; al soltarlas fuera de cualquier tarjeta, van al final.
- Reordenar columnas arrastrándolas por la cabecera, con vista previa propia y un indicador en el hueco de destino.
- Desplazamiento automático al acercarse al borde de una columna larga.
- El orden se persiste en la base de datos al soltar.

### Búsqueda y Filtrado

- Búsqueda en tiempo real por contenido de tarea.
- Las columnas sin coincidencias se atenúan visualmente.
- Las columnas con coincidencias se resaltan con un borde.
- Estado vacío con ilustración cuando no hay resultados.
- Creación de tareas deshabilitada durante la búsqueda.

## Contribución

1. Haz fork del repositorio.
2. Crea una rama con el formato `tipo/descripcion-en-kebab`:

```bash
git switch -c feat/nueva-funcionalidad
```

3. Realiza tus cambios y haz commit siguiendo [Conventional Commits](https://www.conventionalcommits.org/) en español:

```bash
git commit -m "feat(tablero): descripción del cambio"
```

El hook de pre-commit ejecuta ESLint y Prettier sobre los ficheros modificados y lanza los tests.

4. Sube tu rama:

```bash
git push origin feat/nueva-funcionalidad
```

5. Abre un Pull Request siguiendo el template del repositorio.

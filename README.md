# Kanban Dashboard

Aplicación web de tablero Kanban interactivo construida con React, TypeScript y Tailwind CSS. Permite gestionar tareas organizadas en columnas con soporte completo de drag & drop, búsqueda en tiempo real y validación de formularios.

## Tabla de Contenidos

- [Acerca del Proyecto](#acerca-del-proyecto)
- [Tecnologías](#tecnologías)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Scripts Disponibles](#scripts-disponibles)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Arquitectura](#arquitectura)
- [Funcionalidades](#funcionalidades)
- [Contribución](#contribución)

## Acerca del Proyecto

Kanban Dashboard es una herramienta de gestión visual de tareas que implementa la metodología Kanban. Permite a los usuarios crear columnas personalizadas, agregar tareas con prioridades y tamaños, y reorganizar el tablero mediante arrastrar y soltar.

El proyecto está diseñado como una SPA (Single Page Application) con enfoque en la experiencia de usuario, ofreciendo interacciones fluidas, validaciones en tiempo real y una interfaz responsiva.

## Tecnologías

### Core

| Tecnología | Versión | Descripción |
|---|---|---|
| [React](https://react.dev/) | 19 | Biblioteca de UI |
| [TypeScript](https://www.typescriptlang.org/) | 5.9 | Tipado estático |
| [Vite](https://vite.dev/) | 7 | Build tool y dev server |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Framework de estilos utility-first |

### UI y Componentes

| Tecnología | Descripción |
|---|---|
| [shadcn/ui](https://ui.shadcn.com/) | Componentes reutilizables basados en Radix UI |
| [Radix UI](https://www.radix-ui.com/) | Primitivas de UI accesibles (Dialog, Select, Tooltip, etc.) |
| [Lucide React](https://lucide.dev/) | Iconos SVG |
| [Tabler Icons](https://tabler.io/icons) | Iconos adicionales |
| [Class Variance Authority](https://cva.style/) | Variantes de componentes |

### Drag & Drop

| Tecnología | Descripción |
|---|---|
| [@dnd-kit/core](https://dndkit.com/) | Motor de drag & drop |
| [@dnd-kit/sortable](https://dndkit.com/) | Extensión para ordenamiento |

### Formularios y Validación

| Tecnología | Descripción |
|---|---|
| [React Hook Form](https://react-hook-form.com/) | Gestión de formularios |
| [Zod](https://zod.dev/) | Validación de esquemas y tipos |
| [@hookform/resolvers](https://github.com/react-hook-form/resolvers) | Integración Zod + React Hook Form |

### Routing

| Tecnología | Descripción |
|---|---|
| [React Router](https://reactrouter.com/) v7 | Enrutamiento del lado del cliente |

## Requisitos Previos

- [Node.js](https://nodejs.org/) (v18 o superior)
- [npm](https://www.npmjs.com/) (incluido con Node.js)

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/Dayron-Glez/kanban-dashboard.git
```

2. Navega al directorio del proyecto:

```bash
cd kanban-dashboard
```

3. Instala las dependencias:

```bash
npm install
```

4. Inicia el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

## Scripts Disponibles

| Script | Comando | Descripción |
|---|---|---|
| `dev` | `npm run dev` | Inicia el servidor de desarrollo con HMR |
| `build` | `npm run build` | Compila TypeScript y genera el build de producción |
| `lint` | `npm run lint` | Ejecuta ESLint para análisis estático del código |
| `preview` | `npm run preview` | Previsualiza el build de producción localmente |

## Estructura del Proyecto

El proyecto sigue una **Screaming Architecture** organizada por dominios/features. La estructura de carpetas comunica inmediatamente de qué trata la aplicación.

```
kanban-dashboard/
├── public/                              # Activos estáticos
├── src/
│   ├── features/                        # Dominios de la aplicación
│   │   ├── board/                       # Feature: Tablero Kanban
│   │   │   ├── components/
│   │   │   │   └── KanbanBoard.tsx      # Orquestación del tablero con drag & drop
│   │   │   ├── context/
│   │   │   │   └── KanbanContext.tsx     # Estado global (columnas + tareas + CRUD)
│   │   │   ├── hooks/
│   │   │   │   └── useKanban.ts         # Hook para consumir el contexto
│   │   │   ├── types/
│   │   │   │   └── board.types.ts       # Tipos del dominio (Task, ColumnType, enums)
│   │   │   └── index.ts                 # API pública del feature
│   │   │
│   │   ├── column/                      # Feature: Columnas
│   │   │   ├── components/
│   │   │   │   ├── ColumnContainer.tsx   # Contenedor de columna con drag & drop
│   │   │   │   ├── CreateColumnSheet.tsx # Panel lateral para crear columna
│   │   │   │   └── EditableColumnTitle/  # Edición inline del título
│   │   │   ├── schemas/
│   │   │   │   └── column.schema.ts     # Validación Zod para columnas
│   │   │   └── index.ts
│   │   │
│   │   └── task/                        # Feature: Tareas
│   │       ├── components/
│   │       │   ├── TaskCard.tsx          # Tarjeta de tarea con menú de acciones
│   │       │   ├── CreateTaskSheet.tsx   # Panel lateral para crear tarea
│   │       │   ├── EditTaskSheet.tsx     # Panel lateral para editar tarea
│   │       │   ├── DetailsTaskSheet.tsx  # Panel lateral de detalles (solo lectura)
│   │       │   └── TaskForm/            # Formulario reutilizable de tarea
│   │       │       ├── TaskForm.tsx
│   │       │       ├── ContentTextArea.tsx
│   │       │       ├── PrioritySelect.tsx
│   │       │       └── SizeSelect.tsx
│   │       ├── schemas/
│   │       │   └── task.schema.ts       # Validación Zod para tareas
│   │       └── index.ts
│   │
│   ├── shared/                          # Infraestructura compartida
│   │   ├── components/
│   │   │   ├── ui/                      # Componentes shadcn/ui (Button, Card, Input, etc.)
│   │   │   ├── Header.tsx               # Barra superior (título, búsqueda, agregar columna)
│   │   │   ├── SearchInput.tsx          # Input de búsqueda con filtrado
│   │   │   └── Sidebar/
│   │   │       └── SideBarContent.tsx   # Contenido de la barra lateral
│   │   ├── context/
│   │   │   └── SearchContext.tsx         # Contexto de búsqueda (cross-cutting)
│   │   ├── hooks/
│   │   │   └── use-mobile.ts            # Hook para detectar dispositivos móviles
│   │   ├── lib/
│   │   │   └── utils.ts                 # Utilidad cn() para clases CSS
│   │   └── index.ts                     # API pública de shared
│   │
│   ├── layouts/
│   │   └── MainLayout.tsx               # Layout principal (sidebar + contenido)
│   ├── assets/                          # SVGs e imágenes
│   ├── App.tsx                          # Configuración de rutas
│   └── main.tsx                         # Punto de entrada de la aplicación
│
├── tailwind.css                         # Variables CSS y tema personalizado
├── tailwind.config.js                   # Configuración de Tailwind (colores, animaciones)
├── vite.config.ts                       # Configuración de Vite (alias @, plugins)
├── tsconfig.json                        # Configuración base de TypeScript
├── tsconfig.app.json                    # Configuración TS para la aplicación
├── eslint.config.js                     # Configuración de ESLint
├── components.json                      # Configuración de shadcn/ui
└── package.json
```

## Arquitectura

### Screaming Architecture

El proyecto sigue una **Screaming Architecture** donde la estructura de carpetas comunica el dominio de la aplicación. Cada feature es autocontenida con sus propios componentes, hooks, tipos y esquemas de validación.

**Jerarquía de dependencias:**

```
shared ← board ← { column, task }
```

- `shared/` no importa de ninguna feature.
- `board/` importa de `column/` y `task/` para orquestar el tablero.
- `column/` y `task/` importan de `board/` (tipos) y `shared/` (UI), pero no entre sí directamente.

**Reglas de imports:**

- Dentro de la misma feature: imports relativos (`./`, `../`)
- Entre features: `@/features/board`, `@/features/column`, `@/features/task`
- Infraestructura compartida: `@/shared`

### Gestión de Estado

El proyecto utiliza **React Context API** para manejar el estado global:

- **`KanbanContext`** (`features/board/context/`) — Estado principal del tablero. Contiene las columnas, tareas y todas las acciones CRUD (`createNewColumn`, `updateColumn`, `deleteColumn`, `createNewTask`, `updateTask`, `deleteTask`). Se mantiene unificado porque columnas y tareas forman un bounded context (eliminar una columna cascadea sus tareas).

- **`SearchContext`** (`shared/context/`) — Contexto cross-cutting para la funcionalidad de filtrado. Almacena el valor del input de búsqueda y lo comparte entre el `Header` y el `KanbanBoard` para filtrar tareas en tiempo real.

### Patrones de Componentes

Los componentes se organizan por dominio dentro de cada feature:

- **Board** (`features/board/`) — Orquestación del tablero con drag & drop.
- **Column** (`features/column/`) — Contenedor de columna, creacion y edicion inline del titulo.
- **Task** (`features/task/`) — Tarjeta de tarea, paneles laterales CRUD y formulario reutilizable.
- **Shared** (`shared/components/`) — Header, SearchInput, Sidebar y componentes shadcn/ui.

### Validación

Se utiliza **Zod** para definir esquemas de validación integrados con **React Hook Form**, co-localizados con cada feature:

- `features/task/schemas/task.schema.ts` — Contenido (min. 5 caracteres), prioridad (`P0`, `P1`, `P2`) y tamano (`XS`, `S`, `M`, `L`, `XL`).
- `features/column/schemas/column.schema.ts` — Titulo no vacio con minimo de 5 caracteres.

### Drag & Drop

Implementado con **@dnd-kit** en `features/board/components/KanbanBoard.tsx`:

- Reordenar columnas horizontalmente.
- Mover tareas entre columnas.
- Los eventos `onDragStart`, `onDragOver` y `onDragEnd` actualizan el estado global del contexto.

## Funcionalidades

### Gestión de Columnas

- Crear columnas con título personalizado o auto-generado.
- Editar el título de columnas existentes de forma inline.
- Eliminar columnas (solo si no contienen tareas).
- Máximo de **6 columnas** simultáneas.
- Columnas iniciales por defecto: Backlog, Ready, In Progress, In Review, Done.

### Gestión de Tareas

- Crear tareas con contenido, prioridad y tamaño.
- Editar tareas existentes desde un panel lateral.
- Ver detalles de una tarea en modo solo lectura.
- Eliminar tareas con diálogo de confirmación.

### Prioridad y Tamaño

Cada tarea tiene dos propiedades clasificatorias:

- **Prioridad:** `P0` (crítica), `P1` (alta), `P2` (normal)
- **Tamaño:** `XS`, `S`, `M`, `L`, `XL`

### Drag & Drop

- Arrastrar columnas para reordenarlas.
- Arrastrar tareas entre columnas para moverlas.
- Scroll automático al crear nuevas columnas.

### Búsqueda y Filtrado

- Búsqueda en tiempo real por contenido de tarea.
- Las columnas sin coincidencias se atenúan visualmente.
- Las columnas con coincidencias se resaltan con un borde.
- Estado vacío con ilustración cuando no hay resultados.
- Creación de tareas deshabilitada durante la búsqueda.

## Contribución

1. Haz fork del repositorio.
2. Crea una rama para tu feature:

```bash
git checkout -b feature/nueva-funcionalidad
```

3. Realiza tus cambios y haz commit:

```bash
git commit -m "feat: descripción del cambio"
```

4. Sube tu rama:

```bash
git push origin feature/nueva-funcionalidad
```

5. Abre un Pull Request siguiendo el template del repositorio.

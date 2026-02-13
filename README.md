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

```
kanban-dashboard/
├── public/                          # Activos estáticos
├── src/
│   ├── assets/                      # SVGs e imágenes
│   │   ├── noData.svg               # Estado vacío del tablero
│   │   ├── notFindByFilter.svg      # Sin resultados de búsqueda
│   │   ├── soon.svg                 # Página en construcción
│   │   └── ...
│   ├── components/
│   │   ├── Header.tsx               # Barra superior (título, búsqueda, agregar columna)
│   │   ├── KanbanBoard.tsx          # Tablero principal con drag & drop
│   │   ├── ColumnContainer.tsx      # Contenedor de columna individual
│   │   ├── TaskCard.tsx             # Tarjeta de tarea con menú de acciones
│   │   ├── SearchInput.tsx          # Input de búsqueda con filtrado
│   │   ├── SideBar/
│   │   │   └── SideBarContent.tsx   # Contenido de la barra lateral
│   │   ├── Sheet/
│   │   │   ├── Column/
│   │   │   │   ├── CreateColumnSheet.tsx
│   │   │   │   └── Form/            # Formularios de columna
│   │   │   └── Task/
│   │   │       ├── CreateTaskSheet.tsx
│   │   │       ├── EditTaskSheet.tsx
│   │   │       ├── DetailsTaskSheet.tsx
│   │   │       └── Form/            # Formularios de tarea (TaskForm, validación)
│   │   └── ui/                      # Componentes shadcn/ui (Button, Card, Input, etc.)
│   ├── context/
│   │   └── KanbanContext.tsx         # Estado global del tablero (columnas, tareas, acciones)
│   ├── hooks/
│   │   └── use-mobile.ts            # Hook para detectar dispositivos móviles
│   ├── layouts/
│   │   └── MainLayout.tsx           # Layout principal (sidebar + contenido + SearchContext)
│   ├── lib/
│   │   └── utils.ts                 # Utilidad cn() para clases CSS
│   ├── App.tsx                      # Configuración de rutas
│   ├── index.ts                     # Barrel exports
│   ├── main.tsx                     # Punto de entrada de la aplicación
│   └── types.ts                     # Tipos e interfaces (Task, ColumnType, enums)
├── tailwind.css                     # Variables CSS y tema personalizado
├── tailwind.config.js               # Configuración de Tailwind (colores, animaciones)
├── vite.config.ts                   # Configuración de Vite (alias @, plugins)
├── tsconfig.json                    # Configuración base de TypeScript
├── tsconfig.app.json                # Configuración TS para la aplicación
├── eslint.config.js                 # Configuración de ESLint
├── components.json                  # Configuración de shadcn/ui
└── package.json
```

## Arquitectura

### Gestión de Estado

El proyecto utiliza **React Context API** para manejar el estado global:

- **`KanbanContext`** — Estado principal del tablero. Contiene las columnas, tareas y todas las acciones CRUD (`createNewColumn`, `updateColumn`, `deleteColumn`, `createNewTask`, `updateTask`, `deleteTask`). También expone `setColumns` y `setTasks` para las operaciones de drag & drop.

- **`SearchContext`** — Estado de búsqueda gestionado en `MainLayout`. Almacena el valor del input de búsqueda y lo comparte entre el `Header` y el `KanbanBoard` para filtrar tareas en tiempo real.

### Patrones de Componentes

Los componentes están organizados por responsabilidad:

- **Layout** (`MainLayout`) — Estructura general con sidebar, header y outlet de rutas.
- **Core** (`KanbanBoard`, `ColumnContainer`, `TaskCard`) — Lógica principal del tablero Kanban.
- **Sheets** (`CreateTaskSheet`, `EditTaskSheet`, etc.) — Paneles laterales para formularios CRUD.
- **Forms** (`TaskForm`, `Title`, `Priority`, `Size`) — Campos de formulario reutilizables con validación Zod.
- **UI** (`button`, `card`, `input`, etc.) — Componentes base de shadcn/ui.

### Validación

Se utiliza **Zod** para definir esquemas de validación integrados con **React Hook Form**:

- Las tareas requieren: contenido (mín. 5 caracteres), prioridad (`P0`, `P1`, `P2`) y tamaño (`XS`, `S`, `M`, `L`, `XL`).
- Las columnas requieren un título no vacío.

### Drag & Drop

Implementado con **@dnd-kit**, el sistema permite:

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

# API de Cauce

NestJS 12 con Drizzle sobre Postgres. La base es un Postgres 17 creado con las migraciones de Drizzle: en Docker en local, como servicio en CI y en [Neon](https://neon.com) en producción.

## Desarrollo local

```bash
pnpm db:start              # Postgres local en Docker, con las migraciones aplicadas
cp apps/api/.env.example apps/api/.env
pnpm --filter api dev      # http://localhost:3000/health
```

`pnpm dev` en la raíz arranca la web y la API a la vez.

| Script                              | Qué hace                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter api dev`             | Arranca con recarga al guardar                                                                                         |
| `pnpm --filter api test`            | Tests con Vitest                                                                                                       |
| `pnpm test:int`                     | Tests de integración contra la base local (`pnpm db:start` antes). Se niegan a correr contra una base que no sea local |
| `pnpm --filter api build`           | Compila a `dist/`                                                                                                      |
| `pnpm --filter api db:migrate`      | Aplica las migraciones pendientes a la base de `DATABASE_URL`                                                          |
| `pnpm --filter api db:migrate:prod` | Aplica las migraciones pendientes a producción (ver «Migrar producción»)                                               |

### Convenciones

- **Inyección siempre con token explícito**: `@Inject(DB)`, nunca por el tipo del parámetro. Los tests corren con esbuild, que no emite los metadatos de los decoradores, y así un `@Inject` olvidado falla en los tests y no solo en producción.
- **Todas las rutas van bajo `/api`** (`/api/projects`…), salvo `/health`, que es la que comprueba Railway. La web nunca llama a Railway directamente: en producción Vercel reenvía `/api/*` a la API y en local lo hace el proxy de Vite. Así la web y la API comparten dominio, y la cookie de sesión de better-auth es de primera parte.
- **Solo se llega a la API a través de Vercel.** Vercel añade a cada petición `/api/*` la cabecera `x-cauce-proxy-secret` con el valor de su variable `PROXY_SECRET` (`vercel.json`), y la API responde 403 a lo que no la trae (`src/proxy-secret.ts`), salvo `/health`. Quien llame directamente a la URL de Railway no obtiene nada. En producción la variable es obligatoria; en local y en los tests no hay secreto y el filtro queda desactivado. Para cambiar el secreto, ponlo a la vez en Railway y en Vercel y redespliega los dos.
- **Todas las rutas exigen sesión** por defecto (`AuthGuard` global). Una ruta pública se marca con `@Public()`, como `/health`. El usuario de la sesión se lee con `@CurrentUser()`.
- **Login con better-auth** (`src/auth/better-auth.ts`): sus rutas (`/api/auth/*`) se montan en Express antes del lector de JSON, por eso la app se crea con `bodyParser: false` (`configure-app.ts`). La sesión va en una cookie; el `AuthGuard` la resuelve con `auth.api.getSession`. Los usuarios viven en el esquema `identity`, cuyas tablas se describen en `src/db/schema/identity.ts` (con fechas `Date`, no texto). Las contraseñas se guardan en scrypt, el formato de better-auth, con un mínimo de 8 caracteres.
- **La IP del usuario** la usa better-auth para el límite de intentos y la guarda en cada sesión. Detrás de Vercel y Railway, `x-forwarded-for` trae varias IP y better-auth solo acepta una, así que `resolveClientIp` (`src/auth/client-ip.ts`) pasa la primera, la del usuario, en `x-cauce-client-ip`. Es fiable porque solo se llega a la API a través de Vercel, que sobrescribe `x-forwarded-for` y no deja que el usuario la falsee.
- **La autorización es de la API, no de la base**: la base no tiene RLS, así que cada servicio comprueba el acceso con `ProjectAccess` (`requireMember`, `requireOwner`). A quien no es miembro se le responde 404, para no confirmarle que el proyecto existe. Toda ruta nueva de un proyecto necesita su test de «usuario ajeno» en un `*.int.spec.ts`.
- **Los cuerpos se validan con los esquemas de `@repo/contracts`**: `@Body({ schema })`, con el `StandardSchemaValidationPipe` global. Las respuestas salen ya con la forma del contrato.
- **ESM**: los imports relativos llevan la extensión `.js`.
- **El esquema de Drizzle se mantiene a mano** en `src/db/schema/`, un fichero por módulo, y es el dueño de las migraciones: `drizzle-kit generate` las escribe en `drizzle/` (ver «Cambiar el esquema» en el README raíz). Sin políticas RLS ni funciones de la base: la autorización vive en los servicios.
- **Las migraciones nunca se aplican al arrancar la API**: se aplican a mano con `db:migrate`, y no van en la imagen de Docker. En producción se aplican con `db:migrate:prod` antes de mergear el código que las necesita (ver «Migrar producción»).

## Despliegue en Railway

La configuración vive en el panel de Railway. Su fichero `railway.json` está obsoleto (deja de funcionar el 1 de diciembre de 2026) y el SDK que lo sustituye no se aplica al desplegar, así que para un solo servicio no compensa.

### Puesta en marcha (una vez)

1. Crea la cuenta en [railway.com](https://railway.com) con GitHub y activa el plan Hobby.
2. **New Project → Deploy from GitHub repo** y elige `kanban-dashboard`. Railway pedirá permiso para leer el repositorio.
3. En el servicio, **Settings**:

   | Campo                        | Valor                                                                          |
   | ---------------------------- | ------------------------------------------------------------------------------ |
   | Root Directory               | vacío: la raíz del repo, que es el contexto del `Dockerfile`                   |
   | Build Command, Start Command | vacíos: los pone `apps/api/Dockerfile`                                         |
   | Watch Paths                  | `apps/api/**`, `packages/contracts/**`, `packages/domain/**`, `pnpm-lock.yaml` |
   | Healthcheck Path             | `/health`                                                                      |
   | Region                       | la más cercana a la base de datos (EU West, con Neon en Frankfurt)             |

4. En **Variables**:

   | Variable                  | Valor                                                                                           |
   | ------------------------- | ----------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`            | Neon → **Connect**, con **Connection pooling** activado (el host lleva `-pooler`)               |
   | `BETTER_AUTH_URL`         | la URL de la **web** en Vercel, sin barra final (la API se sirve bajo su `/api`)                |
   | `BETTER_AUTH_SECRET`      | `openssl rand -base64 32`. Cambiarlo cierra todas las sesiones                                  |
   | `GOOGLE_CLIENT_ID`        | Google Cloud → Credenciales → cliente OAuth. Opcional: sin él no se ofrece Google               |
   | `GOOGLE_CLIENT_SECRET`    | el secreto de ese cliente                                                                       |
   | `NODE_ENV`                | `production`                                                                                    |
   | `PROXY_SECRET`            | `openssl rand -base64 32`. El mismo valor que la variable `PROXY_SECRET` de Vercel (Production) |
   | `RAILWAY_DOCKERFILE_PATH` | `apps/api/Dockerfile`: no está en la raíz, así que Railway no lo encuentra solo                 |

   En el cliente OAuth de Google, la URI de redirección autorizada es `BETTER_AUTH_URL` + `/api/auth/callback/google`.

`PORT` lo pone Railway. La imagen solo lleva la API y sus dependencias de producción, y la instalación sale de la caché mientras no cambie el lockfile.

5. **Settings → Networking → Generate Domain**, y comprueba que `https://<dominio>/health` responde `{"status":"ok","database":"ok"}`.
6. En la configuración de uso del workspace, fija un **límite de gasto** para que un error no dispare la factura.

### Qué pasa en cada despliegue

Railway despliega cada push a `master` que toque los Watch Paths. Antes de poner la versión nueva en servicio llama a `/health`; si la base no responde, devuelve 503 y la versión anterior sigue atendiendo.

## Migrar producción

`pnpm --filter api db:migrate:prod` aplica las migraciones pendientes a Neon. Lee la cadena de `apps/api/.env.production.local`, que git ignora y solo contiene una línea:

```
DATABASE_URL=<cadena de Neon>
```

Es la cadena **directa**: Neon → Connect con **Connection pooling** desactivado (sin `-pooler` en el host) y sin `&channel_binding=require` al final, que postgres-js no entiende. Si el fichero no existe, el script falla sin tocar nada.

Se lanza antes de mergear el PR que trae la migración: la base nueva convive unos minutos con el código anterior, así que la migración tiene que ser compatible con él (añadir sí; borrar o renombrar, en un PR posterior).

## Cambiar de base de datos

Así se pasó de Supabase a Neon, y sirve para cualquier otro cambio de host. Los dos scripts leen `SOURCE_DATABASE_URL` (la base actual) y `TARGET_DATABASE_URL` (la nueva) de `apps/api/.env.traslado.local`, que git ignora: las contraseñas no pasan por la terminal. Ese fichero solo hace falta durante el traslado.

| Script                         | Qué hace                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter api db:compare` | Compara el esquema de `public` e `identity` y las filas de cada tabla. Solo lectura                                                                           |
| `pnpm --filter api db:copy`    | Copia las tablas en una transacción: todo o nada. Se niega si el destino tiene filas o tablas que no conoce. Al añadir una tabla, hay que añadirla a su lista |

1. Crea las tablas en la base nueva: `db:migrate` con `DATABASE_URL` = la cadena directa de la nueva.
2. `db:compare`: el esquema debe salir idéntico y el destino, vacío.
3. En un momento sin actividad: `db:copy` y `db:compare`, que ya debe decir «Las dos bases coinciden».
4. En Railway, cambia `DATABASE_URL` por la cadena con pooler de la base nueva, y comprueba la web cuando termine el despliegue.
5. `db:compare` otra vez: si algo entró en la base antigua entre la copia y el cambio, saldrá aquí.

Para volver atrás, basta con devolver `DATABASE_URL` a la base antigua, que la copia no toca.

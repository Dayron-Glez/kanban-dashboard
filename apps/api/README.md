# API de Cauce

NestJS 12 con Drizzle sobre Postgres. Mientras dure la migración, la base es la de Supabase y la API la usa como un Postgres más; el paso a Neon es el sub-PR 4.3 (ver `docs/modelo/`).

## Desarrollo local

```bash
pnpm db:start              # Postgres local de Supabase, en Docker
cp apps/api/.env.example apps/api/.env
pnpm --filter api dev      # http://localhost:3000/health
```

`pnpm dev` en la raíz arranca la web y la API a la vez.

| Script                    | Qué hace                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter api dev`   | Arranca con recarga al guardar                                                                                         |
| `pnpm --filter api test`  | Tests con Vitest                                                                                                       |
| `pnpm test:int`           | Tests de integración contra la base local (`pnpm db:start` antes). Se niegan a correr contra una base que no sea local |
| `pnpm --filter api build` | Compila a `dist/`                                                                                                      |
| `pnpm db:schema`          | Regenera `src/db/generated` a partir de la base local. Ejecútalo tras cambiar `supabase/migrations`                    |

### Convenciones

- **Inyección siempre con token explícito**: `@Inject(DB)`, nunca por el tipo del parámetro. Los tests corren con esbuild, que no emite los metadatos de los decoradores, y así un `@Inject` olvidado falla en los tests y no solo en producción.
- **Todas las rutas van bajo `/api`** (`/api/projects`…), salvo `/health`, que es la que comprueba Railway. La web nunca llama a Railway directamente: en producción Vercel reenvía `/api/*` a la API y en local lo hace el proxy de Vite. Así la web y la API comparten dominio, y la cookie de sesión de better-auth es de primera parte.
- **Solo se llega a la API a través de Vercel.** Vercel añade a cada petición `/api/*` la cabecera `x-cauce-proxy-secret` con el valor de su variable `PROXY_SECRET` (`vercel.json`), y la API responde 403 a lo que no la trae (`src/proxy-secret.ts`), salvo `/health`. Quien llame directamente a la URL de Railway no obtiene nada. En producción la variable es obligatoria; en local y en los tests no hay secreto y el filtro queda desactivado. Para cambiar el secreto, ponlo a la vez en Railway y en Vercel y redespliega los dos.
- **Todas las rutas exigen sesión** por defecto (`AuthGuard` global). Una ruta pública se marca con `@Public()`, como `/health`. El usuario de la sesión se lee con `@CurrentUser()`.
- **Login con better-auth** (`src/auth/better-auth.ts`): sus rutas (`/api/auth/*`) se montan en Express antes del lector de JSON, por eso la app se crea con `bodyParser: false` (`configure-app.ts`). La sesión va en una cookie; el `AuthGuard` la resuelve con `auth.api.getSession`. Los usuarios viven en el esquema `identity`, cuyas tablas se describen a mano en `src/db/identity.ts` (con fechas `Date`, no texto). Las contraseñas importadas de Supabase Auth están en bcrypt y se comprueban con bcrypt; las nuevas, en scrypt.
- **La IP del usuario** la usa better-auth para el límite de intentos y la guarda en cada sesión. Detrás de Vercel y Railway, `x-forwarded-for` trae varias IP y better-auth solo acepta una, así que `resolveClientIp` (`src/auth/client-ip.ts`) pasa la primera, la del usuario, en `x-cauce-client-ip`. Es fiable porque solo se llega a la API a través de Vercel, que sobrescribe `x-forwarded-for` y no deja que el usuario la falsee.
- **La autorización es de la API, no de la base**: la API se conecta con un rol que se salta la RLS, así que cada servicio comprueba el acceso con `ProjectAccess` (`requireMember`, `requireOwner`). A quien no es miembro se le responde 404, para no confirmarle que el proyecto existe. Toda ruta nueva de un proyecto necesita su test de «usuario ajeno» en un `*.int.spec.ts`.
- **Los cuerpos se validan con los esquemas de `@repo/contracts`**: `@Body({ schema })`, con el `StandardSchemaValidationPipe` global. Las respuestas salen ya con la forma del contrato.
- **ESM**: los imports relativos llevan la extensión `.js`.
- **El esquema de `src/db/generated` no se edita a mano**: lo escribe `pnpm db:schema`. Las migraciones siguen en `supabase/migrations` hasta el paso a Neon.

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
   | Region                       | la misma que la base de datos                                                  |

4. En **Variables**:

   | Variable                  | Valor                                                                                           |
   | ------------------------- | ----------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`            | Supabase → **Connect → Transaction pooler** (puerto 6543), con la contraseña de la base         |
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

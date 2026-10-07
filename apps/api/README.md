# API de Cauce

NestJS 12 con Drizzle sobre Postgres. Mientras dure la migración, la base es la de Supabase y la API la usa como un Postgres más; el paso a Neon es el sub-PR 4.3 (ver `docs/modelo/`).

## Desarrollo local

```bash
pnpm db:start              # Postgres local de Supabase, en Docker
cp apps/api/.env.example apps/api/.env
pnpm --filter api dev      # http://localhost:3000/health
```

`pnpm dev` en la raíz arranca la web y la API a la vez.

| Script                    | Qué hace                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm --filter api dev`   | Arranca con recarga al guardar                                                                                                 |
| `pnpm --filter api test`  | Tests con Vitest                                                                                                               |
| `pnpm test:int`           | Tests de integración contra la base local (`pnpm db:start` antes). Se niegan a correr contra una base que no sea local         |
| `pnpm --filter api build` | Compila a `dist/`                                                                                                              |
| `pnpm db:schema`          | Regenera `src/db/generated` a partir de la base local. Ejecútalo tras cambiar `supabase/migrations`, igual que `pnpm db:types` |

### Convenciones

- **Inyección siempre con token explícito**: `@Inject(DB)`, nunca por el tipo del parámetro. Los tests corren con esbuild, que no emite los metadatos de los decoradores, y así un `@Inject` olvidado falla en los tests y no solo en producción.
- **Todas las rutas exigen sesión** por defecto (`AuthGuard` global). Una ruta pública se marca con `@Public()`, como `/health`. El usuario de la sesión se lee con `@CurrentUser()`.
- **Autenticación puente**: hasta better-auth (sub-PR 4.2), la API acepta los tokens de Supabase Auth. Los verifica con las claves públicas del proyecto (`SUPABASE_URL/auth/v1/.well-known/jwks.json`), sin ningún secreto.
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

   | Campo            | Valor                                                                          |
   | ---------------- | ------------------------------------------------------------------------------ |
   | Root Directory   | vacío: la raíz del repo, para que pnpm vea el workspace entero                 |
   | Build Command    | `pnpm turbo build --filter=api`                                                |
   | Start Command    | `node apps/api/dist/main.js`                                                   |
   | Watch Paths      | `apps/api/**`, `packages/contracts/**`, `packages/domain/**`, `pnpm-lock.yaml` |
   | Healthcheck Path | `/health`                                                                      |
   | Region           | la misma que el proyecto de Supabase                                           |

4. En **Variables**:

   | Variable       | Valor                                                                                   |
   | -------------- | --------------------------------------------------------------------------------------- |
   | `DATABASE_URL` | Supabase → **Connect → Transaction pooler** (puerto 6543), con la contraseña de la base |

| `SUPABASE_URL` | `https://<ref>.supabase.co`, sin barra final. Es pública |
| `CORS_ORIGINS` | la URL de la web en Vercel; varias, separadas por comas |
| `NODE_ENV` | `production` |

`PORT` lo pone Railway.

5. **Settings → Networking → Generate Domain**, y comprueba que `https://<dominio>/health` responde `{"status":"ok","database":"ok"}`.
6. En la configuración de uso del workspace, fija un **límite de gasto** para que un error no dispare la factura.

### Qué pasa en cada despliegue

Railway despliega cada push a `master` que toque los Watch Paths. Antes de poner la versión nueva en servicio llama a `/health`; si la base no responde, devuelve 503 y la versión anterior sigue atendiendo.

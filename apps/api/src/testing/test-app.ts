import { randomUUID } from "node:crypto"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { Test } from "@nestjs/testing"
import postgres from "postgres"
import request from "supertest"
import { AppModule } from "../app.module.js"
import { SESSION_RESOLVER, type AuthUser, type SessionResolver } from "../auth/session.js"
import { API_PREFIX, configureApp } from "../configure-app.js"

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"])

export interface TestUser extends AuthUser {
  /** Lo que se manda en x-test-user: el resolvedor falso lo traduce al usuario. */
  token: string
}

interface TestAppOptions {
  /**
   * Con true (por defecto) la sesión se resuelve con una cabecera de pruebas:
   * aquí se prueba la autorización, no el login. auth.int.spec.ts usa la
   * sesión real de better-auth.
   */
  fakeSessions?: boolean
}

// Arranca la API entera contra la base local.
export const createTestApp = async ({ fakeSessions = true }: TestAppOptions = {}) => {
  const url = process.env.DATABASE_URL ?? ""
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) {
    throw new Error(`Los tests de integración solo corren contra una base local, no ${url}`)
  }

  const sql = postgres(url, { max: 1 })
  const users = new Map<string, TestUser>()
  const resolveSession: SessionResolver = (headers) => {
    const token = headers["x-test-user"]
    return Promise.resolve((typeof token === "string" && users.get(token)) || null)
  }

  const builder = Test.createTestingModule({ imports: [AppModule] })
  if (fakeSessions) builder.overrideProvider(SESSION_RESOLVER).useValue(resolveSession)
  const moduleRef = await builder.compile()
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false })
  configureApp(app)
  await app.init()

  // Como al registrarse: el usuario y su perfil.
  const createUser = async (name: string): Promise<TestUser> => {
    const id = randomUUID()
    const email = `${name}-${id.slice(0, 8)}@int.test`
    await sql`insert into identity.users (id, name, email) values (${id}, ${name}, ${email})`
    await sql`insert into public.profiles (id, full_name, email) values (${id}, ${name}, ${email})`
    const user = { id, email, token: `token-${id}` }
    users.set(user.token, user)
    return user
  }

  // Borrar al usuario arrastra en cascada su perfil, sus membresías y sus
  // proyectos. Los creados por better-auth en los tests llevan @int.test.
  const close = async () => {
    await sql`delete from identity.users where email like '%@int.test'`
    await app.close()
    await sql.end()
  }

  // Peticiones con la sesión de `user`, a rutas sin el prefijo /api.
  const as = (user: TestUser) => {
    const server = app.getHttpServer()
    const auth = { "x-test-user": user.token }
    const url = (path: string) => `${API_PREFIX}${path}`
    return {
      get: (path: string) => request(server).get(url(path)).set(auth),
      post: (path: string, body?: object) => request(server).post(url(path)).set(auth).send(body),
      patch: (path: string, body: object) => request(server).patch(url(path)).set(auth).send(body),
      put: (path: string, body: object) => request(server).put(url(path)).set(auth).send(body),
      delete: (path: string) => request(server).delete(url(path)).set(auth),
    }
  }

  return { app, sql, createUser, as, close }
}

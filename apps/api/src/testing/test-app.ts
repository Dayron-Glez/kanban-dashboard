import { randomUUID } from "node:crypto"
import type { INestApplication } from "@nestjs/common"
import { Test } from "@nestjs/testing"
import postgres from "postgres"
import request from "supertest"
import { AppModule } from "../app.module.js"
import { TOKEN_VERIFIER, type AuthUser, type TokenVerifier } from "../auth/token-verifier.js"

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"])

export interface TestUser extends AuthUser {
  email: string
  /** Lo que se manda en Authorization: el verificador falso lo traduce al usuario. */
  token: string
}

// Arranca la API entera contra la base local. Solo se sustituye la
// verificación del token: aquí se prueba la autorización, no la firma (eso ya
// lo cubre auth.guard.spec.ts).
export const createTestApp = async () => {
  const url = process.env.DATABASE_URL ?? ""
  if (!LOCAL_HOSTS.has(new URL(url).hostname)) {
    throw new Error(`Los tests de integración solo corren contra una base local, no ${url}`)
  }

  const sql = postgres(url, { max: 1 })
  const users = new Map<string, TestUser>()
  const verify: TokenVerifier = (token) => {
    const user = users.get(token)
    return user ? Promise.resolve(user) : Promise.reject(new Error("Token desconocido"))
  }

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verify)
    .compile()
  const app: INestApplication = moduleRef.createNestApplication()
  await app.init()

  // El trigger on_auth_user_created le crea el perfil, como al registrarse.
  const createUser = async (name: string): Promise<TestUser> => {
    const id = randomUUID()
    const email = `${name}-${id.slice(0, 8)}@int.test`
    await sql`insert into auth.users (id, email) values (${id}, ${email})`
    const user = { id, email, token: `token-${id}` }
    users.set(user.token, user)
    return user
  }

  // Borrar al usuario arrastra en cascada su perfil, sus membresías y sus proyectos.
  const close = async () => {
    const ids = [...users.values()].map((user) => user.id)
    if (ids.length > 0) await sql`delete from auth.users where id in ${sql(ids)}`
    await app.close()
    await sql.end()
  }

  // Peticiones con la sesión de `user`.
  const as = (user: TestUser) => {
    const server = app.getHttpServer()
    const auth = { Authorization: `Bearer ${user.token}` }
    return {
      get: (path: string) => request(server).get(path).set(auth),
      post: (path: string, body?: object) => request(server).post(path).set(auth).send(body),
      patch: (path: string, body: object) => request(server).patch(path).set(auth).send(body),
      put: (path: string, body: object) => request(server).put(path).set(auth).send(body),
      delete: (path: string) => request(server).delete(path).set(auth),
    }
  }

  return { app, sql, createUser, as, close }
}

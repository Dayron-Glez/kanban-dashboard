// Ajusta lo que genera drizzle-kit pull contra Supabase. Es idempotente.
//
// 1. Las tablas referencian auth.users, pero pull solo mira el esquema public y
//    deja esa tabla sin declarar. drizzle-orm ya la trae en drizzle-orm/supabase.
// 2. La API es ESM con resolución nodenext: los imports relativos llevan .js.
// 3. Pull escribe también una migración SQL y su historial. Mientras la base
//    siga en Supabase, las migraciones son de supabase/migrations: se borran.
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"

const dir = new URL("../src/db/generated/", import.meta.url)
const SUPABASE_IMPORT = 'from "drizzle-orm/supabase"'

const schemaFile = new URL("schema.ts", dir)
let schema = readFileSync(schemaFile, "utf8")
schema = schema.replaceAll("foreignColumns: [users.id]", "foreignColumns: [authUsers.id]")
if (!schema.includes(SUPABASE_IMPORT)) {
  schema = `import { authUsers } ${SUPABASE_IMPORT}\n${schema}`
}
writeFileSync(schemaFile, schema)

const relationsFile = new URL("relations.ts", dir)
let relations = readFileSync(relationsFile, "utf8")
relations = relations.replace(/import \{([^}]*)\} from "\.\/schema(?:\.js)?"/, (_match, names) => {
  const kept = names
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name && name !== "usersInAuth")
  return `import { ${kept.join(", ")} } from "./schema.js"`
})
if (!relations.includes(SUPABASE_IMPORT)) {
  relations = `import { authUsers as usersInAuth } ${SUPABASE_IMPORT}\n${relations}`
}
writeFileSync(relationsFile, relations)

for (const entry of readdirSync(dir)) {
  if (entry.endsWith(".sql") || entry === "meta") rmSync(new URL(entry, dir), { recursive: true })
}

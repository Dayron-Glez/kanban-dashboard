import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"

const dir = new URL("../src/db/generated/", import.meta.url)
const IDENTITY_IMPORT = 'from "../identity.js"'

const schemaFile = new URL("schema.ts", dir)
let schema = readFileSync(schemaFile, "utf8")
schema = schema.replaceAll("foreignColumns: [users.id]", "foreignColumns: [identityUsers.id]")
if (schema.includes("identityUsers") && !schema.includes(IDENTITY_IMPORT)) {
  schema = `import { users as identityUsers } ${IDENTITY_IMPORT}\n${schema}`
}
writeFileSync(schemaFile, schema)

const relationsFile = new URL("relations.ts", dir)
let relations = readFileSync(relationsFile, "utf8")
relations = relations.replace(/import \{([^}]*)\} from "\.\/schema(?:\.js)?"/, (_match, names) => {
  const kept = names
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name && name !== "usersInIdentity")
  return `import { ${kept.join(", ")} } from "./schema.js"`
})
if (relations.includes("usersInIdentity") && !relations.includes(IDENTITY_IMPORT)) {
  relations = `import { users as usersInIdentity } ${IDENTITY_IMPORT}\n${relations}`
}
writeFileSync(relationsFile, relations)

for (const entry of readdirSync(dir)) {
  if (entry.endsWith(".sql") || entry === "meta") rmSync(new URL(entry, dir), { recursive: true })
}

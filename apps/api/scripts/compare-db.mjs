import postgres from "postgres"

const SCHEMAS = ["public", "identity"]

const source = process.env.SOURCE_DATABASE_URL
const target = process.env.TARGET_DATABASE_URL
if (!source || !target) {
  console.error("Faltan SOURCE_DATABASE_URL y TARGET_DATABASE_URL")
  process.exit(1)
}

// uuid_generate_v4() y gen_random_uuid() generan el mismo UUID v4 aleatorio.
const normalize = (text) => text.replaceAll("uuid_generate_v4()", "gen_random_uuid()")

const inspect = async (url) => {
  const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} })
  try {
    return await sql.begin("read only", async (tx) => {
      const structure = await tx`
        select 'columna' as kind, table_schema || '.' || table_name || '.' || column_name as name,
               concat_ws(' | ', data_type, is_nullable, column_default) as definition
        from information_schema.columns where table_schema in ${tx(SCHEMAS)}
        union all
        select 'restricción', n.nspname || '.' || t.relname || '.' || c.conname, pg_get_constraintdef(c.oid)
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname in ${tx(SCHEMAS)}
        union all
        select 'índice', schemaname || '.' || indexname, indexdef
        from pg_indexes where schemaname in ${tx(SCHEMAS)}`
      const tables = await tx`
        select table_schema as schema, table_name as name from information_schema.tables
        where table_schema in ${tx(SCHEMAS)} and table_type = 'BASE TABLE'`
      const counts = new Map()
      for (const { schema, name } of tables) {
        const [row] = await tx`select count(*)::int as count from ${tx(schema)}.${tx(name)}`
        counts.set(`${schema}.${name}`, row.count)
      }
      const definitions = new Map(
        structure.map((row) => [`${row.kind} ${row.name}`, normalize(row.definition)])
      )
      return { definitions, counts }
    })
  } finally {
    await sql.end()
  }
}

const [a, b] = await Promise.all([inspect(source), inspect(target)])

const schemaDiffs = []
for (const key of new Set([...a.definitions.keys(), ...b.definitions.keys()])) {
  const left = a.definitions.get(key)
  const right = b.definitions.get(key)
  if (left === right) continue
  schemaDiffs.push(
    `  ${key}\n    origen:  ${left ?? "(no existe)"}\n    destino: ${right ?? "(no existe)"}`
  )
}

console.log(`Esquema: ${a.definitions.size} elementos en origen, ${b.definitions.size} en destino`)
console.log(
  schemaDiffs.length
    ? `${schemaDiffs.length} diferencias:\n${schemaDiffs.sort().join("\n")}`
    : "  idénticos"
)

let countDiffs = 0
console.log(`\n  ${"Filas".padEnd(30)} ${"origen".padStart(7)} ${"destino".padStart(9)}`)
for (const table of [...new Set([...a.counts.keys(), ...b.counts.keys()])].sort()) {
  const left = a.counts.get(table)
  const right = b.counts.get(table)
  const mark = left === right ? "" : "  ← distinto"
  if (mark) countDiffs++
  console.log(
    `  ${table.padEnd(30)} ${String(left ?? "-").padStart(7)} ${String(right ?? "-").padStart(9)}${mark}`
  )
}

const ok = schemaDiffs.length === 0 && countDiffs === 0
console.log(ok ? "\nLas dos bases coinciden." : "\nLas bases NO coinciden.")
process.exit(ok ? 0 : 1)

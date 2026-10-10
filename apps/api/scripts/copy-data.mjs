import postgres from "postgres"

// En orden de claves ajenas: cada tabla después de aquellas a las que apunta.
const TABLES = [
  ["identity", "users"],
  ["identity", "accounts"],
  ["identity", "sessions"],
  ["identity", "verifications"],
  ["core", "projects"],
  ["core", "project_members"],
  ["core", "project_invitations"],
  ["public", "columns"],
  ["public", "tasks"],
  ["public", "task_history"],
]

const sourceUrl = process.env.SOURCE_DATABASE_URL
const targetUrl = process.env.TARGET_DATABASE_URL
if (!sourceUrl || !targetUrl) {
  console.error("Faltan SOURCE_DATABASE_URL y TARGET_DATABASE_URL")
  process.exit(1)
}
if (sourceUrl === targetUrl) {
  console.error("El origen y el destino son la misma base")
  process.exit(1)
}

const options = { max: 1, prepare: false, onnotice: () => {} }
const source = postgres(sourceUrl, options)
const target = postgres(targetUrl, options)
const name = (schema, table) => `${schema}.${table}`
const summary = []

try {
  const existing = await target`
    select table_schema || '.' || table_name as name from information_schema.tables
    where table_schema in ('public', 'identity', 'core') and table_type = 'BASE TABLE'`
  const missing = existing
    .map((row) => row.name)
    .filter((table) => !TABLES.some(([s, t]) => name(s, t) === table))
  if (missing.length)
    throw new Error(`El destino tiene tablas que el script no copia: ${missing.join(", ")}`)

  // Una foto fija del origen: todas las tablas tal como estaban al empezar.
  await source.begin("isolation level repeatable read read only", async (from) => {
    await target.begin(async (to) => {
      for (const [schema, table] of TABLES) {
        const [{ count }] = await to`select count(*)::int as count from ${to(schema)}.${to(table)}`
        if (count > 0)
          throw new Error(`El destino no está vacío: ${name(schema, table)} tiene ${count} filas`)
      }

      for (const [schema, table] of TABLES) {
        // Columnas por nombre: el orden físico difiere entre bases creadas por caminos distintos.
        const columns = (
          await to`
            select column_name from information_schema.columns
            where table_schema = ${schema} and table_name = ${table} order by ordinal_position`
        ).map((row) => row.column_name)
        // En JSON, para que las fechas viajen como texto, con sus microsegundos.
        const [{ rows }] = await from`
          select coalesce(json_agg(t), '[]')::text as rows
          from (select ${from(columns)} from ${from(schema)}.${from(table)}) t`
        await to`
          insert into ${to(schema)}.${to(table)} (${to(columns)})
          select ${to(columns)} from json_populate_recordset(null::${to(schema)}.${to(table)}, ${rows}::text::json)`

        const [{ expected }] =
          await from`select count(*)::int as expected from ${from(schema)}.${from(table)}`
        const [{ count }] = await to`select count(*)::int as count from ${to(schema)}.${to(table)}`
        if (count !== expected)
          throw new Error(`${name(schema, table)}: ${count} filas copiadas de ${expected}`)
        summary.push(`  ${name(schema, table).padEnd(30)} ${String(count).padStart(7)}`)
      }
    })
  })
  console.log(`${summary.join("\n")}\n\nCopia terminada.`)
} catch (error) {
  console.error(`\nNo se ha copiado nada: ${error.message}`)
  process.exitCode = 1
} finally {
  await Promise.all([source.end(), target.end()])
}

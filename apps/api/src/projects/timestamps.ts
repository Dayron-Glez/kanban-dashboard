// postgres-js entrega las fechas como las escribe Postgres («2026-10-07
// 18:00:00.123+00»), que no es ISO 8601 y no pasaría los contratos.
export const toIso = (timestamp: string): string => new Date(timestamp).toISOString()

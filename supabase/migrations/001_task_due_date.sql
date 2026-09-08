-- ============================================================================
-- 001 — Fecha de vencimiento en las tareas
--
-- Ejecutar en el SQL Editor de Supabase. Es seguro repetirlo: usa
-- "add column if not exists", así que no falla si ya se aplicó.
--
-- La columna es nullable a propósito: las tareas que ya existen siguen siendo
-- válidas sin fecha de vencimiento.
-- ============================================================================

alter table public.tasks
  add column if not exists due_date date;

comment on column public.tasks.due_date is 'Fecha de vencimiento. Null = sin fecha.';

-- ============================================================================
-- VUELTA ATRÁS de 20261008120000_identidad_better_auth.sql. No es una migración:
-- está fuera de supabase/migrations para que nadie la aplique sin querer. Se
-- ejecuta a mano (SQL Editor de Supabase) solo si se revierte el 4.2b y se
-- vuelve a Supabase Auth.
--
-- Devuelve las claves ajenas a auth.users. No toca el esquema identity: los
-- usuarios creados con better-auth después del cambio no existen en auth.users,
-- y sus perfiles, proyectos y asignaciones harían fallar estas claves. Por eso
-- primero se listan: hay que decidir qué hacer con ellos antes de seguir.
-- ============================================================================

-- 1. Usuarios que solo existen en better-auth (deben salir 0 filas para seguir):
select u.id, u.email, u.created_at
from identity.users u
where not exists (select 1 from auth.users a where a.id = u.id);

-- 2. Las claves ajenas, de vuelta a auth.users:
alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  add constraint profiles_id_fkey
    foreign key (id) references auth.users (id) on delete cascade;

alter table public.projects
  drop constraint if exists projects_owner_id_fkey,
  add constraint projects_owner_id_fkey
    foreign key (owner_id) references auth.users (id) on delete cascade;

alter table public.tasks
  drop constraint if exists tasks_assignee_id_fkey,
  add constraint tasks_assignee_id_fkey
    foreign key (assignee_id) references auth.users (id) on delete set null;

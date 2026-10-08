-- ============================================================================
-- better-auth (sub-PR 4.2b): los usuarios y las sesiones salen de Supabase Auth
--
-- 1. El esquema identity, con las tablas de better-auth: users, sessions,
--    accounts y verifications. Columnas en snake_case; la API las lee con
--    Drizzle, que las nombra en camelCase como espera better-auth.
-- 2. La importación de auth.users con el MISMO id, para que proyectos,
--    membresías y tareas sigan siendo de quien eran. Las contraseñas se copian
--    tal cual (bcrypt) y la API las comprueba con bcrypt; los usuarios de
--    Google conservan su identidad de Google.
-- 3. Las claves ajenas que apuntaban a auth.users pasan a identity.users.
--
-- auth.users queda intacta hasta el paso a Neon (4.3): es la vuelta atrás.
--
-- Idempotente: el esquema y las tablas usan "if not exists", la importación
-- "on conflict do nothing" y las claves se sueltan antes de crearlas. Se puede
-- repetir sin efectos, por ejemplo para importar a alguien que se haya
-- registrado por Supabase entre el db push y el despliegue.
-- ============================================================================

create schema if not exists identity;

-- PostgREST solo expone public, pero las sesiones son secretas: que nadie más
-- que el dueño de la base pueda leerlas aunque eso cambie.
revoke all on schema identity from public, anon, authenticated;

create table if not exists identity.users (
  id             uuid        primary key default gen_random_uuid(),
  name           text        not null,
  email          text        not null unique,
  email_verified boolean     not null default false,
  image          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists identity.sessions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references identity.users (id) on delete cascade,
  token      text        not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sessions_user_id_idx on identity.sessions (user_id);

-- Una fila por forma de entrar: provider_id 'credential' (correo y contraseña,
-- con account_id = id del usuario) o 'google' (account_id = id de Google).
create table if not exists identity.accounts (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  uuid        not null references identity.users (id) on delete cascade,
  account_id               text        not null,
  provider_id              text        not null,
  access_token             text,
  refresh_token            text,
  id_token                 text,
  access_token_expires_at  timestamptz,
  refresh_token_expires_at timestamptz,
  scope                    text,
  password                 text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (provider_id, account_id)
);
create index if not exists accounts_user_id_idx on identity.accounts (user_id);

create table if not exists identity.verifications (
  id         uuid        primary key default gen_random_uuid(),
  identifier text        not null,
  value      text        not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists verifications_identifier_idx on identity.verifications (identifier);

-- ── Importación ─────────────────────────────────────────────────────────────

-- better-auth guarda el correo en minúsculas y exige un nombre: si Supabase no
-- lo tenía, se usa la parte del correo antes de la arroba.
insert into identity.users (id, name, email, email_verified, image, created_at, updated_at)
select
  u.id,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
    split_part(u.email, '@', 1)
  ),
  lower(u.email),
  u.email_confirmed_at is not null,
  u.raw_user_meta_data ->> 'avatar_url',
  u.created_at,
  coalesce(u.updated_at, u.created_at)
from auth.users u
where u.email is not null
on conflict do nothing;

insert into identity.accounts (user_id, account_id, provider_id, password, created_at, updated_at)
select u.id, u.id::text, 'credential', u.encrypted_password, u.created_at, coalesce(u.updated_at, u.created_at)
from auth.users u
join identity.users i on i.id = u.id
where coalesce(u.encrypted_password, '') <> ''
on conflict do nothing;

insert into identity.accounts (user_id, account_id, provider_id, created_at, updated_at)
select a.user_id, a.provider_id, 'google', a.created_at, coalesce(a.updated_at, a.created_at)
from auth.identities a
join identity.users i on i.id = a.user_id
where a.provider = 'google'
on conflict do nothing;

-- ── Claves ajenas ───────────────────────────────────────────────────────────
-- project_members ya apunta a profiles desde el 1.3, así que basta con estas
-- tres. Si quedara alguna fila sin usuario importado, la migración falla
-- entera y no cambia nada.

alter table public.profiles
  drop constraint if exists profiles_id_fkey,
  add constraint profiles_id_fkey
    foreign key (id) references identity.users (id) on delete cascade;

alter table public.projects
  drop constraint if exists projects_owner_id_fkey,
  add constraint projects_owner_id_fkey
    foreign key (owner_id) references identity.users (id) on delete cascade;

alter table public.tasks
  drop constraint if exists tasks_assignee_id_fkey,
  add constraint tasks_assignee_id_fkey
    foreign key (assignee_id) references identity.users (id) on delete set null;

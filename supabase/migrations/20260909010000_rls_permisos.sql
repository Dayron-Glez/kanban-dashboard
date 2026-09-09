-- ============================================================================
-- Permisos: cerrar los agujeros de RLS
--
-- Auditoría completa en el issue #84. Resumen de lo que se corrige:
--
--   1. project_invitations era legible por CUALQUIERA, incluso sin sesión, con
--      token y email incluidos. Comprobado contra producción.
--   2. Cualquier usuario autenticado podía aceptar CUALQUIER invitación
--      pendiente: la política no comprobaba a quién iba dirigida.
--   3. Cualquier usuario autenticado podía insertarse en CUALQUIER proyecto,
--      con el rol que quisiera. Escalada de privilegios.
--   4. Crear, renombrar y eliminar columnas exigía solo ser miembro, aunque la
--      interfaz lo esconde tras isOwner. Los candados eran decorativos.
--   5. project_members no tenía política de UPDATE, así que marcar un proyecto
--      como favorito se denegaba en silencio y no llegaba a guardarse.
--
-- Las políticas permisivas de Postgres se combinan con OR: basta una laxa para
-- anular a todas las estrictas. Varias tablas tenían duplicados, y así es como
-- se coló el punto 3. Aquí se deja una política por tabla y operación.
--
-- Idempotente: retira todas las políticas de las tablas afectadas antes de
-- crear las suyas, y las funciones usan "create or replace". Se puede repetir
-- sin efectos.
-- ============================================================================

-- ── Funciones del flujo de invitaciones ─────────────────────────────────────
-- El agujero 1 existía porque InviteAcceptPage lee la invitación por token
-- desde una cuenta que todavía no es miembro, y la única forma de permitirlo
-- con RLS era abrir la tabla entera. RLS no sabe exigir "solo la fila cuyo
-- token conoces": o ves la tabla, o no la ves.
--
-- La salida es sacar esas dos operaciones de RLS y meterlas en funciones
-- SECURITY DEFINER, que se saltan RLS pero solo hacen aquello para lo que se
-- las escribe.

-- Devuelve una invitación a partir de su token. No devuelve el token, que ya
-- lo tiene quien llama, ni deja ver ninguna otra invitación.
create or replace function public.invitation_by_token(p_token uuid)
returns table (
  id           uuid,
  project_id   uuid,
  project_name text,
  email        text,
  status       text,
  expires_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $fn$
  select i.id, i.project_id, p.name, i.email, i.status, i.expires_at
  from public.project_invitations i
  join public.projects p on p.id = i.project_id
  where i.token = p_token;
$fn$;

-- Acepta una invitación y devuelve el proyecto al que da acceso. Es la única
-- vía por la que alguien puede añadirse a un proyecto ajeno, y exige que la
-- invitación esté pendiente, sin caducar, y dirigida al correo de quien la
-- acepta.
create or replace function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_inv   public.project_invitations%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión para aceptar una invitación'
      using errcode = '42501';
  end if;

  select * into v_inv from public.project_invitations where token = p_token;

  if v_inv.id is null then
    raise exception 'La invitación no existe' using errcode = 'P0002';
  end if;
  if v_inv.status <> 'pending' then
    -- Reabrir el enlace ya usado no es un error si quien lo abre ya está
    -- dentro: se le lleva al proyecto y punto.
    if public.is_project_member(v_inv.project_id) then
      return v_inv.project_id;
    end if;
    raise exception 'La invitación ya fue aceptada' using errcode = 'P0002';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'La invitación ha caducado' using errcode = 'P0002';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  if lower(v_email) is distinct from lower(v_inv.email) then
    raise exception 'La invitación está dirigida a otra dirección de correo'
      using errcode = '42501';
  end if;

  -- Siempre como 'member'. El rol no lo elige quien acepta.
  insert into public.project_members (project_id, user_id, role)
  values (v_inv.project_id, auth.uid(), 'member')
  on conflict (project_id, user_id) do nothing;

  update public.project_invitations set status = 'accepted' where id = v_inv.id;

  return v_inv.project_id;
end;
$fn$;

-- Si dos personas comparten algún proyecto. Se usa para no exponer el perfil
-- —y con él el correo— de todos los usuarios de la instancia.
create or replace function public.shares_project_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.project_members mio
    join public.project_members suyo on suyo.project_id = mio.project_id
    where mio.user_id = auth.uid() and suyo.user_id = p_user_id
  );
$fn$;

revoke execute on function public.invitation_by_token(uuid) from public;
revoke execute on function public.accept_invitation(uuid) from public;
revoke execute on function public.shares_project_with(uuid) from public;
grant execute on function public.invitation_by_token(uuid) to anon, authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.shares_project_with(uuid) to authenticated;

-- ── Punto de partida limpio ─────────────────────────────────────────────────
-- Esta migración define el juego COMPLETO de políticas de estas cinco tablas,
-- así que primero se retiran todas las que haya. Soltarlas por su nombre viejo
-- no serviría: al repetir la migración no encontraría nada que soltar y
-- chocaría contra los nombres nuevos, que ya existirían.
do $barrido$
declare
  r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('columns', 'project_invitations', 'project_members', 'projects', 'profiles')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end
$barrido$;

-- ── columns: escribir es cosa del propietario ───────────────────────────────
-- Punto 4. Verlas sigue siendo de cualquier miembro.

create policy "Miembros ven columnas"
  on public.columns for select to authenticated
  using (public.is_project_member(project_id));

create policy "Propietario crea columnas"
  on public.columns for insert to authenticated
  with check (public.is_project_owner(project_id));

create policy "Propietario actualiza columnas"
  on public.columns for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

create policy "Propietario elimina columnas"
  on public.columns for delete to authenticated
  using (public.is_project_owner(project_id));

-- ── project_invitations ─────────────────────────────────────────────────────
-- Puntos 1 y 2. Se cierra la lectura pública y se retira el UPDATE abierto:
-- aceptar pasa ahora por accept_invitation().

-- Los miembros ven las invitaciones de sus proyectos, para la pantalla de
-- miembros. Un token que vean solo da acceso a un proyecto en el que ya están,
-- así que no les otorga nada nuevo.
create policy "Miembros ven invitaciones"
  on public.project_invitations for select to authenticated
  using (public.is_project_member(project_id));

create policy "Propietario crea invitaciones"
  on public.project_invitations for insert to authenticated
  with check (public.is_project_owner(project_id));

create policy "Propietario cancela invitaciones"
  on public.project_invitations for delete to authenticated
  using (public.is_project_owner(project_id));

-- ── project_members ─────────────────────────────────────────────────────────
-- Punto 3: fuera la política laxa. Permitía insertarse en cualquier proyecto
-- por su término `user_id = auth.uid()`, que no restringía el proyecto.
-- Punto 5: se añade el UPDATE que faltaba.

create policy "Miembros ven los miembros"
  on public.project_members for select to authenticated
  using (public.is_project_member(project_id));

-- Solo el propietario añade a mano. Quien acepta una invitación entra por
-- accept_invitation(), que es SECURITY DEFINER y no pasa por aquí.
create policy "Propietario añade miembros"
  on public.project_members for insert to authenticated
  with check (public.is_project_owner(project_id));

create policy "Propietario elimina miembros"
  on public.project_members for delete to authenticated
  using (public.is_project_owner(project_id));

-- Cada cual toca su propia fila y nada más: es lo que necesita el favorito.
create policy "Cada miembro actualiza su propia fila"
  on public.project_members for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Que no puedan ascenderse a owner no se resuelve con RLS: el WITH CHECK no
-- puede comparar con la fila anterior, así que exigir role = 'member' habría
-- impedido al propietario tocar su propia fila. Se resuelve un piso más abajo,
-- con permisos por columna: solo is_favorite es actualizable, y `role` queda
-- fuera del alcance de cualquiera que no sea SECURITY DEFINER.
revoke update on public.project_members from anon, authenticated;
grant update (is_favorite) on public.project_members to authenticated;

-- ── projects: quitar el SELECT duplicado ────────────────────────────────────

create policy "Miembros ven el proyecto"
  on public.projects for select to authenticated
  using (owner_id = auth.uid() or public.is_project_member(id));

create policy "Usuarios autenticados crean proyectos"
  on public.projects for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "Propietario actualiza proyecto"
  on public.projects for update to authenticated
  using (public.is_project_owner(id))
  with check (public.is_project_owner(id));

create policy "Propietario elimina proyecto"
  on public.projects for delete to authenticated
  using (public.is_project_owner(id));

-- ── profiles: dejar de exponer el correo de todo el mundo ───────────────────
-- Había un SELECT con USING (true) para autenticados: cualquier usuario podía
-- leer el nombre y el correo de todos los demás, compartieran proyecto o no.

create policy "Perfiles de quienes comparten proyecto"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_project_with(id));

create policy "Cada usuario actualiza su perfil"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ── tasks y task_history: se quedan como están ──────────────────────────────
-- Cualquier miembro puede trabajar con las tareas, y es deliberado: la
-- interfaz tampoco las restringe a propietario.

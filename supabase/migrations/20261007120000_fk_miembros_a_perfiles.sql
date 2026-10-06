-- project_members.user_id apuntaba a auth.users, que PostgREST no expone: para
-- traer el perfil de cada miembro hacía falta una segunda consulta. Apuntando
-- a profiles, el perfil llega embebido en la misma.
--
-- El borrado en cascada se conserva: auth.users -> profiles -> project_members.

-- Usuarios anteriores al trigger handle_new_user pueden no tener perfil, y la
-- FK fallaría al crearse.
insert into public.profiles (id, full_name, email)
select u.id, u.raw_user_meta_data ->> 'full_name', u.email
from auth.users u
where u.id in (select user_id from public.project_members)
  and not exists (select 1 from public.profiles p where p.id = u.id);

alter table public.project_members
  drop constraint project_members_user_id_fkey;

alter table public.project_members
  add constraint project_members_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

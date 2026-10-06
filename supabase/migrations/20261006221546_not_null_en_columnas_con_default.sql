-- Columnas con valor por defecto que aun así admitían nulos. La app las da por
-- siempre rellenas, y los esquemas Zod que validan las respuestas fallarían
-- ante el primer nulo. Se rellena antes de restringir por si alguna fila
-- antigua quedó sin valor.

update public.profiles set updated_at = now() where updated_at is null;
alter table public.profiles alter column updated_at set not null;

update public.projects set color = '#3b82f6' where color is null;
update public.projects set created_at = now() where created_at is null;
alter table public.projects
  alter column color set not null,
  alter column created_at set not null;

update public.project_members set role = 'member' where role is null;
update public.project_members set joined_at = now() where joined_at is null;
alter table public.project_members
  alter column role set not null,
  alter column joined_at set not null;

update public.project_invitations set created_at = now() where created_at is null;
update public.project_invitations set status = 'pending' where status is null;
update public.project_invitations set expires_at = created_at + interval '7 days' where expires_at is null;
alter table public.project_invitations
  alter column created_at set not null,
  alter column status set not null,
  alter column expires_at set not null;

update public.tasks set priority = 'p2' where priority is null;
update public.tasks set size = 'm' where size is null;
update public.tasks set created_at = now() where created_at is null;
alter table public.tasks
  alter column priority set not null,
  alter column size set not null,
  alter column created_at set not null;

update public.task_history set moved_at = now() where moved_at is null;
alter table public.task_history alter column moved_at set not null;

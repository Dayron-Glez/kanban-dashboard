-- Las columnas eran solo un título y una posición: la app no sabía cuál
-- significa «terminado» y analytics lo adivinaba buscando «done» en el título.
-- Cada columna pasa a tener una categoría, y como mucho una «done» por proyecto.

-- 1. Las columnas por defecto se creaban en inglés. Se traducen solo las que
--    conservan exactamente el título por defecto; lo escrito a mano no se toca.
update public.columns c
set title = r.nuevo
from (values
  ('Backlog', 'Pendiente'),
  ('Ready', 'Listo'),
  ('In Progress', 'En curso'),
  ('In Review', 'En revisión'),
  ('Done', 'Hecho')
) as r(actual, nuevo)
where c.title = r.actual;

-- 2. La categoría. Los valores son identificadores internos; la interfaz los
--    traduce (Por hacer, En curso, Bloqueada, Hecha).
alter table public.columns
  add column category text not null default 'todo'
  constraint columns_category_check check (category in ('todo', 'doing', 'blocked', 'done'));

-- 3. Relleno por título, con prioridad done > blocked > doing > todo y solo
--    palabras completas (\m y \M): «Recursos» no cuenta como «en curso».
update public.columns
set category = case
  when lower(title) ~ '\m(done|hech[oa]|terminad[oa]|completad[oa]|publicad[oa]|cerrad[oa]|finalizad[oa])\M' then 'done'
  when lower(title) ~ '\m(blocked|bloquead[oa]|en espera|on hold)\M' then 'blocked'
  when lower(title) ~ '\m(progress|doing|curso|review|revisi[oó]n|desarrollo|testing|qa)\M' then 'doing'
  else 'todo'
end;

-- 4. Como mucho una «done» por proyecto: si hay varias, se queda la última y
--    las demás pasan a «doing»; si no hay ninguna, la última columna lo es.
with ranked as (
  select id,
         row_number() over (partition by project_id order by position desc) as desde_el_final
  from public.columns
  where category = 'done'
)
update public.columns c
set category = 'doing'
from ranked r
where c.id = r.id and r.desde_el_final > 1;

with ultima as (
  select distinct on (project_id) id, project_id
  from public.columns
  order by project_id, position desc
)
update public.columns c
set category = 'done'
from ultima u
where c.id = u.id
  and not exists (
    select 1 from public.columns o where o.project_id = u.project_id and o.category = 'done'
  );

-- 5. La base garantiza la regla: dos «done» en el mismo proyecto no caben.
create unique index columns_one_done_per_project
  on public.columns (project_id)
  where category = 'done';

-- 6. Cambiar la categoría. Si la nueva es «done», la anterior pasa a «doing»
--    en la misma transacción, así el índice único nunca salta en uso normal.
create or replace function public.set_column_category(
  p_column_id uuid,
  p_category text
)
returns void
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_project uuid;
begin
  select project_id into v_project from public.columns where id = p_column_id;
  if v_project is null then
    raise exception 'La columna no existe' using errcode = 'P0002';
  end if;

  if not public.is_project_owner(v_project) then
    raise exception 'Solo el propietario puede cambiar la categoría' using errcode = '42501';
  end if;

  if p_category = 'done' then
    update public.columns
    set category = 'doing'
    where project_id = v_project and category = 'done' and id <> p_column_id;
  end if;

  update public.columns set category = p_category where id = p_column_id;
end;
$fn$;

revoke execute on function public.set_column_category(uuid, text) from public;
grant execute on function public.set_column_category(uuid, text) to authenticated;

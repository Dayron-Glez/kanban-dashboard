-- Al soltar una tarea, el cliente hacía un upsert con el contenido completo de
-- cada tarea de la columna (pisando lo que otro estuviera editando) y después
-- un insert en task_history, sin transacción: si el segundo fallaba, el
-- historial perdía el movimiento. Con estas dos funciones, cada soltado es una
-- sola llamada atómica que solo toca column_id y position.
--
-- SECURITY INVOKER: se ejecutan con los permisos de quien llama, así que la RLS
-- de tasks, columns y task_history se sigue aplicando igual que antes.

-- Mueve una tarea a una columna (la misma u otra) y deja esa columna en el
-- orden indicado. Las tareas de la columna que no vengan en la lista (las que
-- otra persona haya creado mientras tanto) van detrás, en su orden actual, y
-- los ids de la lista que no son de esa columna se ignoran.
create or replace function public.move_task(
  p_task_id uuid,
  p_to_column_id uuid,
  p_ordered_task_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $fn$
declare
  v_task      public.tasks%rowtype;
  v_project   uuid;
begin
  select * into v_task from public.tasks where id = p_task_id;
  if v_task.id is null then
    raise exception 'La tarea no existe' using errcode = 'P0002';
  end if;

  select project_id into v_project from public.columns where id = p_to_column_id;
  if v_project is distinct from v_task.project_id then
    raise exception 'La columna no es del proyecto de la tarea' using errcode = '22023';
  end if;

  if v_task.column_id <> p_to_column_id then
    update public.tasks set column_id = p_to_column_id where id = p_task_id;
  end if;

  with ranked as (
    select id,
           row_number() over (
             order by coalesce(array_position(p_ordered_task_ids, id), 2147483647), position
           ) - 1 as pos
    from public.tasks
    where column_id = p_to_column_id
  )
  update public.tasks t
  set position = r.pos
  from ranked r
  where t.id = r.id and t.position is distinct from r.pos;

  if v_task.column_id <> p_to_column_id then
    -- La columna de origen pierde una tarea: se renumera sin huecos.
    with ranked as (
      select id, row_number() over (order by position) - 1 as pos
      from public.tasks
      where column_id = v_task.column_id
    )
    update public.tasks t
    set position = r.pos
    from ranked r
    where t.id = r.id and t.position is distinct from r.pos;

    insert into public.task_history (task_id, from_column_id, to_column_id)
    values (p_task_id, v_task.column_id, p_to_column_id);
  end if;
end;
$fn$;

-- Deja las columnas del proyecto en el orden indicado, con el mismo criterio
-- para las que no vengan en la lista.
create or replace function public.reorder_columns(
  p_project_id uuid,
  p_ordered_column_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $fn$
begin
  -- La RLS ya impide que alguien que no es propietario mueva columnas, pero
  -- lo haría en silencio, afectando a 0 filas. Así el cliente recibe un error.
  if not public.is_project_owner(p_project_id) then
    raise exception 'Solo el propietario puede reordenar las columnas' using errcode = '42501';
  end if;

  with ranked as (
    select id,
           row_number() over (
             order by coalesce(array_position(p_ordered_column_ids, id), 2147483647), position
           ) - 1 as pos
    from public.columns
    where project_id = p_project_id
  )
  update public.columns c
  set position = r.pos
  from ranked r
  where c.id = r.id and c.position is distinct from r.pos;
end;
$fn$;

revoke execute on function public.move_task(uuid, uuid, uuid[]) from public;
revoke execute on function public.reorder_columns(uuid, uuid[]) from public;
grant execute on function public.move_task(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.reorder_columns(uuid, uuid[]) to authenticated;

-- ============================================================================
-- cauce — datos de prueba
--
-- Ejecutar en el SQL Editor de Supabase (no desde la app: la anon key está
-- sujeta a RLS y no puede sembrar datos).
--
-- Es IDEMPOTENTE: primero borra los proyectos sembrados —identificados por el
-- marcador '[seed]' en la descripción— y luego los recrea. Ejecutarlo dos
-- veces deja el mismo estado y nunca toca proyectos reales.
--
-- Para revertir sin volver a sembrar, ejecuta solo el bloque LIMPIEZA.
-- ============================================================================

do $$
declare
  -- ⬇️ ÚNICO VALOR A CAMBIAR: el email con el que inicias sesión en cauce.
  v_email text := 'dayronglez01@gmail.com';

  v_user   uuid;
  v_proj   uuid;
  v_col    uuid;
  v_cols   uuid[];
  v_task   uuid;
  v_seed   text := '[seed]';
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'No existe ningún usuario con el email %. Regístrate primero en la app.', v_email;
  end if;

  -- ── LIMPIEZA ──────────────────────────────────────────────────────────────
  -- El borrado en cascada de la FK se encarga de columnas, tareas, miembros,
  -- invitaciones e historial de los proyectos sembrados.
  delete from public.projects where description like '%' || v_seed;

  -- ── PROYECTO 1: grande y activo ───────────────────────────────────────────
  insert into public.projects (owner_id, name, description, color, created_at)
  values (v_user, 'Plataforma Web', 'Rediseño y migración del front ' || v_seed, '#6366f1', now() - interval '62 days')
  returning id into v_proj;

  insert into public.project_members (project_id, user_id, role, is_favorite)
  values (v_proj, v_user, 'owner', true)
  on conflict (project_id, user_id) do update set role = excluded.role, is_favorite = excluded.is_favorite;

  -- Columnas: se guardan en orden para poder repartir tareas por fase.
  -- Si la base crea columnas por defecto al insertar el proyecto, se descartan
  -- para no duplicarlas con las del seed.
  delete from public.columns where project_id = v_proj;
  v_cols := '{}'::uuid[];

  insert into public.columns (project_id, title, position) values (v_proj, 'Backlog', 0) returning id into v_col;
  v_cols := array_append(v_cols, v_col);
  insert into public.columns (project_id, title, position) values (v_proj, 'Ready', 1) returning id into v_col;
  v_cols := array_append(v_cols, v_col);
  insert into public.columns (project_id, title, position) values (v_proj, 'In Progress', 2) returning id into v_col;
  v_cols := array_append(v_cols, v_col);
  insert into public.columns (project_id, title, position) values (v_proj, 'In Review', 3) returning id into v_col;
  v_cols := array_append(v_cols, v_col);
  insert into public.columns (project_id, title, position) values (v_proj, 'Done', 4) returning id into v_col;
  v_cols := array_append(v_cols, v_col);

  -- Tareas: mezcla de prioridades, tamaños y asignación (unas mías, otras no).
  insert into public.tasks (project_id, column_id, content, priority, size, position, assignee_id, created_at) values
    (v_proj, v_cols[1], 'Investigar alternativas a la librería de gráficos', 'p2', 'm',  0, null,   now() - interval '20 days'),
    (v_proj, v_cols[1], 'Documentar el sistema de tokens',                   'p2', 's',  1, v_user, now() - interval '18 days'),
    (v_proj, v_cols[1], 'Auditoría de accesibilidad del tablero',            'p1', 'l',  2, null,   now() - interval '15 days'),
    (v_proj, v_cols[1], 'Reducir el bundle inicial',                         'p1', 'xl', 3, v_user, now() - interval '14 days'),
    (v_proj, v_cols[2], 'Migrar formularios a react-hook-form',              'p1', 'l',  0, v_user, now() - interval '12 days'),
    (v_proj, v_cols[2], 'Unificar los estados vacíos',                       'p2', 's',  1, null,   now() - interval '11 days'),
    (v_proj, v_cols[3], 'Rediseño del navbar y el sidebar',                  'p0', 'xl', 0, v_user, now() - interval '9 days'),
    (v_proj, v_cols[3], 'Arreglar el drag entre columnas en Safari',         'p0', 'm',  1, v_user, now() - interval '8 days'),
    (v_proj, v_cols[3], 'Modo oscuro en la página de ajustes',               'p1', 'm',  2, null,   now() - interval '7 days'),
    (v_proj, v_cols[4], 'Revisión del contraste en claro',                   'p1', 's',  0, v_user, now() - interval '5 days'),
    (v_proj, v_cols[4], 'Tests de la barra de progreso de columna',          'p2', 's',  1, null,   now() - interval '4 days'),
    (v_proj, v_cols[5], 'Configurar el pipeline de CI',                      'p1', 'l',  0, v_user, now() - interval '40 days'),
    (v_proj, v_cols[5], 'Migración inicial del esquema',                     'p0', 'xl', 1, null,   now() - interval '38 days'),
    (v_proj, v_cols[5], 'Definir la paleta de marca',                        'p1', 'm',  2, v_user, now() - interval '30 days'),
    (v_proj, v_cols[5], 'Componente de tarjeta de tarea',                    'p2', 'm',  3, null,   now() - interval '25 days');

  -- Historial: movimientos repartidos por semanas para que Analytics tenga
  -- una curva de velocidad real y no un único pico.
  for v_task in select id from public.tasks where project_id = v_proj and column_id = v_cols[5] loop
    insert into public.task_history (task_id, from_column_id, to_column_id, moved_at)
    values
      (v_task, v_cols[1], v_cols[3], now() - interval '28 days'),
      (v_task, v_cols[3], v_cols[4], now() - interval '21 days'),
      (v_task, v_cols[4], v_cols[5], now() - interval '14 days');
  end loop;

  for v_task in select id from public.tasks where project_id = v_proj and column_id = v_cols[4] loop
    insert into public.task_history (task_id, from_column_id, to_column_id, moved_at)
    values (v_task, v_cols[3], v_cols[4], now() - interval '3 days');
  end loop;

  for v_task in select id from public.tasks where project_id = v_proj and column_id = v_cols[3] loop
    insert into public.task_history (task_id, from_column_id, to_column_id, moved_at)
    values (v_task, v_cols[2], v_cols[3], now() - interval '6 days');
  end loop;

  -- Invitación pendiente, para poder ver esa card en Ajustes.
  insert into public.project_invitations (project_id, email, token, status, expires_at)
  values (v_proj, 'nuevo.companero@ejemplo.com', gen_random_uuid()::text, 'pending', now() + interval '7 days');

  -- ── PROYECTO 2: mediano ───────────────────────────────────────────────────
  insert into public.projects (owner_id, name, description, color, created_at)
  values (v_user, 'Campaña Q3', 'Lanzamiento y contenidos ' || v_seed, '#ec4899', now() - interval '35 days')
  returning id into v_proj;

  insert into public.project_members (project_id, user_id, role, is_favorite)
  values (v_proj, v_user, 'owner', false)
  on conflict (project_id, user_id) do update set role = excluded.role, is_favorite = excluded.is_favorite;

  -- Si la base crea columnas por defecto al insertar el proyecto, se descartan
  -- para no duplicarlas con las del seed.
  delete from public.columns where project_id = v_proj;
  v_cols := '{}'::uuid[];
  insert into public.columns (project_id, title, position) values (v_proj, 'Ideas', 0) returning id into v_col;
  v_cols := array_append(v_cols, v_col);
  insert into public.columns (project_id, title, position) values (v_proj, 'En curso', 1) returning id into v_col;
  v_cols := array_append(v_cols, v_col);
  insert into public.columns (project_id, title, position) values (v_proj, 'Publicado', 2) returning id into v_col;
  v_cols := array_append(v_cols, v_col);

  insert into public.tasks (project_id, column_id, content, priority, size, position, assignee_id, created_at) values
    (v_proj, v_cols[1], 'Guion del vídeo de producto',        'p1', 'l',  0, null,   now() - interval '16 days'),
    (v_proj, v_cols[1], 'Brief para la agencia',              'p2', 's',  1, null,   now() - interval '15 days'),
    (v_proj, v_cols[2], 'Landing de la campaña',              'p0', 'xl', 0, v_user, now() - interval '10 days'),
    (v_proj, v_cols[2], 'Secuencia de emails',                'p1', 'm',  1, v_user, now() - interval '8 days'),
    (v_proj, v_cols[3], 'Nota de prensa',                     'p2', 'm',  0, null,   now() - interval '22 days');

  for v_task in select id from public.tasks where project_id = v_proj and column_id = v_cols[3] loop
    insert into public.task_history (task_id, from_column_id, to_column_id, moved_at)
    values (v_task, v_cols[2], v_cols[3], now() - interval '18 days');
  end loop;

  -- ── PROYECTO 3: pequeño ───────────────────────────────────────────────────
  insert into public.projects (owner_id, name, description, color, created_at)
  values (v_user, 'API Gateway', 'Servicio de entrada y rate limiting ' || v_seed, '#0ea5e9', now() - interval '12 days')
  returning id into v_proj;

  insert into public.project_members (project_id, user_id, role, is_favorite)
  values (v_proj, v_user, 'owner', true)
  on conflict (project_id, user_id) do update set role = excluded.role, is_favorite = excluded.is_favorite;

  -- Si la base crea columnas por defecto al insertar el proyecto, se descartan
  -- para no duplicarlas con las del seed.
  delete from public.columns where project_id = v_proj;
  v_cols := '{}'::uuid[];
  insert into public.columns (project_id, title, position) values (v_proj, 'Backlog', 0) returning id into v_col;
  v_cols := array_append(v_cols, v_col);
  insert into public.columns (project_id, title, position) values (v_proj, 'In Progress', 1) returning id into v_col;
  v_cols := array_append(v_cols, v_col);
  insert into public.columns (project_id, title, position) values (v_proj, 'Done', 2) returning id into v_col;
  v_cols := array_append(v_cols, v_col);

  insert into public.tasks (project_id, column_id, content, priority, size, position, assignee_id, created_at) values
    (v_proj, v_cols[1], 'Elegir estrategia de rate limiting', 'p1', 'm', 0, v_user, now() - interval '9 days'),
    (v_proj, v_cols[2], 'Middleware de autenticación',        'p0', 'l', 0, v_user, now() - interval '6 days'),
    (v_proj, v_cols[3], 'Esqueleto del servicio',             'p2', 's', 0, null,   now() - interval '11 days');

  -- ── PROYECTO 4: recién creado, sin tareas ─────────────────────────────────
  -- Sirve para ver cómo se comportan los estados vacíos con datos alrededor.
  insert into public.projects (owner_id, name, description, color, created_at)
  values (v_user, 'Investigación UX', 'Entrevistas y hallazgos ' || v_seed, '#10b981', now() - interval '2 days')
  returning id into v_proj;

  insert into public.project_members (project_id, user_id, role, is_favorite)
  values (v_proj, v_user, 'owner', false)
  on conflict (project_id, user_id) do update set role = excluded.role, is_favorite = excluded.is_favorite;

  delete from public.columns where project_id = v_proj;
  insert into public.columns (project_id, title, position) values
    (v_proj, 'Backlog', 0), (v_proj, 'In Progress', 1), (v_proj, 'Done', 2);

  raise notice 'Seed completado para %', v_email;
end $$;

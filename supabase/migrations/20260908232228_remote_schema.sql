SET local check_function_bodies = off;

CREATE TABLE "public"."columns" (
  "id"         uuid    NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "project_id" uuid    NOT NULL,
  "title"      text    NOT NULL,
  "position"   integer NOT NULL DEFAULT 0,
  CONSTRAINT "columns_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."columns"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"         uuid                     NOT NULL,
  "full_name"  text,
  "avatar_url" text,
  "updated_at" timestamp with time zone DEFAULT now(),
  "email"      text,
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."project_invitations" (
  "id"         uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "project_id" uuid                     NOT NULL,
  "email"      text                     NOT NULL,
  "token"      uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "status"     text                     DEFAULT 'pending'::text,
  "expires_at" timestamp with time zone DEFAULT (now() + '7 days'::interval),
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "project_invitations_pkey" PRIMARY KEY (id),
  CONSTRAINT "project_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text]))),
  CONSTRAINT "project_invitations_token_key" UNIQUE (token)
);

ALTER TABLE "public"."project_invitations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."project_members" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "project_id"  uuid                     NOT NULL,
  "user_id"     uuid                     NOT NULL,
  "role"        text                     DEFAULT 'member'::text,
  "joined_at"   timestamp with time zone DEFAULT now(),
  "is_favorite" boolean                  NOT NULL DEFAULT false,
  CONSTRAINT "project_members_pkey" PRIMARY KEY (id),
  CONSTRAINT "project_members_project_id_user_id_key" UNIQUE (project_id, user_id),
  CONSTRAINT "project_members_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'member'::text])))
);

ALTER TABLE "public"."project_members"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."projects" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "owner_id"    uuid                     NOT NULL,
  "name"        text                     NOT NULL,
  "description" text,
  "color"       text                     DEFAULT '#3b82f6'::text,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "projects_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."projects"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."task_history" (
  "id"             uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "task_id"        uuid                     NOT NULL,
  "from_column_id" uuid,
  "to_column_id"   uuid                     NOT NULL,
  "moved_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "task_history_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."task_history"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."tasks" (
  "id"          uuid                     NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "column_id"   uuid                     NOT NULL,
  "project_id"  uuid                     NOT NULL,
  "assignee_id" uuid,
  "content"     text                     NOT NULL,
  "priority"    text                     DEFAULT 'p2'::text,
  "size"        text                     DEFAULT 'm'::text,
  "position"    integer                  NOT NULL DEFAULT 0,
  "created_at"  timestamp with time zone DEFAULT now(),
  "due_date"    date,
  CONSTRAINT "tasks_pkey" PRIMARY KEY (id),
  CONSTRAINT "tasks_priority_check" CHECK ((priority = ANY (ARRAY['p0'::text, 'p1'::text, 'p2'::text]))),
  CONSTRAINT "tasks_size_check" CHECK ((size = ANY (ARRAY['xs'::text, 's'::text, 'm'::text, 'l'::text, 'xl'::text])))
);

ALTER TABLE "public"."tasks"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_my_project_ids()
  RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  AS $function$
  select project_id from public.project_members where user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_project()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_project_member (
  p_project_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  AS $function$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_project_owner (
  p_project_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  AS $function$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid() and role = 'owner'
  );
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."project_members"
  ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."projects"
  ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."columns"
  ADD CONSTRAINT "columns_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE "public"."project_invitations"
  ADD CONSTRAINT "project_invitations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE "public"."project_members"
  ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE "public"."task_history"
  ADD CONSTRAINT "task_history_from_column_id_fkey" FOREIGN KEY (from_column_id) REFERENCES public.columns(id) ON DELETE SET NULL;

ALTER TABLE "public"."task_history"
  ADD CONSTRAINT "task_history_to_column_id_fkey" FOREIGN KEY (to_column_id) REFERENCES public.columns(id) ON DELETE CASCADE;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_assignee_id_fkey" FOREIGN KEY (assignee_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_column_id_fkey" FOREIGN KEY (column_id) REFERENCES public.columns(id) ON DELETE CASCADE;

ALTER TABLE "public"."task_history"
  ADD CONSTRAINT "task_history_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;

ALTER TABLE "public"."tasks"
  ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_project();

CREATE POLICY "Miembros actualizan columnas" ON "public"."columns"
  FOR UPDATE
  TO PUBLIC
  USING (public.is_project_member(project_id));

CREATE POLICY "Miembros crean columnas" ON "public"."columns"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Miembros eliminan columnas" ON "public"."columns"
  FOR DELETE
  TO PUBLIC
  USING (public.is_project_member(project_id));

CREATE POLICY "Miembros ven columnas" ON "public"."columns"
  FOR SELECT
  TO PUBLIC
  USING (public.is_project_member(project_id));

CREATE POLICY "Profiles visibles para usuarios autenticados" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING (true);

CREATE POLICY "Usuario actualiza su propio perfil" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((auth.uid() = id));

CREATE POLICY "Usuarios actualizan su perfil" ON "public"."profiles"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = id));

CREATE POLICY "Usuarios ven su propio perfil" ON "public"."profiles"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = id));

CREATE POLICY "Cualquiera ve invitación por token" ON "public"."project_invitations"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Invitado acepta su invitación" ON "public"."project_invitations"
  FOR UPDATE
  TO "authenticated"
  USING (((status = 'pending'::text) AND (expires_at > now())))
  WITH CHECK ((status = 'accepted'::text));

CREATE POLICY "Lectura pública de invitación por token" ON "public"."project_invitations"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Miembros ven invitaciones" ON "public"."project_invitations"
  FOR SELECT
  TO PUBLIC
  USING (public.is_project_member(project_id));

CREATE POLICY "Owner cancela invitaciones" ON "public"."project_invitations"
  FOR DELETE
  TO "authenticated"
  USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE ((project_members.user_id = auth.uid()) AND (project_members.role = 'owner'::text)))));

CREATE POLICY "Owner crea invitaciones" ON "public"."project_invitations"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE ((project_members.user_id = auth.uid()) AND (project_members.role = 'owner'::text)))));

CREATE POLICY "Owner ve sus invitaciones" ON "public"."project_invitations"
  FOR SELECT
  TO "authenticated"
  USING ((project_id IN ( SELECT project_members.project_id
   FROM public.project_members
  WHERE ((project_members.user_id = auth.uid()) AND (project_members.role = 'owner'::text)))));

CREATE POLICY "Inserta miembros" ON "public"."project_members"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((project_id IN ( SELECT public.get_my_project_ids() AS get_my_project_ids)) OR (user_id = auth.uid())));

CREATE POLICY "Miembros ven los miembros" ON "public"."project_members"
  FOR SELECT
  TO PUBLIC
  USING (public.is_project_member(project_id));

CREATE POLICY "Miembros ven miembros de sus proyectos" ON "public"."project_members"
  FOR SELECT
  TO "authenticated"
  USING ((project_id IN ( SELECT public.get_my_project_ids() AS get_my_project_ids)));

CREATE POLICY "Owner añade miembros" ON "public"."project_members"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.is_project_owner(project_id));

CREATE POLICY "Owner elimina miembros" ON "public"."project_members"
  FOR DELETE
  TO "authenticated"
  USING ((project_id IN ( SELECT project_members_1.project_id
   FROM public.project_members project_members_1
  WHERE ((project_members_1.user_id = auth.uid()) AND (project_members_1.role = 'owner'::text)))));

CREATE POLICY "Miembros ven el proyecto" ON "public"."projects"
  FOR SELECT
  TO PUBLIC
  USING (((owner_id = auth.uid()) OR public.is_project_member(id)));

CREATE POLICY "Miembros ven sus proyectos" ON "public"."projects"
  FOR SELECT
  TO "authenticated"
  USING (((owner_id = auth.uid()) OR (id IN ( SELECT public.get_my_project_ids() AS get_my_project_ids))));

CREATE POLICY "Owner actualiza proyecto" ON "public"."projects"
  FOR UPDATE
  TO PUBLIC
  USING (public.is_project_owner(id));

CREATE POLICY "Owner elimina proyecto" ON "public"."projects"
  FOR DELETE
  TO PUBLIC
  USING (public.is_project_owner(id));

CREATE POLICY "Usuarios autenticados crean proyectos" ON "public"."projects"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = owner_id));

CREATE POLICY "Miembros insertan historial" ON "public"."task_history"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.tasks t
     JOIN public.project_members pm ON ((pm.project_id = t.project_id)))
  WHERE ((t.id = task_history.task_id) AND (pm.user_id = auth.uid())))));

CREATE POLICY "Miembros ven historial" ON "public"."task_history"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM (public.tasks t
     JOIN public.project_members pm ON ((pm.project_id = t.project_id)))
  WHERE ((t.id = task_history.task_id) AND (pm.user_id = auth.uid())))));

CREATE POLICY "Miembros actualizan tareas" ON "public"."tasks"
  FOR UPDATE
  TO PUBLIC
  USING (public.is_project_member(project_id));

CREATE POLICY "Miembros crean tareas" ON "public"."tasks"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (public.is_project_member(project_id));

CREATE POLICY "Miembros eliminan tareas" ON "public"."tasks"
  FOR DELETE
  TO PUBLIC
  USING (public.is_project_member(project_id));

CREATE POLICY "Miembros ven tareas" ON "public"."tasks"
  FOR SELECT
  TO PUBLIC
  USING (public.is_project_member(project_id));

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

COMMENT ON COLUMN "public"."tasks"."due_date" IS 'Fecha de vencimiento. Null = sin fecha.';

GRANT EXECUTE ON FUNCTION "public"."get_my_project_ids"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_project"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_project_member"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."is_project_owner"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."columns" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."project_invitations" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."project_members" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."projects" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."task_history" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."tasks" TO "anon", "authenticated", "postgres", "service_role";


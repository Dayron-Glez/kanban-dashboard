CREATE TABLE "calendar"."element_assignees" (
	"element_id" uuid NOT NULL,
	"crew_member_id" uuid NOT NULL,
	"role" text NOT NULL,
	CONSTRAINT "element_assignees_pkey" PRIMARY KEY("element_id","crew_member_id"),
	CONSTRAINT "element_assignees_role_check" CHECK ("calendar"."element_assignees"."role" in ('responsible', 'executor'))
);
--> statement-breakpoint
CREATE TABLE "calendar"."element_departments" (
	"element_id" uuid NOT NULL,
	"department_id" uuid NOT NULL,
	CONSTRAINT "element_departments_pkey" PRIMARY KEY("element_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "calendar"."element_guests" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"element_id" uuid NOT NULL,
	"crew_member_id" uuid,
	"full_name" text,
	"email" text,
	"position" integer NOT NULL,
	CONSTRAINT "element_guests_element_id_crew_member_id_key" UNIQUE("element_id","crew_member_id"),
	CONSTRAINT "element_guests_element_id_email_key" UNIQUE("element_id","email"),
	CONSTRAINT "element_guests_one_check" CHECK (("calendar"."element_guests"."crew_member_id" is not null and "calendar"."element_guests"."full_name" is null and "calendar"."element_guests"."email" is null) or ("calendar"."element_guests"."crew_member_id" is null and "calendar"."element_guests"."full_name" is not null and "calendar"."element_guests"."email" is not null)),
	CONSTRAINT "element_guests_full_name_check" CHECK ("calendar"."element_guests"."full_name" is null or char_length("calendar"."element_guests"."full_name") between 1 and 200),
	CONSTRAINT "element_guests_email_check" CHECK ("calendar"."element_guests"."email" is null or char_length("calendar"."element_guests"."email") between 3 and 200)
);
--> statement-breakpoint
ALTER TABLE "calendar"."element_assignees" ADD CONSTRAINT "element_assignees_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "calendar"."elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."element_assignees" ADD CONSTRAINT "element_assignees_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "core"."crew_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."element_departments" ADD CONSTRAINT "element_departments_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "calendar"."elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."element_departments" ADD CONSTRAINT "element_departments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "core"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."element_guests" ADD CONSTRAINT "element_guests_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "calendar"."elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."element_guests" ADD CONSTRAINT "element_guests_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "core"."crew_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "element_assignees_one_responsible" ON "calendar"."element_assignees" USING btree ("element_id") WHERE "calendar"."element_assignees"."role" = 'responsible';--> statement-breakpoint
CREATE INDEX "element_assignees_crew_member_id_idx" ON "calendar"."element_assignees" USING btree ("crew_member_id");--> statement-breakpoint
CREATE INDEX "element_departments_department_id_idx" ON "calendar"."element_departments" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "element_guests_crew_member_id_idx" ON "calendar"."element_guests" USING btree ("crew_member_id");
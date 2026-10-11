CREATE SCHEMA "calendar";
--> statement-breakpoint
CREATE TABLE "calendar"."elements" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"parent_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"template_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "elements_kind_check" CHECK ("calendar"."elements"."kind" in ('phase', 'subphase', 'process', 'event', 'task', 'meeting', 'reminder', 'hiring')),
	CONSTRAINT "elements_position_check" CHECK ("calendar"."elements"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "core"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "calendar"."elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "elements_project_id_idx" ON "calendar"."elements" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "elements_parent_id_idx" ON "calendar"."elements" USING btree ("parent_id");
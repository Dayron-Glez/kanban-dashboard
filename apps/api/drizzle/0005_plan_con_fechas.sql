-- Los árboles que ya existen son de prueba y no tienen dependencias: se vacían y
-- cada proyecto vuelve a generar el suyo desde la plantilla.
DELETE FROM "calendar"."elements";--> statement-breakpoint
CREATE TABLE "calendar"."element_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"predecessor_id" uuid NOT NULL,
	"successor_id" uuid NOT NULL,
	"predecessor_point" text DEFAULT 'end' NOT NULL,
	"successor_point" text DEFAULT 'start' NOT NULL,
	"lag_amount" numeric DEFAULT 0 NOT NULL,
	"lag_unit" text DEFAULT 'days' NOT NULL,
	CONSTRAINT "element_dependencies_link_key" UNIQUE("predecessor_id","successor_id","successor_point"),
	CONSTRAINT "element_dependencies_not_self_check" CHECK ("calendar"."element_dependencies"."predecessor_id" <> "calendar"."element_dependencies"."successor_id"),
	CONSTRAINT "element_dependencies_points_check" CHECK ("calendar"."element_dependencies"."predecessor_point" in ('start', 'end') and "calendar"."element_dependencies"."successor_point" in ('start', 'end')),
	CONSTRAINT "element_dependencies_lag_unit_check" CHECK ("calendar"."element_dependencies"."lag_unit" in ('days', 'weeks', 'months'))
);
--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "duration_amount" numeric;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "duration_unit" text;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "starts_on" date;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "ends_on" date;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "is_anchor" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar"."element_dependencies" ADD CONSTRAINT "element_dependencies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "core"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."element_dependencies" ADD CONSTRAINT "element_dependencies_predecessor_id_fkey" FOREIGN KEY ("predecessor_id") REFERENCES "calendar"."elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."element_dependencies" ADD CONSTRAINT "element_dependencies_successor_id_fkey" FOREIGN KEY ("successor_id") REFERENCES "calendar"."elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "element_dependencies_project_id_idx" ON "calendar"."element_dependencies" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "element_dependencies_successor_id_idx" ON "calendar"."element_dependencies" USING btree ("successor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "elements_one_anchor_per_project" ON "calendar"."elements" USING btree ("project_id") WHERE "calendar"."elements"."is_anchor";--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_parent_check" CHECK (("calendar"."elements"."parent_id" is null) = ("calendar"."elements"."kind" = 'phase'));--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_duration_check" CHECK (("calendar"."elements"."duration_amount" is null) = ("calendar"."elements"."duration_unit" is null) and "calendar"."elements"."duration_amount" > 0 and "calendar"."elements"."duration_unit" in ('days', 'weeks', 'months'));
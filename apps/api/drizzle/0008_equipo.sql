CREATE TABLE "core"."crew_members" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"department_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "core"."crew_members" ADD CONSTRAINT "crew_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "core"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."crew_members" ADD CONSTRAINT "crew_members_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "core"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crew_members_project_id_idx" ON "core"."crew_members" USING btree ("project_id");
CREATE TABLE "core"."alert_targets" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"alert_id" uuid NOT NULL,
	"department_id" uuid,
	"crew_member_id" uuid,
	CONSTRAINT "alert_targets_alert_id_department_id_key" UNIQUE("alert_id","department_id"),
	CONSTRAINT "alert_targets_alert_id_crew_member_id_key" UNIQUE("alert_id","crew_member_id"),
	CONSTRAINT "alert_targets_one_check" CHECK (("core"."alert_targets"."department_id" is null) <> ("core"."alert_targets"."crew_member_id" is null))
);
--> statement-breakpoint
CREATE TABLE "core"."alerts" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"cause" text NOT NULL,
	"certainty" text DEFAULT 'confirmed' NOT NULL,
	"scope" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"all_day" boolean DEFAULT true NOT NULL,
	"start_time" time,
	"end_time" time,
	"hours_mode" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alerts_title_check" CHECK (char_length("core"."alerts"."title") between 1 and 120),
	CONSTRAINT "alerts_cause_check" CHECK ("core"."alerts"."cause" in ('unavailability', 'illness', 'strike', 'weather', 'permits', 'supplier', 'other')),
	CONSTRAINT "alerts_certainty_check" CHECK ("core"."alerts"."certainty" in ('confirmed', 'possible')),
	CONSTRAINT "alerts_scope_check" CHECK ("core"."alerts"."scope" in ('project', 'targeted')),
	CONSTRAINT "alerts_hours_mode_check" CHECK ("core"."alerts"."hours_mode" in ('daily', 'continuous')),
	CONSTRAINT "alerts_dates_check" CHECK ("core"."alerts"."ends_on" is null or "core"."alerts"."ends_on" >= "core"."alerts"."starts_on"),
	CONSTRAINT "alerts_all_day_check" CHECK (not "core"."alerts"."all_day" or ("core"."alerts"."start_time" is null and "core"."alerts"."end_time" is null and "core"."alerts"."hours_mode" is null)),
	CONSTRAINT "alerts_start_time_check" CHECK ("core"."alerts"."all_day" or "core"."alerts"."start_time" is not null),
	CONSTRAINT "alerts_single_day_check" CHECK ("core"."alerts"."all_day" or "core"."alerts"."ends_on" is distinct from "core"."alerts"."starts_on" or ("core"."alerts"."hours_mode" is null and "core"."alerts"."end_time" is not null and "core"."alerts"."end_time" > "core"."alerts"."start_time")),
	CONSTRAINT "alerts_several_days_check" CHECK ("core"."alerts"."all_day" or "core"."alerts"."ends_on" is not distinct from "core"."alerts"."starts_on" or "core"."alerts"."hours_mode" is not null),
	CONSTRAINT "alerts_daily_check" CHECK ("core"."alerts"."hours_mode" is distinct from 'daily' or ("core"."alerts"."end_time" is not null and "core"."alerts"."end_time" > "core"."alerts"."start_time")),
	CONSTRAINT "alerts_continuous_check" CHECK ("core"."alerts"."hours_mode" is distinct from 'continuous' or ("core"."alerts"."end_time" is null) = ("core"."alerts"."ends_on" is null))
);
--> statement-breakpoint
ALTER TABLE "core"."alert_targets" ADD CONSTRAINT "alert_targets_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "core"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."alert_targets" ADD CONSTRAINT "alert_targets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "core"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."alert_targets" ADD CONSTRAINT "alert_targets_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "core"."crew_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."alerts" ADD CONSTRAINT "alerts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "core"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "core"."alerts" ADD CONSTRAINT "alerts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_project_id_starts_on_idx" ON "core"."alerts" USING btree ("project_id","starts_on");
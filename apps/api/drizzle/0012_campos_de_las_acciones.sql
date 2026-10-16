ALTER TABLE "calendar"."elements" ADD COLUMN "priority" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "all_day" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "start_time" time;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "end_time" time;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "hours_mode" text;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "completed_by" uuid;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "video_app" text;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_name_check" CHECK (char_length("calendar"."elements"."name") between 1 and 200);--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_priority_check" CHECK ("calendar"."elements"."priority" in ('high', 'normal', 'low'));--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_hours_mode_check" CHECK ("calendar"."elements"."hours_mode" in ('daily', 'continuous'));--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_all_day_check" CHECK (not "calendar"."elements"."all_day" or ("calendar"."elements"."start_time" is null and "calendar"."elements"."end_time" is null and "calendar"."elements"."hours_mode" is null));--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_start_time_check" CHECK ("calendar"."elements"."all_day" or "calendar"."elements"."start_time" is not null);--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_daily_check" CHECK ("calendar"."elements"."hours_mode" is distinct from 'daily' or ("calendar"."elements"."end_time" is not null and "calendar"."elements"."end_time" > "calendar"."elements"."start_time"));--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_hiring_all_day_check" CHECK ("calendar"."elements"."kind" <> 'hiring' or "calendar"."elements"."all_day");--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_location_check" CHECK ("calendar"."elements"."location" is null or char_length("calendar"."elements"."location") <= 200);--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_completed_check" CHECK ("calendar"."elements"."completed_at" is null or "calendar"."elements"."kind" = 'task');--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_video_app_check" CHECK ("calendar"."elements"."video_app" in ('meet', 'teams', 'zoom', 'webex', 'other'));--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_video_check" CHECK (("calendar"."elements"."video_app" is null and "calendar"."elements"."video_url" is null) or ("calendar"."elements"."kind" = 'meeting' and "calendar"."elements"."video_app" is not null));--> statement-breakpoint
ALTER TABLE "calendar"."elements" ADD CONSTRAINT "elements_video_url_check" CHECK ("calendar"."elements"."video_url" ~ '^https?://');
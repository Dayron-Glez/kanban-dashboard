CREATE TABLE "calendar"."alert_conflict_reviews" (
	"alert_id" uuid NOT NULL,
	"element_id" uuid NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "alert_conflict_reviews_pkey" PRIMARY KEY("alert_id","element_id")
);
--> statement-breakpoint
ALTER TABLE "calendar"."alert_conflict_reviews" ADD CONSTRAINT "alert_conflict_reviews_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "core"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."alert_conflict_reviews" ADD CONSTRAINT "alert_conflict_reviews_element_id_fkey" FOREIGN KEY ("element_id") REFERENCES "calendar"."elements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar"."alert_conflict_reviews" ADD CONSTRAINT "alert_conflict_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alert_conflict_reviews_element_id_idx" ON "calendar"."alert_conflict_reviews" USING btree ("element_id");
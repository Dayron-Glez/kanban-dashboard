UPDATE "identity"."users" AS "u" SET "image" = "p"."avatar_url" FROM "public"."profiles" AS "p" WHERE "p"."id" = "u"."id" AND "u"."image" IS NULL AND "p"."avatar_url" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "core"."project_members" DROP CONSTRAINT "project_members_user_id_fkey";
--> statement-breakpoint
ALTER TABLE "core"."project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP TABLE "public"."profiles";

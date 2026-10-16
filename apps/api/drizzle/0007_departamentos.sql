CREATE TABLE "core"."departments" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "departments_project_id_name_key" UNIQUE("project_id","name"),
	CONSTRAINT "departments_position_check" CHECK ("core"."departments"."position" >= 0)
);
--> statement-breakpoint
ALTER TABLE "core"."departments" ADD CONSTRAINT "departments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "core"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Los proyectos que ya existen reciben los mismos que uno nuevo (DEFAULT_DEPARTMENTS).
INSERT INTO "core"."departments" ("project_id", "name", "position")
SELECT "projects"."id", "defaults"."name", "defaults"."position"
FROM "core"."projects"
CROSS JOIN (VALUES
	('Producción', 0),
	('Dirección', 1),
	('Guion', 2),
	('Casting', 3),
	('Reparto', 4),
	('Fotografía y cámara', 5),
	('Eléctricos y maquinistas', 6),
	('Sonido', 7),
	('Arte', 8),
	('Vestuario', 9),
	('Maquillaje y peluquería', 10),
	('Efectos especiales', 11),
	('Efectos visuales (VFX)', 12),
	('Especialistas', 13),
	('Postproducción', 14),
	('Servicios y logística', 15),
	('Comunicación', 16)
) AS "defaults" ("name", "position");

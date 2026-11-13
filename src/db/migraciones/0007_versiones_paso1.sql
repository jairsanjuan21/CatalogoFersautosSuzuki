CREATE TYPE "public"."transmision" AS ENUM('mecanica', 'automatica');--> statement-breakpoint
CREATE TABLE "versiones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelo_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"transmision" "transmision",
	"visible" boolean DEFAULT true NOT NULL,
	"orden" smallint DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "versiones_unica" UNIQUE NULLS NOT DISTINCT("modelo_id","nombre","transmision")
);
--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "precio_base" bigint;--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "precio_base_actualizado" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "precios" ADD COLUMN "version_id" uuid;--> statement-breakpoint
ALTER TABLE "solicitudes" ADD COLUMN "version_id" uuid;--> statement-breakpoint
ALTER TABLE "versiones" ADD CONSTRAINT "versiones_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "versiones_modelo" ON "versiones" USING btree ("modelo_id","orden");--> statement-breakpoint
ALTER TABLE "precios" ADD CONSTRAINT "precios_version_id_versiones_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."versiones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_version_id_versiones_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."versiones"("id") ON DELETE set null ON UPDATE no action;
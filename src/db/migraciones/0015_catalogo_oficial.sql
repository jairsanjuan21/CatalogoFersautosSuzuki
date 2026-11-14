CREATE TYPE "public"."combustible" AS ENUM('gasolina', 'hibrido', 'electrico');--> statement-breakpoint
ALTER TYPE "public"."origen_precio" ADD VALUE 'excel';--> statement-breakpoint
CREATE TABLE "listas_precios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text,
	"fecha" date,
	"vigente_hasta" date,
	"archivo" text NOT NULL,
	"versiones" smallint NOT NULL,
	"usuario_id" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listas_precios_vigencia" CHECK ("listas_precios"."vigente_hasta" is null or "listas_precios"."fecha" is null or "listas_precios"."vigente_hasta" >= "listas_precios"."fecha")
);
--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "combustible" "combustible";--> statement-breakpoint
ALTER TABLE "precios" ADD COLUMN "nuevo_precio" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "versiones" ADD COLUMN "nombre_lista" text;--> statement-breakpoint
ALTER TABLE "versiones" ADD COLUMN "anio_modelo" smallint;--> statement-breakpoint
ALTER TABLE "listas_precios" ADD CONSTRAINT "listas_precios_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "versiones_nombre_lista" ON "versiones" USING btree ("nombre_lista");--> statement-breakpoint
ALTER TABLE "versiones" ADD CONSTRAINT "versiones_anio_modelo" CHECK ("versiones"."anio_modelo" is null or "versiones"."anio_modelo" between 2000 and 2100);
ALTER TABLE "versiones" ADD COLUMN "precio_base" bigint;--> statement-breakpoint
ALTER TABLE "versiones" ADD COLUMN "precio_base_actualizado" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "versiones" ADD CONSTRAINT "versiones_precio_base_positivo" CHECK ("versiones"."precio_base" is null or "versiones"."precio_base" > 0);
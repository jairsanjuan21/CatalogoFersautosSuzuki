ALTER TABLE "configuracion" ADD COLUMN "asesora_nombre_publico" text;--> statement-breakpoint
-- Natalia es conocida por sus clientes como "Natalia Sierra" (segundo apellido), no "Natalia Garcia"
UPDATE "configuracion" SET "asesora_nombre_publico" = 'Natalia Sierra'
WHERE "asesora_nombre_publico" IS NULL AND "asesora_nombre" ILIKE '%natalia%sierra%';

ALTER TABLE "precios" DROP CONSTRAINT "precios_modelo_id_modelos_id_fk";
--> statement-breakpoint
DROP INDEX "precios_modelo_reciente";--> statement-breakpoint
ALTER TABLE "precios" ALTER COLUMN "version_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "precios_version_reciente" ON "precios" USING btree ("version_id","vigente_desde" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "precios" DROP COLUMN "modelo_id";
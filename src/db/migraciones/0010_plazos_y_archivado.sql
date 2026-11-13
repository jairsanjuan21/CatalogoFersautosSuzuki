ALTER TABLE "solicitudes" DROP CONSTRAINT "solicitudes_plazo";--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "archivado" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_plazo" CHECK ("solicitudes"."plazo_meses" between 6 and 120);
CREATE TYPE "public"."forma_pago" AS ENUM('contado', 'credito');--> statement-breakpoint
CREATE TYPE "public"."metodo_comision" AS ENUM('proporcional', 'millones_completos');--> statement-breakpoint
CREATE TABLE "ventas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fecha" date NOT NULL,
	"modelo_id" uuid,
	"version_id" uuid,
	"vehiculo" text NOT NULL,
	"valor" bigint NOT NULL,
	"forma_pago" "forma_pago",
	"cliente" text,
	"nota" text,
	"usuario_id" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ventas_valor" CHECK ("ventas"."valor" between 1000000 and 2000000000)
);
--> statement-breakpoint
ALTER TABLE "configuracion" ADD COLUMN "comision_por_millon" integer DEFAULT 5000 NOT NULL;--> statement-breakpoint
ALTER TABLE "configuracion" ADD COLUMN "comision_metodo" "metodo_comision" DEFAULT 'proporcional' NOT NULL;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_version_id_versiones_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."versiones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ventas_fecha" ON "ventas" USING btree ("fecha");
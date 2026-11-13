CREATE TYPE "public"."seccion_galeria" AS ENUM('familia', 'clientes');--> statement-breakpoint
CREATE TABLE "fotos_galeria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seccion" "seccion_galeria" NOT NULL,
	"clave_archivo" text NOT NULL,
	"pie" text,
	"modelo_id" uuid,
	"visible" boolean DEFAULT true NOT NULL,
	"autorizada" boolean NOT NULL,
	"hay_menores" boolean DEFAULT false NOT NULL,
	"autorizacion_menores" boolean DEFAULT false NOT NULL,
	"autorizada_por" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "galeria_autorizada" CHECK ("fotos_galeria"."autorizada"),
	CONSTRAINT "galeria_menores" CHECK (not "fotos_galeria"."hay_menores" or "fotos_galeria"."autorizacion_menores")
);
--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "video_youtube" text;--> statement-breakpoint
ALTER TABLE "fotos_galeria" ADD CONSTRAINT "fotos_galeria_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "galeria_seccion" ON "fotos_galeria" USING btree ("seccion","creado_en" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_video" CHECK ("modelos"."video_youtube" is null or "modelos"."video_youtube" ~ '^[A-Za-z0-9_-]{11}$');
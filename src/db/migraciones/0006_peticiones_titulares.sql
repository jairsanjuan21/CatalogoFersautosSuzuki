CREATE TYPE "public"."estado_peticion" AS ENUM('pendiente', 'atendida', 'rechazada');--> statement-breakpoint
CREATE TYPE "public"."tipo_peticion" AS ENUM('consulta', 'correccion', 'eliminacion', 'revocatoria');--> statement-breakpoint
CREATE TABLE "peticiones_titulares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_peticion" NOT NULL,
	"estado" "estado_peticion" DEFAULT 'pendiente' NOT NULL,
	"nombre" text NOT NULL,
	"numero_identificacion" text NOT NULL,
	"canal" text NOT NULL,
	"detalle" text,
	"recibida_en" timestamp with time zone DEFAULT now() NOT NULL,
	"atendida_en" timestamp with time zone,
	"respuesta" text
);
--> statement-breakpoint
CREATE INDEX "peticiones_estado" ON "peticiones_titulares" USING btree ("estado","recibida_en");
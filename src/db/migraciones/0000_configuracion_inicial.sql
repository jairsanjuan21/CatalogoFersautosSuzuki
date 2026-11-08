CREATE TABLE "configuracion" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"asesora_nombre" text NOT NULL,
	"asesora_cc" text NOT NULL,
	"asesora_whatsapp" text,
	"ciudad" text DEFAULT 'Cúcuta' NOT NULL,
	"sede" text NOT NULL,
	"marca_por_defecto" text DEFAULT 'Suzuki' NOT NULL,
	"plan_financiacion" text DEFAULT 'Tradicional' NOT NULL,
	"plazos_meses" integer[] DEFAULT '{12,24,36,48,60,72,84}' NOT NULL,
	"dias_vigencia_precio" smallint DEFAULT 7 NOT NULL,
	"dias_retencion_documentos" smallint DEFAULT 90 NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configuracion_fila_unica" CHECK ("configuracion"."id" = 1)
);

CREATE TABLE "colores_modelo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelo_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"hex" text NOT NULL,
	"orden" smallint DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "colores_modelo_nombre" UNIQUE("modelo_id","nombre"),
	CONSTRAINT "colores_modelo_hex" CHECK ("colores_modelo"."hex" ~ '^#[0-9a-f]{6}$'),
	CONSTRAINT "colores_modelo_nombre_corto" CHECK (char_length("colores_modelo"."nombre") between 1 and 30)
);
--> statement-breakpoint
ALTER TABLE "colores_modelo" ADD CONSTRAINT "colores_modelo_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "colores_modelo_orden" ON "colores_modelo" USING btree ("modelo_id","orden");
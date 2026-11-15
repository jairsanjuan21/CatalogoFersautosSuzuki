ALTER TABLE "modelos" ADD COLUMN "baul" text;--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "seguridad" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "largo_mm" smallint;--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "ancho_mm" smallint;--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "alto_mm" smallint;--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "entre_ejes_mm" smallint;--> statement-breakpoint
ALTER TABLE "modelos" ADD COLUMN "altura_piso_mm" smallint;--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_baul_corto" CHECK (char_length("modelos"."baul") <= 80);--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_seguridad_max" CHECK (coalesce(array_length("modelos"."seguridad", 1), 0) <= 15);--> statement-breakpoint
ALTER TABLE "modelos" ADD CONSTRAINT "modelos_medidas" CHECK (("modelos"."largo_mm" is null or "modelos"."largo_mm" between 2000 and 7000) and ("modelos"."ancho_mm" is null or "modelos"."ancho_mm" between 1000 and 3000)
        and ("modelos"."alto_mm" is null or "modelos"."alto_mm" between 1000 and 3000) and ("modelos"."entre_ejes_mm" is null or "modelos"."entre_ejes_mm" between 1500 and 4500)
        and ("modelos"."altura_piso_mm" is null or "modelos"."altura_piso_mm" between 80 and 400));
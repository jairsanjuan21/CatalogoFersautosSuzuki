ALTER TABLE "configuracion" ADD COLUMN "telegram_chat_id" text;--> statement-breakpoint
ALTER TABLE "configuracion" ADD COLUMN "telegram_nombre" text;--> statement-breakpoint
ALTER TABLE "configuracion" ADD COLUMN "telegram_vinculado_en" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "configuracion" ADD COLUMN "telegram_codigo" text;--> statement-breakpoint
ALTER TABLE "configuracion" ADD COLUMN "telegram_codigo_expira" timestamp with time zone;
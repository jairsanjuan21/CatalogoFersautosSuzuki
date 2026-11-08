CREATE TYPE "public"."actividad_economica" AS ENUM('empleado', 'independiente', 'pensionado', 'rentista');--> statement-breakpoint
CREATE TYPE "public"."actor" AS ENUM('cliente', 'asesora', 'admin', 'sistema');--> statement-breakpoint
CREATE TYPE "public"."clase_inmueble" AS ENUM('apartamento', 'casa', 'local', 'finca');--> statement-breakpoint
CREATE TYPE "public"."estado_civil" AS ENUM('soltero', 'casado', 'union_libre', 'separado', 'divorciado', 'viudo');--> statement-breakpoint
CREATE TYPE "public"."estado_solicitud" AS ENUM('pendiente_valor', 'lista_para_cargar', 'en_estudio', 'aprobada', 'negada', 'entregada', 'desistio');--> statement-breakpoint
CREATE TYPE "public"."genero" AS ENUM('f', 'm');--> statement-breakpoint
CREATE TYPE "public"."origen_precio" AS ENUM('manual', 'pdf_ia');--> statement-breakpoint
CREATE TYPE "public"."origen_solicitud" AS ENUM('instagram', 'facebook', 'whatsapp', 'estados', 'catalogo', 'qr', 'directo');--> statement-breakpoint
CREATE TYPE "public"."tipo_archivo" AS ENUM('cedula_frente', 'cedula_reves', 'firma', 'pdf_formulario', 'pdf_cedula');--> statement-breakpoint
CREATE TYPE "public"."tipo_contrato" AS ENUM('fijo', 'indefinido', 'servicios');--> statement-breakpoint
CREATE TYPE "public"."tipo_identificacion" AS ENUM('cc', 'ce');--> statement-breakpoint
CREATE TYPE "public"."tipo_referencia" AS ENUM('familiar', 'personal', 'comercial');--> statement-breakpoint
CREATE TYPE "public"."tipo_vehiculo" AS ENUM('hatchback', 'sedan', 'suv', 'todoterreno', 'familiar');--> statement-breakpoint
CREATE TYPE "public"."tipo_vivienda" AS ENUM('familiar', 'propia', 'arrendada');--> statement-breakpoint
CREATE SEQUENCE "public"."radicado_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1000 CACHE 1;--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" "actor" NOT NULL,
	"usuario_id" text,
	"accion" text NOT NULL,
	"entidad" text,
	"entidad_id" text,
	"ip" "inet",
	"detalle" jsonb
);
--> statement-breakpoint
CREATE TABLE "clausulas" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clausulas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"version" smallint NOT NULL,
	"texto" text NOT NULL,
	"nota" text,
	"vigente_desde" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clausulas_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "conyuges" (
	"solicitud_id" uuid PRIMARY KEY NOT NULL,
	"primer_apellido" text NOT NULL,
	"segundo_apellido" text,
	"nombres" text NOT NULL,
	"tipo_identificacion" "tipo_identificacion" NOT NULL,
	"numero_identificacion" text NOT NULL,
	"fecha_nacimiento" date,
	"celular" text NOT NULL,
	"profesion" text,
	"actividad" "actividad_economica",
	"empresa" text,
	"ingreso_mensual" bigint
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitud_id" uuid NOT NULL,
	"tipo" "tipo_archivo" NOT NULL,
	"clave_archivo" text NOT NULL,
	"tipo_mime" text NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"eliminado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "envios_telegram" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"solicitud_id" uuid,
	"tipo" "tipo_archivo" NOT NULL,
	"chat_id" bigint NOT NULL,
	"mensaje_id" integer NOT NULL,
	"enviado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"borrar_despues_de" timestamp with time zone NOT NULL,
	"borrado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fotos_modelo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelo_id" uuid NOT NULL,
	"clave_archivo" text NOT NULL,
	"texto_alternativo" text,
	"orden" smallint DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "historial" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"solicitud_id" uuid NOT NULL,
	"actor" "actor" NOT NULL,
	"usuario_id" text,
	"descripcion" text NOT NULL,
	"datos" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inmuebles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitud_id" uuid NOT NULL,
	"clase" "clase_inmueble" NOT NULL,
	"direccion" text NOT NULL,
	"ciudad" text NOT NULL,
	"matricula" text,
	"valor" bigint NOT NULL,
	"saldo_hipoteca" bigint
);
--> statement-breakpoint
CREATE TABLE "modelos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"linea" text NOT NULL,
	"tipo" "tipo_vehiculo" NOT NULL,
	"puestos" smallint NOT NULL,
	"motor" text,
	"transmision" text,
	"descripcion" text,
	"visible" boolean DEFAULT false NOT NULL,
	"mostrar_precio" boolean DEFAULT true NOT NULL,
	"orden" smallint DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modelos_slug_unique" UNIQUE("slug"),
	CONSTRAINT "modelos_puestos" CHECK ("modelos"."puestos" between 1 and 9),
	CONSTRAINT "modelos_slug_formato" CHECK ("modelos"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "modelos_descripcion_corta" CHECK (char_length("modelos"."descripcion") <= 140)
);
--> statement-breakpoint
CREATE TABLE "notas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitud_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"usuario_id" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "precios" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"modelo_id" uuid NOT NULL,
	"precio_lista" bigint NOT NULL,
	"vigente_desde" timestamp with time zone DEFAULT now() NOT NULL,
	"origen" "origen_precio" DEFAULT 'manual' NOT NULL,
	"lote_id" uuid,
	"usuario_id" text,
	CONSTRAINT "precios_positivo" CHECK ("precios"."precio_lista" > 0)
);
--> statement-breakpoint
CREATE TABLE "promociones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelo_id" uuid NOT NULL,
	"descripcion" text NOT NULL,
	"valor_bono" bigint,
	"hasta" date NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promociones_bono_no_negativo" CHECK ("promociones"."valor_bono" is null or "promociones"."valor_bono" >= 0)
);
--> statement-breakpoint
CREATE TABLE "referencias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitud_id" uuid NOT NULL,
	"tipo" "tipo_referencia" NOT NULL,
	"nombre" text NOT NULL,
	"parentesco" text,
	"celular" text NOT NULL,
	CONSTRAINT "referencias_celular" CHECK ("referencias"."celular" ~ '^3[0-9]{9}$')
);
--> statement-breakpoint
CREATE TABLE "solicitudes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"radicado" text DEFAULT 'FS-' || to_char(now() at time zone 'America/Bogota', 'YYMMDD') || '-' || lpad(nextval('radicado_seq')::text, 4, '0') NOT NULL,
	"estado" "estado_solicitud" DEFAULT 'pendiente_valor' NOT NULL,
	"origen" "origen_solicitud" DEFAULT 'directo' NOT NULL,
	"vista_en" timestamp with time zone,
	"financiera" text,
	"linea_interes" text,
	"modelo_id" uuid,
	"valor_vehiculo" bigint,
	"cuota_inicial" bigint NOT NULL,
	"valor_a_financiar" bigint GENERATED ALWAYS AS (case when valor_vehiculo is null then null else valor_vehiculo - cuota_inicial end) STORED,
	"plazo_meses" smallint NOT NULL,
	"primer_apellido" text NOT NULL,
	"segundo_apellido" text,
	"nombres" text NOT NULL,
	"tipo_identificacion" "tipo_identificacion" NOT NULL,
	"numero_identificacion" text NOT NULL,
	"fecha_expedicion" date NOT NULL,
	"lugar_expedicion" text NOT NULL,
	"fecha_nacimiento" date NOT NULL,
	"lugar_nacimiento" text NOT NULL,
	"genero" "genero" NOT NULL,
	"estado_civil" "estado_civil" NOT NULL,
	"personas_a_cargo" smallint DEFAULT 0 NOT NULL,
	"profesion" text NOT NULL,
	"celular" text NOT NULL,
	"telefono_fijo" text,
	"correo" text NOT NULL,
	"direccion" text NOT NULL,
	"barrio" text NOT NULL,
	"ciudad" text NOT NULL,
	"estrato" smallint NOT NULL,
	"tipo_vivienda" "tipo_vivienda" NOT NULL,
	"tiempo_vivienda" text NOT NULL,
	"arrendador_nombre" text,
	"arrendador_telefono" text,
	"valor_arriendo" bigint,
	"actividad" "actividad_economica" NOT NULL,
	"empresa" text,
	"direccion_empresa" text,
	"telefono_empresa" text,
	"cargo" text,
	"antiguedad" text,
	"tipo_contrato" "tipo_contrato",
	"anterior_empresa" text,
	"anterior_cargo" text,
	"anterior_antiguedad" text,
	"anterior_telefono" text,
	"anterior_tipo_contrato" "tipo_contrato",
	"ingresos_mensuales" bigint NOT NULL,
	"egresos_mensuales" bigint NOT NULL,
	"declara_renta" boolean NOT NULL,
	"moneda_extranjera" boolean NOT NULL,
	"clausula_id" smallint NOT NULL,
	"acepta_autorizacion_en" timestamp with time zone NOT NULL,
	"acepta_datos_en" timestamp with time zone NOT NULL,
	"ip_firma" "inet",
	"agente_usuario" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"cerrada_en" timestamp with time zone,
	CONSTRAINT "solicitudes_radicado_unique" UNIQUE("radicado"),
	CONSTRAINT "solicitudes_cuota_positiva" CHECK ("solicitudes"."cuota_inicial" > 0),
	CONSTRAINT "solicitudes_cuota_menor_valor" CHECK ("solicitudes"."valor_vehiculo" is null or "solicitudes"."cuota_inicial" <= "solicitudes"."valor_vehiculo"),
	CONSTRAINT "solicitudes_plazo" CHECK ("solicitudes"."plazo_meses" in (12, 24, 36, 48, 60, 72, 84)),
	CONSTRAINT "solicitudes_estrato" CHECK ("solicitudes"."estrato" between 1 and 6),
	CONSTRAINT "solicitudes_celular" CHECK ("solicitudes"."celular" ~ '^3[0-9]{9}$'),
	CONSTRAINT "solicitudes_identificacion" CHECK ("solicitudes"."numero_identificacion" ~ '^[0-9]{5,11}$'),
	CONSTRAINT "solicitudes_ingresos" CHECK ("solicitudes"."ingresos_mensuales" > 0 and "solicitudes"."egresos_mensuales" >= 0),
	CONSTRAINT "solicitudes_valor_requerido" CHECK ("solicitudes"."estado" in ('pendiente_valor', 'desistio') or "solicitudes"."valor_vehiculo" is not null)
);
--> statement-breakpoint
CREATE TABLE "vehiculos_cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitud_id" uuid NOT NULL,
	"marca" text NOT NULL,
	"placa" text NOT NULL,
	"modelo_anio" smallint,
	"valor" bigint,
	"pignorado_a" text,
	"saldo_obligacion" bigint
);
--> statement-breakpoint
ALTER TABLE "conyuges" ADD CONSTRAINT "conyuges_solicitud_id_solicitudes_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_solicitud_id_solicitudes_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "envios_telegram" ADD CONSTRAINT "envios_telegram_solicitud_id_solicitudes_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos_modelo" ADD CONSTRAINT "fotos_modelo_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial" ADD CONSTRAINT "historial_solicitud_id_solicitudes_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inmuebles" ADD CONSTRAINT "inmuebles_solicitud_id_solicitudes_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_solicitud_id_solicitudes_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precios" ADD CONSTRAINT "precios_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promociones" ADD CONSTRAINT "promociones_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referencias" ADD CONSTRAINT "referencias_solicitud_id_solicitudes_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_modelo_id_modelos_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes" ADD CONSTRAINT "solicitudes_clausula_id_clausulas_id_fk" FOREIGN KEY ("clausula_id") REFERENCES "public"."clausulas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehiculos_cliente" ADD CONSTRAINT "vehiculos_cliente_solicitud_id_solicitudes_id_fk" FOREIGN KEY ("solicitud_id") REFERENCES "public"."solicitudes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_fecha" ON "auditoria" USING btree ("creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "auditoria_entidad" ON "auditoria" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documentos_uno_por_tipo" ON "documentos" USING btree ("solicitud_id","tipo");--> statement-breakpoint
CREATE INDEX "envios_telegram_pendientes" ON "envios_telegram" USING btree ("borrar_despues_de") WHERE "envios_telegram"."borrado_en" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "fotos_modelo_orden_unico" ON "fotos_modelo" USING btree ("modelo_id","orden");--> statement-breakpoint
CREATE INDEX "historial_solicitud_fecha" ON "historial" USING btree ("solicitud_id","creado_en");--> statement-breakpoint
CREATE INDEX "notas_solicitud_fecha" ON "notas" USING btree ("solicitud_id","creado_en");--> statement-breakpoint
CREATE INDEX "precios_modelo_reciente" ON "precios" USING btree ("modelo_id","vigente_desde" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "promociones_modelo_hasta" ON "promociones" USING btree ("modelo_id","hasta");--> statement-breakpoint
CREATE UNIQUE INDEX "referencias_una_por_tipo" ON "referencias" USING btree ("solicitud_id","tipo");--> statement-breakpoint
CREATE INDEX "solicitudes_estado_fecha" ON "solicitudes" USING btree ("estado","creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "solicitudes_identificacion" ON "solicitudes" USING btree ("numero_identificacion");--> statement-breakpoint
CREATE INDEX "solicitudes_creado" ON "solicitudes" USING btree ("creado_en" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "solicitudes_cerrada" ON "solicitudes" USING btree ("cerrada_en");
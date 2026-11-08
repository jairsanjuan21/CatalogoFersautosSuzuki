-- Migración escrita a mano: reglas que viven en la base de datos.

-- 1. AUDITORÍA DE SOLO INSERCIÓN
-- Ni la aplicación ni un error de código pueden editar o borrar el registro.
-- Única excepción: borrar registros con más de un año (política de retención).
CREATE OR REPLACE FUNCTION auditoria_proteger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'La auditoría no se puede modificar';
  END IF;
  IF TG_OP = 'DELETE' AND OLD.creado_en > now() - interval '1 year' THEN
    RAISE EXCEPTION 'Solo se pueden borrar registros de auditoría con más de un año';
  END IF;
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER auditoria_solo_insercion
  BEFORE UPDATE OR DELETE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION auditoria_proteger();
--> statement-breakpoint
-- TRUNCATE se salta los triggers de fila, así que se bloquea aparte.
CREATE OR REPLACE FUNCTION auditoria_bloquear_truncate() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La auditoría no se puede vaciar';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER auditoria_sin_truncate
  BEFORE TRUNCATE ON auditoria
  FOR EACH STATEMENT EXECUTE FUNCTION auditoria_bloquear_truncate();
--> statement-breakpoint

-- 2. PRECIO VIGENTE DE CADA MODELO
-- DISTINCT ON se queda con la primera fila de cada modelo según el ORDER BY,
-- es decir, la más reciente. "desactualizado" aplica la regla de los 7 días
-- leyendo el valor desde configuracion, para que el admin lo pueda cambiar.
CREATE VIEW precios_vigentes AS
SELECT DISTINCT ON (p.modelo_id)
  p.modelo_id,
  p.precio_lista,
  p.vigente_desde,
  p.origen,
  (p.vigente_desde < now() - make_interval(days => c.dias_vigencia_precio)) AS desactualizado
FROM precios p
CROSS JOIN configuracion c
ORDER BY p.modelo_id, p.vigente_desde DESC;

-- Paso 2 de la migración a versiones (escrita a mano: mueve datos).
-- Los precios que existían eran por modelo; aquí pasan a una versión "Estándar"
-- de cada modelo, y el precio base toma el último precio conocido.

-- 1. Una versión "Estándar" por cada modelo existente
INSERT INTO versiones (modelo_id, nombre, orden)
SELECT id, 'Estándar', 0 FROM modelos
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- 2. Cada precio existente pasa a la versión "Estándar" de su modelo
UPDATE precios p
SET version_id = v.id
FROM versiones v
WHERE v.modelo_id = p.modelo_id AND v.nombre = 'Estándar' AND v.transmision IS NULL AND p.version_id IS NULL;
--> statement-breakpoint

-- 3. El precio base de cada modelo arranca con su último precio conocido
UPDATE modelos m
SET precio_base = ultimo.precio_lista, precio_base_actualizado = ultimo.vigente_desde
FROM (
  SELECT DISTINCT ON (modelo_id) modelo_id, precio_lista, vigente_desde
  FROM precios ORDER BY modelo_id, vigente_desde DESC
) ultimo
WHERE ultimo.modelo_id = m.id AND m.precio_base IS NULL;
--> statement-breakpoint

-- 4. Las solicitudes que ya tenían modelo quedan con su versión "Estándar"
UPDATE solicitudes s
SET version_id = v.id
FROM versiones v
WHERE v.modelo_id = s.modelo_id AND v.nombre = 'Estándar' AND v.transmision IS NULL AND s.version_id IS NULL;
--> statement-breakpoint

-- 5. La vista de precios vigentes pasa a ser por versión.
--    Ya no lee precios.modelo_id (lo toma de versiones), así el paso 3 puede borrar esa columna.
DROP VIEW precios_vigentes;
--> statement-breakpoint
CREATE VIEW precios_vigentes AS
SELECT DISTINCT ON (p.version_id)
  p.version_id,
  v.modelo_id,
  p.precio_lista,
  p.vigente_desde,
  p.origen,
  (p.vigente_desde < now() - make_interval(days => c.dias_vigencia_precio)) AS desactualizado
FROM precios p
JOIN versiones v ON v.id = p.version_id
CROSS JOIN configuracion c
ORDER BY p.version_id, p.vigente_desde DESC;

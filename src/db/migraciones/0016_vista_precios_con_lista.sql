-- La vista de precios vigentes ahora sabe de qué lista de Excel vino cada precio.
-- Si vino de una lista con "vigente hasta", esa fecha manda: al día siguiente (hora de
-- Colombia) el precio queda desactualizado. Si se cargó a mano, sigue la regla de
-- los días de vigencia de la configuración.
DROP VIEW precios_vigentes;
--> statement-breakpoint
CREATE VIEW precios_vigentes AS
SELECT DISTINCT ON (p.version_id)
  p.version_id,
  v.modelo_id,
  p.precio_lista,
  p.vigente_desde,
  p.origen,
  p.nuevo_precio,
  l.vigente_hasta,
  CASE
    WHEN l.vigente_hasta IS NOT NULL THEN l.vigente_hasta < (now() AT TIME ZONE 'America/Bogota')::date
    ELSE p.vigente_desde < now() - make_interval(days => c.dias_vigencia_precio)
  END AS desactualizado
FROM precios p
JOIN versiones v ON v.id = p.version_id
LEFT JOIN listas_precios l ON l.id = p.lote_id
CROSS JOIN configuracion c
ORDER BY p.version_id, p.vigente_desde DESC, p.id DESC;

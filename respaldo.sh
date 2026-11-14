#!/usr/bin/env bash
# Respaldo diario del Catálogo Fersautos: base de datos + archivos (cédulas, firmas, fotos).
# Guarda en /opt/respaldos/fersautos y conserva los últimos 14 días.
set -euo pipefail
DESTINO=/opt/respaldos/fersautos
FECHA=$(date +%F_%H%M)
cd /opt/apps/fersautos
mkdir -p "$DESTINO"

# 1) Base de datos (formato custom de pg_dump: se restaura con pg_restore)
docker compose -f compose.prod.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "$DESTINO/db_$FECHA.dump"

# 2) Archivos del volumen "archivos"
docker run --rm -v fersautos_archivos:/datos:ro -v "$DESTINO":/respaldo alpine \
  tar czf "/respaldo/archivos_$FECHA.tar.gz" -C /datos .

# 3) Rotación
find "$DESTINO" -type f -mtime +14 -delete
echo "Respaldo OK: $FECHA"

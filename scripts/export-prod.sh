#!/usr/bin/env bash
# Regenera la carpeta hermana ../beta_en_prod a partir de ESTE proyecto
# (buscacursos-usach-alpha). No son dos bases de código separadas que hay
# que mantener sincronizadas a mano: src/ vive UNA sola vez, acá — este
# script simplemente copia esas mismas piezas a beta_en_prod y las
# construye ahí en modo producción (sin BC_DEMO_SEED), así que Mi Bitácora
# siempre nace vacía para cualquier alumno real. Ver README.md, sección
# "Mi Bitácora: dev vs prod".
#
# Uso, desde la raíz de buscacursos-usach-alpha:
#   ./scripts/export-prod.sh
#
# Ojo: esto SOBRESCRIBE src/, tests/, build.js, data/programs.json y
# demás en beta_en_prod con lo que haya acá. Cualquier cambio hecho a
# mano directamente en beta_en_prod se pierde en el próximo export — los
# cambios de verdad van siempre en buscacursos-usach-alpha (dev).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$HERE/../beta_en_prod"

mkdir -p "$DEST"
rm -rf "$DEST/src" "$DEST/tests"
cp -R "$HERE/src" "$DEST/src"
cp -R "$HERE/tests" "$DEST/tests"

mkdir -p "$DEST/data"
# Sólo el catálogo real — deliberadamente NO se copia
# data/bitacora-seed-demo.json, para que sea imposible construir beta_en_prod
# con datos de ejemplo por error.
cp "$HERE/data/programs.json" "$DEST/data/programs.json"

cp "$HERE/build.js" "$DEST/build.js"
[ -f "$HERE/CNAME" ] && cp "$HERE/CNAME" "$DEST/CNAME"
[ -f "$HERE/og-image.png" ] && cp "$HERE/og-image.png" "$DEST/og-image.png"
[ -f "$HERE/.gitignore" ] && cp "$HERE/.gitignore" "$DEST/.gitignore"

( cd "$DEST" && node build.js )

echo ""
echo "✓ beta_en_prod actualizado desde buscacursos-usach-alpha"
echo "  Mi Bitácora: vacía (build de producción, sin BC_DEMO_SEED)"

# BuscaCursos USACH — prod (beta_en_prod)

Esta carpeta es la que de verdad se sube a GitHub Pages. **No se edita a
mano** — es una copia generada automáticamente desde
`buscacursos-usach-alpha` (la carpeta de trabajo/dev), regenerada con:

```
cd ../buscacursos-usach-alpha
./scripts/export-prod.sh
```

Ese script copia `src/`, `tests/`, `build.js`, `data/programs.json`,
`CNAME` y `og-image.png` desde `buscacursos-usach-alpha` hacia acá, y
corre `node build.js` en esta carpeta — sin `BC_DEMO_SEED`, así que
`index.html` queda con **Mi Bitácora vacía**: cada alumno real parte de
cero y su bitácora se crea sola, sin datos de ejemplo, la primera vez que
agrega un ramo a su horario.

Cualquier cambio de diseño, lógica o catálogo va en
`buscacursos-usach-alpha` (dev) y se trae para acá con
`export-prod.sh` — un cambio hecho directamente en esta carpeta se pierde
en el próximo export.

## Publicar

Igual que siempre: subir `index.html` (junto con `CNAME` y
`og-image.png`) a la rama que sirve GitHub Pages. Antes de subir, conviene
correr `node tests/run-all.mjs` acá mismo para confirmar que el build de
producción pasa toda la suite de regresión.

## Estructura

Ver el README.md de `buscacursos-usach-alpha` para el detalle completo de
`src/*`, el modelo de datos de Mi Bitácora, y por qué el proyecto está
organizado así. Esta carpeta trae exactamente el mismo `src/` — sólo
cambia qué `data/*.json` de semilla se usa al construir.

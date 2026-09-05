# Tests

Suite de regresión con Playwright, contra el `index.html` generado por
`node build.js` en la raíz del proyecto (nunca contra ningún otro
archivo). Reemplaza los scripts sueltos `verify_*.mjs` que se venían
reinventando ronda a ronda en las sesiones de trabajo — ahora quedan
versionados acá y se corren todos juntos con un solo comando.

## Uso

```
node build.js          # genera/actualiza index.html
node tests/run-all.mjs # corre los 9 tests en orden, reporta un resumen
```

Sale con código 1 (y falla en CI, si algún día hay CI) si algún test
falla.

## Requisitos

Estos tests necesitan el paquete `playwright` instalado y accesible por
resolución de módulos ES (`import { chromium } from 'playwright'`) desde
`tests/lib/harness.mjs` — Node no usa `NODE_PATH` para resolver imports
ESM, así que tiene que existir un `node_modules/playwright` real o
enlazado desde la raíz del proyecto (o de `tests/`) hacia arriba. En una
sesión de Claude con Playwright pre-instalado, alcanza con:

```
mkdir -p node_modules
ln -s <ruta al paquete playwright instalado> node_modules/playwright
```

En una máquina normal, `npm install playwright && npx playwright
install chromium` alcanza (sin symlinks).

Por defecto los tests lanzan Chromium sin indicar una ruta de binario
específica (dejan que Playwright use el que tenga instalado). Si hace
falta apuntar a un Chromium en una ruta fija (como en el sandbox donde se
escribió este proyecto), se puede setear `PLAYWRIGHT_CHROMIUM_PATH`:

```
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium node tests/run-all.mjs
```

## Qué cubre cada test

- `01-meta-y-carga.mjs` — meta tags/topbar con datos reales (no
  placeholders sin reemplazar), cero errores de consola al cargar.
- `02-simulacion.mjs` — arrancar la Simulación sin buscar antes muestra
  los ramos del nivel, no la guía de bienvenida.
- `03-limpiar-todo.mjs` — el botón "Limpiar todo" aparece/desaparece
  según haya o no algún filtro activo (búsqueda, nivel, área,
  electivos, horario libre).
- `04-buscar-muestra-todos.mjs` — "Buscar" sin nada escrito muestra
  todos los ramos, y "Limpiar todo" vive junto a "Buscar" en el DOM.
- `05-nombres-de-area.mjs` — el filtro de área muestra nombres
  amigables, sin duplicados por grafía (FIN/FINANZAS,
  ECONOMIA/ECONOMÍA).
- `06-firma-sin-franja.mjs` — no hay franja blanca entre los engranajes
  y la firma "Francisco · chazeware" en el pie de página.
- `07-estado-firmas.mjs` — el texto/color exacto de las 3 firmas
  "chelpaHaze" coincide con lo acordado (ver el doc del proyecto).
- `08-horario-grande-responsive.mjs` — el panel grande de "Mi horario"
  alterna solo entre nombres completos (≥1180px) y vista compacta
  (<1180px).
- `09-bitacora.mjs` — agregar un ramo a "Mi horario" crea su bitácora
  vacía sola; el formulario del overlay guarda una entrada nueva; quitar
  el ramo y volver a agregarlo no duplica la bitácora ni pierde lo ya
  escrito (incluido el estado "resuelta" de una duda).

Cada test es autocontenido: abre su propia página, hace sus propias
aserciones (con `assert`/`assertEqual` de `tests/lib/harness.mjs`), y
tira una excepción con un mensaje claro si algo no calza — no hay que
leer screenshots ni interpretar JSON a mano para saber si algo se rompió.

## Agregar un test nuevo

Un archivo `tests/NN-nombre-descriptivo.mjs` que:
1. importe `openPage`/`assert` de `./lib/harness.mjs`,
2. abra la página con `await openPage(...)`,
3. haga sus aserciones,
4. termine con `await close()` y opcionalmente un `console.log` de una
   línea resumiendo qué se verificó.

`run-all.mjs` los recoge automáticamente (por el patrón `NN-*.mjs`) y
los corre en orden numérico — no hace falta registrarlo en ningún lado.

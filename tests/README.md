# Tests

Suite de regresión con Playwright, contra el `index.html` generado por
`node build.js` en la raíz del proyecto (nunca contra ningún otro
archivo). Reemplaza los scripts sueltos `verify_*.mjs` que se venían
reinventando ronda a ronda en las sesiones de trabajo — ahora quedan
versionados acá y se corren todos juntos con un solo comando.

## Uso

```
node build.js          # genera/actualiza index.html
node tests/run-all.mjs # corre los 18 tests en orden, reporta un resumen
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
- `10-fuentes-grafiti.mjs` — el `@import` de Google Fonts para "Rubik Wet
  Paint"/"Rubik Burned" (las fuentes del grafiti "CHELPA HAZE") está
  registrado como regla válida en el CSSOM — protege contra que alguien
  vuelva a mover ese `@import` a mitad de `styles.css` (ahí es inválido
  por spec de CSS y el navegador lo descarta sin ningún error visible).
- `11-stats-chicos-celular.mjs` — en un viewport de celular real (390px),
  los números de secciones/créditos/choques del panel "grande" de Mi
  Horario (el que queda siempre visible sobre el footer) se ven chicos,
  no con el tamaño de escritorio.
- `12-juego-chinitas.mjs` — dentro del cuadro "chelpa.sh" (el de la matriz
  verde) de la firma principal, aparecen bichos solos con el tiempo;
  aplastar uno cambia el puntaje (+1 si es oruga/hormiga, -3 si es la
  chinita roja); el badge usa el ícono ☠️ ("contador de insecticida"). El
  test sólo confirma que el puntaje cambia al aplastar un bicho, sin
  importar cuál le tocó (es aleatorio).
- `13-pipeline-malla.mjs` — al fondo de la Malla curricular, debajo de la
  firma nano ("malla_grid.html · grafo"), hay una barra tipo pipeline
  (build → lint → test → deploy) que avanza sola en loop sin que el
  usuario haga nada. Ahora es un acordeón: el test confirma que arranca
  colapsada, que el botón "ver pipeline de producción" la despliega, y
  luego que las 4 etapas existen y que el loop llega solo hasta "deploy"
  en verde.
- `14-amigable-acordeones.mjs` — en modo amigable (🎀), "Filtrar por
  horario libre" y "Mi horario" arrancan colapsados (no expandidos);
  apretar la pestaña "Horario semanal" despliega "Mi horario" y la
  flecha lo vuelve a colapsar. (La guía ya no se prueba acá — desde que
  pasó a ser un botón "?" único e igual en todos los temas, ver
  `17-guia-unica.mjs`.)
- `15-juego-nube-nimbus.mjs` — dentro de la firma ámbar de la Malla
  (`#chelpaHazeFooterMallaOriginal`, terminal "usachin.sh"), existe un
  segundo mini-juego distinto del de las chinitas: un canvas
  (`#chzNimbusCanvas`) con una nube+rayo y "usachin" (mascota león)
  montado arriba (la nube sólo se ve mientras usachin está "volando",
  ascendiendo), sobre un fondo de lluvia de código verde estilo Matrix,
  con una pantalla de inicio ("toca para empezar") antes de que arranque
  la física. El test confirma que el canvas existe con un ancho real de
  pixeles (protege contra el bug real de "canvas estirado a 1px" que
  reportó el usuario al refrescar la página con la firma ya abierta), que
  el puntaje arranca en "📚 0", que el fondo de Matrix anima solo incluso
  en la pantalla de inicio (compara dos capturas del canvas en una
  ventana corta, antes de tocar nada), y que tocar para empezar no rompe
  nada ni hace desaparecer el canvas.
- `16-cogollo-humo-refresh.mjs` — reproduce el bug real reportado por el
  usuario ("el cogollo sigue sin aparecer con el humo al reiniciar la
  página con eso abierto"): abre la Malla, despliega la firma nano y la
  ámbar (dejándolas "recordadas como abiertas" en `localStorage`),
  refresca la página de verdad, vuelve a abrir la Malla, y confirma que
  los 3 canvas que viven adentro (el humo del cogollo, el humo de la
  firma ámbar, y el canvas del juego nimbus) miden un ancho real de
  pixeles en vez de quedar estirados a 1px — protege el fix de
  `openMalla()` que dispara un `resize` global al abrir la Malla.
- `17-guia-unica.mjs` — la guía "Cómo usar este buscador" ya no aparece
  en sus 3 lugares de antes (`#bottom-guide-wrap`, `#guide-slot-topbar`,
  `#guide-panel`) — ninguno de los 3 existe en el DOM. En su lugar hay
  exactamente un botón "?" (`#help-fab`), visible tanto en celular como
  en modo amigable sin reubicarse, que al apretarlo despliega
  `#guide-overlay` con los 5 pasos de siempre y una ilustración, y que se
  cierra con su propio botón.
- `18-scroll-lock-overlays.mjs` — reproduce el bug real reportado por el
  usuario ("se puede hacer scroll" detrás de Mi Bitácora): scrollea la
  página, abre la Malla/Bitácora/Guía una por una y confirma que el
  `<body>` queda fijado exactamente en ese punto de scroll (con el
  `top` negativo del patrón estándar de candado de scroll) mientras el
  overlay está abierto, que ya no queda nada scrolleable en el
  documento, y que al cerrar el overlay se libera y el scroll vuelve
  exacto a donde estaba antes de abrir.

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
